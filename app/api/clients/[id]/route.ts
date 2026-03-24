import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function checkAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_auth')?.value === 'authenticated'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { allowed_emails } = await req.json()

  if (!Array.isArray(allowed_emails)) {
    return NextResponse.json({ error: 'allowed_emails must be array' }, { status: 400 })
  }

  const clean = allowed_emails
    .map((e: string) => e.trim().toLowerCase())
    .filter((e: string) => e.includes('@'))

  const { data, error } = await supabaseAdmin
    .from('clients')
    .update({ allowed_emails: clean })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
