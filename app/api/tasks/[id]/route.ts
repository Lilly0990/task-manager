import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function verifyAccess(id: string, token?: string): Promise<boolean> {
  const cookieStore = await cookies()
  if (cookieStore.get('admin_auth')?.value === 'authenticated') return true
  if (!token) return false

  const { data: task } = await supabaseAdmin.from('tasks').select('client_id').eq('id', id).single()
  if (!task) return false

  const { data: client } = await supabaseAdmin.from('clients').select('id').eq('token', token).eq('id', task.client_id).single()
  return !!client
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { token } = await req.json()

  if (!(await verifyAccess(id, token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: task } = await supabaseAdmin.from('tasks').select('files, content').eq('id', id).single()

  if (task) {
    const allUrls: string[] = [...(task.files ?? [])]
    try {
      const blocks = JSON.parse(task.content) as Array<{ type: string; url?: string }>
      blocks.filter(b => b.type === 'image' && b.url).forEach(b => {
        if (!allUrls.includes(b.url!)) allUrls.push(b.url!)
      })
    } catch {}

    const paths = allUrls.map((url: string) => {
      const match = url.match(/task-files\/(.+)$/)
      return match ? match[1] : null
    }).filter(Boolean) as string[]
    if (paths.length) await supabaseAdmin.storage.from('task-files').remove(paths)
  }

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { is_done, content, token } = await req.json()

  if (!(await verifyAccess(id, token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates: Record<string, unknown> = {}
  if (is_done !== undefined) updates.is_done = is_done
  if (content !== undefined) updates.content = content

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
