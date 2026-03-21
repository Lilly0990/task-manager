import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file?.size) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const token = formData.get('token') as string | null
  let folder = 'uploads'

  const cookieStore = await cookies()
  if (cookieStore.get('admin_auth')?.value === 'authenticated') {
    folder = 'admin'
  } else if (token) {
    const { data: client } = await supabaseAdmin.from('clients').select('id').eq('token', token).single()
    if (!client) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    folder = client.id
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await supabaseAdmin.storage
    .createBucket('task-files', { public: true, fileSizeLimit: 52428800 })
    .catch(() => {})

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('task-files')
    .upload(path, buffer, { contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('task-files').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
