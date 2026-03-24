import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function verifyAccess(taskId: string, token?: string): Promise<{ ok: boolean; isAdmin: boolean }> {
  const cookieStore = await cookies()
  if (cookieStore.get('admin_auth')?.value === 'authenticated') return { ok: true, isAdmin: true }
  if (!token) return { ok: false, isAdmin: false }

  const { data: task } = await supabaseAdmin.from('tasks').select('client_id').eq('id', taskId).single()
  if (!task) return { ok: false, isAdmin: false }

  const { data: client } = await supabaseAdmin.from('clients').select('id').eq('token', token).eq('id', task.client_id).single()
  return { ok: !!client, isAdmin: false }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = req.nextUrl.searchParams.get('token') ?? undefined
  const { ok } = await verifyAccess(id, token)
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('comments')
    .select('*')
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { content, token } = await req.json()

  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const { ok, isAdmin } = await verifyAccess(id, token)
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('comments')
    .insert({ task_id: id, content: content.trim(), author_type: isAdmin ? 'admin' : 'client' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
