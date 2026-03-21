import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  const { data } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'admin_password')
    .single()

  if (!data || data.value !== password) {
    return NextResponse.json({ error: 'Невірний пароль' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_auth', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return response
}
