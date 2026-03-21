import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendTelegram } from '@/lib/telegram'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('token', token)
    .single()

  if (!client) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('client_id', client.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return NextResponse.json(tasks ?? [])
}

type SavedBlock = { type: 'text'; value: string } | { type: 'image'; url: string }

function extractTextPreview(content: string): string {
  try {
    const blocks = JSON.parse(content) as SavedBlock[]
    if (!Array.isArray(blocks)) return content
    const text = blocks.filter(b => b.type === 'text').map(b => (b as { value: string }).value).join(' ')
    const imgs = blocks.filter(b => b.type === 'image').length
    return text + (imgs > 0 ? ` [${imgs} зображень]` : '')
  } catch {
    return content
  }
}

export async function POST(req: NextRequest) {
  const baseUrl = req.nextUrl.origin
  const formData = await req.formData()
  const token = formData.get('token') as string
  const content = formData.get('content') as string
  const files = formData.getAll('files') as File[]

  if (!token || !content) {
    return NextResponse.json({ error: 'Token and content required' }, { status: 400 })
  }

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name')
    .eq('token', token)
    .single()

  if (!client) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  await supabaseAdmin.storage
    .createBucket('task-files', { public: true, fileSizeLimit: 52428800 })
    .catch(() => {})

  // Upload non-inline file attachments
  const fileUrls: string[] = []
  for (const file of files) {
    if (!file.name || file.size === 0) continue
    if (file.size > 50 * 1024 * 1024) continue

    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${client.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabaseAdmin.storage
      .from('task-files')
      .upload(path, buffer, { contentType: file.type })

    if (!error) {
      const { data: { publicUrl } } = supabaseAdmin.storage.from('task-files').getPublicUrl(path)
      fileUrls.push(publicUrl)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .insert({ client_id: client.id, content, files: fileUrls, date: today })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = new Date().toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  await sendTelegram(
    `📋 Нова задача\n<b>${client.name}</b>\n\n🕐 ${now}\n\n🔗 ${baseUrl}/${token}`
  )

  return NextResponse.json(task)
}
