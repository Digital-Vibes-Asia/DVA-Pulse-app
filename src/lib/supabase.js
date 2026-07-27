import { createClient } from "@supabase/supabase-js";

/*
 * DVAPulse Supabase client.
 *
 * The anon key below is a PUBLIC client key — it is safe to embed in the
 * bundle. Row Level Security on `public.dvapulse_leads` is what actually
 * protects the data: the anon role may only INSERT, while SELECT/UPDATE are
 * restricted to authenticated users whose email ends with
 * `@digitalvibesasia.com`.
 */
const SUPABASE_URL = "https://glevzzgrpewhmlkaccoe.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZXZ6emdycGV3aG1sa2FjY29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTE3MzIsImV4cCI6MjA5NjI2NzczMn0.G75sLhPCNygHjFcE9x7WhtoFa-t8DM5k2rlM1n-RxP8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const LEADS_TABLE = "dvapulse_leads";
// Post-call records inserted by pulse.digitalvibesasia.com/api/elevenlabs-webhook
// (RLS: SELECT only for authenticated @digitalvibesasia.com users).
export const CALLS_TABLE = "dvapulse_calls";
export const AUTH_DOMAIN = "@digitalvibesasia.com";
