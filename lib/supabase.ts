// -----------------------------------------------
// Zafi — Supabase client
// -----------------------------------------------
// Uses the anon (public) key — safe to expose in the browser.
// Row-Level Security (RLS) on the leads table controls access.

import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient<any>> | null = null

// Lazy initialization keeps `next build` safe when runtime variables are absent.
export function getSupabaseClient() {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  client = createClient<any>(supabaseUrl, supabaseAnonKey)
  return client
}

// -----------------------------------------------
// Supabase setup instructions (run once in SQL editor):
// -----------------------------------------------
//
// CREATE TABLE leads (
//   id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   created_at  timestamptz DEFAULT now(),
//   name        text NOT NULL,
//   email       text NOT NULL,
//   total_debt  numeric NOT NULL,
//   income      numeric,
//   est_months  integer
// );
//
// -- Allow anyone to INSERT (needed for anon key)
// ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "allow_insert" ON leads FOR INSERT WITH CHECK (true);
//
// -- Only authenticated service-role can SELECT (protects user data)
// CREATE POLICY "deny_select" ON leads FOR SELECT USING (false);
