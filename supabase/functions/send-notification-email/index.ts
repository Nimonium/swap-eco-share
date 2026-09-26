import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface NotificationPayload {
  type: "new_swap_proposal" | "swap_accepted" | "swap_declined" | "new_message" | "new_review";
  recipient_user_id: string;
  actor_id?: string;
  data: {
    swap_id?: string;
    item_title?: string;
    actor_name?: string;
    message_preview?: string;
    rating?: number;
    comment?: string;
  };
}

// HTML Escaping Helper to prevent HTML & Link Injection in emails
function escapeHtml(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Authentication: Verify Shared Webhook Secret
    const internalSecret = Deno.env.get("INTERNAL_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");

    if (!internalSecret || providedSecret !== internalSecret) {
      console.warn(
        `[Auth Warning] Unauthorized request: ` +
        `hasEnvSecret=${Boolean(internalSecret)} (len=${internalSecret?.length ?? 0}), ` +
        `hasHeaderSecret=${Boolean(providedSecret)} (len=${providedSecret?.length ?? 0})`
      );
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Invalid or missing webhook secret",
          diagnostic: {
            env_secret_present: Boolean(internalSecret),
            env_secret_len: internalSecret?.length ?? 0,
            header_secret_present: Boolean(providedSecret),
            header_secret_len: providedSecret?.length ?? 0,
          },
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: NotificationPayload = await req.json();
    const { type, recipient_user_id, actor_id, data } = payload;

    if (!type || !recipient_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type and recipient_user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Prevent emailing user for their own actions
    if (actor_id && actor_id === recipient_user_id) {
      return new Response(
        JSON.stringify({ status: "skipped", reason: "Cannot send notification to actor for own action" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 5. Check recipient notification preferences in profiles
    const { data: recipientProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email_notifications_enabled")
      .eq("id", recipient_user_id)
      .single();

    if (recipientProfile && recipientProfile.email_notifications_enabled === false) {
      console.log(`[Preferences] User ${recipient_user_id} has disabled email notifications. Skipping.`);
      return new Response(
        JSON.stringify({ status: "skipped", reason: "User has disabled email notifications" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Check blocks table (bidirectional block check)
    if (actor_id) {
      const { data: blocks, error: blockErr } = await supabaseAdmin
        .from("blocks")
        .select("id")
        .or(
          `and(blocker_id.eq.${actor_id},blocked_id.eq.${recipient_user_id}),and(blocker_id.eq.${recipient_user_id},blocked_id.eq.${actor_id})`
        )
        .limit(1);

      if (blocks && blocks.length > 0) {
        console.log(`[Block Check] Block exists between ${actor_id} and ${recipient_user_id}. Skipping email.`);
        return new Response(
          JSON.stringify({ status: "skipped", reason: "Active block between participants" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 7. Rate-limiting for new_message (no more than 1 email per 15 minutes per swap thread)
    if (type === "new_message" && data?.swap_id) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: recentLogs, error: logErr } = await supabaseAdmin
        .from("notification_logs")
        .select("id")
        .eq("recipient_id", recipient_user_id)
        .eq("swap_id", data.swap_id)
        .eq("notification_type", "new_message")
        .gte("created_at", fifteenMinutesAgo)
        .limit(1);

      if (recentLogs && recentLogs.length > 0) {
        console.log(`[Rate Limit] Skipping new_message email for ${recipient_user_id} on swap ${data.swap_id} (already notified recently)`);
        return new Response(
          JSON.stringify({ status: "skipped", reason: "Rate limited: message notification sent in last 15 minutes" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 8. Lookup recipient email securely from auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(recipient_user_id);
    const recipientEmail = userData?.user?.email;

    if (!recipientEmail) {
      console.error(`[User Lookup] No email found for user ID: ${recipient_user_id}`);
      return new Response(
        JSON.stringify({ error: "Recipient user email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Generate and HTML-Escape Content based on notification type
    const siteUrl = Deno.env.get("SITE_URL") || "https://swap-eco-share.vercel.app";

    // Escape all user-controlled values to prevent HTML injection
    const rawRecipientName = recipientProfile?.full_name || "Eco Swapper";
    const rawActorName = data?.actor_name || "Another community member";
    const rawItemTitle = data?.item_title || "your item";

    const safeRecipientName = escapeHtml(rawRecipientName);
    const safeActorName = escapeHtml(rawActorName);
    const safeItemTitle = escapeHtml(rawItemTitle);
    const safeMessagePreview = escapeHtml(data?.message_preview);
    const safeComment = escapeHtml(data?.comment);

    let subject = "EcoSwapSquare Notification";
    let heading = "Update on EcoSwapSquare";
    let bodyText = "";
    let ctaText = "View on EcoSwapSquare";
    let ctaUrl = `${siteUrl}/swap`;
    let quoteBox: string | null = null;

    switch (type) {
      case "new_swap_proposal":
        subject = `New Swap Proposal for "${rawItemTitle}" on EcoSwapSquare`;
        heading = "You Have a New Swap Proposal!";
        bodyText = `<strong>${safeActorName}</strong> has proposed a swap for your listed item <strong>"${safeItemTitle}"</strong>. Review the offered trade and accept or decline.`;
        ctaText = "Review Swap Proposal";
        ctaUrl = `${siteUrl}/swap`;
        if (safeMessagePreview) {
          quoteBox = `"${safeMessagePreview}"`;
        }
        break;

      case "swap_accepted":
        subject = `Swap Accepted! 🎉 Time to coordinate your exchange`;
        heading = "Your Swap Proposal Was Accepted!";
        bodyText = `Great news! <strong>${safeActorName}</strong> accepted your swap proposal for <strong>"${safeItemTitle}"</strong>. You can now use in-app chat to coordinate handover or delivery.`;
        ctaText = "Open Swap Chat";
        ctaUrl = `${siteUrl}/swap`;
        break;

      case "swap_declined":
        subject = `Update on your swap proposal for "${rawItemTitle}"`;
        heading = "Swap Proposal Update";
        bodyText = `<strong>${safeActorName}</strong> was unable to accept your swap proposal for <strong>"${safeItemTitle}"</strong> at this time. Browse other community listings to find your next great trade!`;
        ctaText = "Browse Items";
        ctaUrl = `${siteUrl}/browse`;
        break;

      case "new_message":
        subject = `New message from ${rawActorName} on EcoSwapSquare`;
        heading = "New Message Received";
        bodyText = `<strong>${safeActorName}</strong> sent you a message regarding your swap:`;
        ctaText = "Reply in Chat";
        ctaUrl = `${siteUrl}/swap`;
        if (safeMessagePreview) {
          quoteBox = `"${safeMessagePreview}"`;
        }
        break;

      case "new_review":
        const rawRating = Math.min(Math.max(Number(data.rating) || 5, 1), 5);
        const stars = "★".repeat(rawRating);
        subject = `You received a ${rawRating}★ review on EcoSwapSquare!`;
        heading = "New Community Review";
        bodyText = `<strong>${safeActorName}</strong> left you a <strong>${stars} (${rawRating}/5)</strong> review for your completed swap!`;
        ctaText = "View Your Profile";
        ctaUrl = `${siteUrl}/profile`;
        if (safeComment) {
          quoteBox = `"${safeComment}"`;
        }
        break;
    }

    // HTML Email Template
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7f5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px 32px; text-align: left;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                🌱 EcoSwapSquare
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #d1fae5;">
                Sustainable Item Exchange Community
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.3px;">
                ${heading}
              </h2>
              
              <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                Hi ${safeRecipientName},
              </p>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                ${bodyText}
              </p>

              ${
                quoteBox
                  ? `<div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-style: italic; color: #4b5563; font-size: 14px; line-height: 1.5; word-break: break-word;">
                      ${quoteBox}
                    </div>`
                  : ""
              }

              <!-- Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #059669;">
                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 13px 26px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px; background-color: #059669; letter-spacing: 0.2px;">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                Or copy and paste this link in your browser:<br>
                <a href="${ctaUrl}" style="color: #059669; word-break: break-all; text-decoration: underline;">${ctaUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                You are receiving this notification because email notifications are enabled for your account.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                <a href="${siteUrl}/profile" style="color: #059669; text-decoration: underline;">Manage notification preferences</a> in your Profile Settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 10. Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "EcoSwapSquare <onboarding@resend.dev>";

    if (!resendApiKey) {
      console.warn("[Resend Warning] RESEND_API_KEY secret is not set. Email dispatch simulated.");
      return new Response(
        JSON.stringify({
          status: "simulated",
          message: "RESEND_API_KEY is not set. Set it via 'supabase secrets set RESEND_API_KEY=re_...'",
          details: { to: recipientEmail, subject },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[Resend Error]:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email via Resend", details: resendData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 11. Record notification log for rate-limiting and audit history
    await supabaseAdmin.from("notification_logs").insert({
      recipient_id: recipient_user_id,
      actor_id: actor_id || null,
      swap_id: data?.swap_id || null,
      notification_type: type,
    });

    console.log(`[Success] Email sent to ${recipientEmail} for event ${type} (ID: ${resendData.id})`);

    return new Response(
      JSON.stringify({ status: "sent", id: resendData.id, to: recipientEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Edge Function Unhandled Exception]:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
