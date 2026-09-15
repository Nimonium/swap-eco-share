import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

if (!isSupabaseConfigured) {
  const missingMsg =
    `[EcoSwapSquare] Missing Supabase Environment Variables!\n` +
    `Expected: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment.\n` +
    `Currently received: VITE_SUPABASE_URL=${SUPABASE_URL ? 'configured' : 'MISSING'}, ` +
    `VITE_SUPABASE_ANON_KEY=${SUPABASE_PUBLISHABLE_KEY ? 'configured' : 'MISSING'}.`;

  console.error(missingMsg);

  // If running in browser and root element is empty, display a clear, visible configuration card
  if (typeof window !== 'undefined') {
    const renderMissingEnvUI = () => {
      const root = document.getElementById('root');
      if (root && !root.hasChildNodes()) {
        root.innerHTML = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; background: #0f172a; color: #f8fafc; text-align: center; box-sizing: border-box;">
            <div style="max-width: 620px; width: 100%; background: #1e293b; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); text-align: left; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;">⚠️</div>
                <div>
                  <h1 style="font-size: 20px; font-weight: 700; margin: 0; color: #f87171;">Configuration Error: Missing Environment Variables</h1>
                  <p style="font-size: 13px; color: #94a3b8; margin: 4px 0 0 0;">The application could not connect to Supabase.</p>
                </div>
              </div>
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
                Vite bakes environment variables into the static bundle during <code>npm run build</code>. Because <code>VITE_SUPABASE_URL</code> or <code>VITE_SUPABASE_ANON_KEY</code> was not defined in Vercel during the build, the client cannot communicate with the database.
              </p>
              <div style="background: #0f172a; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; margin-bottom: 24px; border: 1px solid #334155;">
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1e293b;">
                  <span style="color: #94a3b8;">VITE_SUPABASE_URL:</span>
                  <span style="color: ${SUPABASE_URL ? '#4ade80' : '#f87171'}; font-weight: bold;">${SUPABASE_URL ? 'CONFIGURED' : 'MISSING'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; margin-top: 4px;">
                  <span style="color: #94a3b8;">VITE_SUPABASE_ANON_KEY:</span>
                  <span style="color: ${SUPABASE_PUBLISHABLE_KEY ? '#4ade80' : '#f87171'}; font-weight: bold;">${SUPABASE_PUBLISHABLE_KEY ? 'CONFIGURED' : 'MISSING'}</span>
                </div>
              </div>
              <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                <strong style="color: #f8fafc;">How to resolve in Vercel:</strong>
                <ol style="margin-top: 8px; padding-left: 20px; color: #cbd5e1;">
                  <li>Open your <strong>Vercel Project Dashboard</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Environment Variables</strong>.</li>
                  <li>Ensure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are added for Production.</li>
                  <li>Go to <strong>Deployments</strong> &rarr; Click <strong>Redeploy</strong> (required to recompile the bundle with the variables).</li>
                </ol>
              </div>
            </div>
          </div>
        `;
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderMissingEnvUI);
    } else {
      setTimeout(renderMissingEnvUI, 0);
    }
  }
}

// Use safe fallback placeholders to prevent @supabase/supabase-js createClient()
// from throwing an uncaught "supabaseUrl is required" error during bundle evaluation.
const safeUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
const safeKey = SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key';

export const supabase = createClient<Database>(safeUrl, safeKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});