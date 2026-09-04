// Only the Supabase publishable key belongs in the browser. Database RLS and
// the Edge Function's password check protect writes; privileged keys stay on
// the server.
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://czcwbgnawflmsccrbfkj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_CDpN3DPXQfNg1DvpB3luMw_moihMFBD';

export const getSupabaseConfig = () => ({
  url: SUPABASE_URL.replace(/\/$/, ''),
  publishableKey: SUPABASE_PUBLISHABLE_KEY,
});

// Supabase publishable keys are sent as the apikey header. Do not mirror them
// into Authorization: Bearer, because that header is reserved for JWTs.
export const supabaseHeaders = () => ({
  apikey: SUPABASE_PUBLISHABLE_KEY,
  'Content-Type': 'application/json',
});
