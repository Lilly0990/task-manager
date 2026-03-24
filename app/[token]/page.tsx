import { supabaseAdmin } from '@/lib/supabase-admin'
import { notFound } from 'next/navigation'
import ClientPage from './ClientPage'

export default async function TokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, allowed_emails')
    .eq('token', token)
    .single()

  if (!client) notFound()

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('client_id', client.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return <ClientPage token={token} client={client} allowedEmails={client.allowed_emails ?? []} initialTasks={tasks ?? []} />
}
