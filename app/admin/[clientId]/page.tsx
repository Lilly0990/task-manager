import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ClientTasks from './ClientTasks'

export default async function AdminClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const cookieStore = await cookies()
  if (cookieStore.get('admin_auth')?.value !== 'authenticated') {
    redirect('/admin')
  }

  const { clientId } = await params

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, token, allowed_emails')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return <ClientTasks client={client} initialTasks={tasks ?? []} />
}
