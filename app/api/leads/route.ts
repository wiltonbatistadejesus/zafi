// -----------------------------------------------
// API Route: POST /api/leads
// -----------------------------------------------
// Saves the lead (name, email, simulation summary)
// to the Supabase `leads` table.
//
// Using a server-side API route instead of calling
// Supabase directly from the browser keeps the logic
// centralized and easy to extend (e.g. send email).
// -----------------------------------------------

import { NextResponse } from 'next/server'

// Shape of the request body
export async function POST() {
  return NextResponse.json(
    { error: 'Legacy endpoint retired; use the progressive profile flow.' },
    { status: 410 }
  )
}
