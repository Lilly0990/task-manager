import { cookies } from 'next/headers'
import LoginForm from './LoginForm'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'authenticated'

  if (!isAuthenticated) return <LoginForm />
  return <AdminDashboard />
}
