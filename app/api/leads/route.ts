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

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Shape of the request body
interface LeadPayload {
  name: string
  email: string
  totalDebt: number
  income?: number
  estimatedMonths?: number | null
  contactConsent?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body: LeadPayload = await req.json()

    // Basic validation
    if (!body.name || !body.email || !body.totalDebt) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, totalDebt' },
        { status: 400 }
      )
    }

    // Email format check (simple)
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
    if (!emailOk) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Insert into Supabase
    const { error } = await supabase.from('leads').insert([
      {
        name: body.name,
        email: body.email,
        total_debt: body.totalDebt,
        income: body.income ?? null,
        est_months: body.estimatedMonths ?? null,
        contact_consent: body.contactConsent ?? false,
      },
    ])

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('Unexpected error in /api/leads:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
