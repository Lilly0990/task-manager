import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (cookieStore.get('admin_auth')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { newPassword } = await req.json()
  if (!newPassword || newPassword.length < 4) {
    return NextResponse.json({ error: 'Пароль занадто короткий' }, { status: 400 })
  }

  await supabaseAdmin
    .from('settings')
    .update({ value: newPassword })
    .eq('key', 'admin_password')

  return NextResponse.json({ ok: true })
}
