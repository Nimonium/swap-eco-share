import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface PushPayload {
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
        `[Push Auth Warning] Unauthorized request: hasEnv=${Boolean(internalSecret)}, hasHeader=${Boolean(providedSecret)}`
      );
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or missing webhook secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: PushPayload = await req.json();
    const { type, recipient_user_id, actor_id, data } = payload;

    if (!type || !recipient_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type and recipient_user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Self-action suppression: Never notify a user about their own actions
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

    // 5. Check recipient push notification preferences in profiles
    const { data: recipientProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("full_name, push_notifications_enabled")
      .eq("id", recipient_user_id)
      .single();

    if (recipientProfile && recipientProfile.push_notifications_enabled === false) {
      console.log(`[Preferences] User ${recipient_user_id} has disabled push notifications. Skipping.`);
      return new Response(
        JSON.stringify({ status: "skipped", reason: "User has disabled push notifications" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Check bidirectional block check
    if (actor_id) {
      const { data: blocks } = await supabaseAdmin
        .from("blocks")
        .select("id")
        .or(
          `and(blocker_id.eq.${actor_id},blocked_id.eq.${recipient_user_id}),and(blocker_id.eq.${recipient_user_id},blocked_id.eq.${actor_id})`
        )
        .limit(1);

      if (blocks && blocks.length > 0) {
        console.log(`[Block Check] Block exists between ${actor_id} and ${recipient_user_id}. Skipping push.`);
        return new Response(
          JSON.stringify({ status: "skipped", reason: "Active block between participants" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 7. Rate-limiting for new_message (no more than 1 push per 15 minutes per swap thread)
    if (type === "new_message" && data?.swap_id) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: recentLogs } = await supabaseAdmin
        .from("notification_logs")
        .select("id")
        .eq("recipient_id", recipient_user_id)
        .eq("swap_id", data.swap_id)
        .eq("notification_type", "new_message_push")
        .gte("created_at", fifteenMinutesAgo)
        .limit(1);

      if (recentLogs && recentLogs.length > 0) {
        console.log(`[Rate Limit] Skipping new_message push for ${recipient_user_id} on swap ${data.swap_id} (already notified recently)`);
        return new Response(
          JSON.stringify({ status: "skipped", reason: "Rate limited: push notification sent in last 15 minutes" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 8. Lookup active push subscriptions for recipient
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", recipient_user_id);

    if (subError) {
      console.error("[Push Error] Failed to fetch subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve push subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[Push Info] No active push subscriptions found for user ${recipient_user_id}. Skipping.`);
      return new Response(
        JSON.stringify({ status: "skipped", reason: "No active push subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Configure VAPID Keys
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@ecoswapsquare.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("[VAPID Warning] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set. Push simulated.");
      return new Response(
        JSON.stringify({
          status: "simulated",
          message: "VAPID keys not configured in Edge Function secrets. Set via 'supabase secrets set VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=...'",
          recipientCount: subscriptions.length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // 10. Construct Push Notification Payload
    const rawActorName = data?.actor_name || "A community member";
    const rawItemTitle = data?.item_title || "an item";
    const rawPreview = data?.message_preview || "Sent you a message";

    let title = "🌱 EcoSwapSquare";
    let body = "You have a new update on EcoSwapSquare.";
    let url = "/swap";

    switch (type) {
      case "new_swap_proposal":
        title = "🌱 New Swap Proposal!";
        body = `${rawActorName} proposed a swap for "${rawItemTitle}".`;
        url = "/swap";
        break;

      case "swap_accepted":
        title = "🎉 Swap Proposal Accepted!";
        body = `Great news! ${rawActorName} accepted your swap for "${rawItemTitle}".`;
        url = "/swap";
        break;

      case "swap_declined":
        title = "Swap Proposal Update";
        body = `${rawActorName} was unable to accept your swap for "${rawItemTitle}".`;
        url = "/browse";
        break;

      case "new_message":
        title = `💬 Message from ${rawActorName}`;
        body = rawPreview;
        url = "/swap";
        break;

      case "new_review":
        title = "⭐ New Review Received";
        body = `${rawActorName} left you a review.`;
        url = "/profile";
        break;
    }

    const pushPayload = JSON.stringify({
      title,
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { url },
    });

    // 11. Send push to all registered devices of the recipient
    let deliveredCount = 0;
    const expiredSubIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload
          );
          deliveredCount++;
        } catch (pushErr: any) {
          console.error(`[Push Send Error] Endpoint ${sub.endpoint.slice(0, 30)}...:`, pushErr.statusCode || pushErr.message);
          // If subscription is expired, unregistered, or rejected due to key mismatch (HTTP 400, 401, 403, 404, 410)
          if (
            pushErr.statusCode === 410 ||
            pushErr.statusCode === 404 ||
            pushErr.statusCode === 401 ||
            pushErr.statusCode === 403 ||
            pushErr.statusCode === 400
          ) {
            expiredSubIds.push(sub.id);
          }
        }
      })
    );

    // 12. Cleanup expired subscriptions if any were detected
    if (expiredSubIds.length > 0) {
      console.log(`[Push Cleanup] Deleting ${expiredSubIds.length} expired subscription(s)`);
      await supabaseAdmin.from("push_subscriptions").delete().in("id", expiredSubIds);
    }

    // 13. Record notification log for rate-limiting
    if (deliveredCount > 0) {
      await supabaseAdmin.from("notification_logs").insert({
        recipient_id: recipient_user_id,
        actor_id: actor_id || null,
        swap_id: data?.swap_id || null,
        notification_type: type === "new_message" ? "new_message_push" : `${type}_push`,
      });
    }

    console.log(`[Push Success] Sent to ${deliveredCount}/${subscriptions.length} devices for user ${recipient_user_id} (${type})`);

    return new Response(
      JSON.stringify({
        status: "sent",
        delivered: deliveredCount,
        total: subscriptions.length,
        cleaned_up: expiredSubIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Push Handler Exception]:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
