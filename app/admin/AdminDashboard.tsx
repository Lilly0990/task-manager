'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Task {
  id: string
  is_done: boolean
}

interface Client {
  id: string
  name: string
  token: string
  created_at: string
  tasks: Task[]
}

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createdClient, setCreatedClient] = useState<Client | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => {
        setClients(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  async function createClient(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })

    const client = await res.json()
    setClients(prev => [{ ...client, tasks: [] }, ...prev])
    setCreatedClient({ ...client, tasks: [] })
    setNewName('')
    setCreating(false)
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.refresh()
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    if (res.ok) {
      setPasswordMsg('Пароль змінено')
      setNewPassword('')
      setShowPasswordForm(false)
      setTimeout(() => setPasswordMsg(''), 3000)
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-lg font-semibold text-[#111827] tracking-tight">Клієнти</h1>
        <div className="flex items-center gap-1">
          {passwordMsg && <span className="text-[#16A34A] text-xs mr-2">{passwordMsg}</span>}
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="text-xs text-[#6B7280] hover:text-[#111827] px-3 py-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            Пароль
          </button>
          <button
            onClick={logout}
            className="text-xs text-[#6B7280] hover:text-[#EF4444] px-3 py-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            Вийти
          </button>
        </div>
      </div>

      {/* Change password */}
      {showPasswordForm && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-[#111827] mb-3">Новий пароль</p>
          <form onSubmit={changePassword} className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Мінімум 4 символи"
              className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newPassword || newPassword.length < 4}
              className="bg-[#6366F1] hover:bg-[#818CF8] disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Зберегти
            </button>
          </form>
        </div>
      )}

      {/* New client created */}
      {createdClient && (
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
              <p className="text-sm font-medium text-[#16A34A]">Клієнта створено</p>
            </div>
            <button onClick={() => setCreatedClient(null)} className="text-[#9CA3AF] hover:text-[#111827] text-lg leading-none transition-colors">×</button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#6B7280] break-all font-mono">
              {baseUrl}/{createdClient.token}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${baseUrl}/${createdClient.token}`)}
              className="text-xs bg-[#F0FDF4] border border-[#86EFAC] text-[#16A34A] px-3 py-2 rounded-xl hover:bg-[#BBF7D0] transition-colors flex-shrink-0 font-medium"
            >
              Копіювати
            </button>
          </div>
        </div>
      )}

      {/* Create client form */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 mb-8">
        <p className="text-sm font-medium text-[#111827] mb-3">Новий клієнт</p>
        <form onSubmit={createClient} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ім'я або назва компанії"
            className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="bg-[#6366F1] hover:bg-[#818CF8] disabled:opacity-40 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {creating ? '...' : 'Створити'}
          </button>
        </form>
      </div>

      {/* Clients list */}
      <div>
        <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-widest mb-4">
          Всі клієнти · {clients.length}
        </p>
        {loading ? (
          <div className="text-center py-16 text-[#9CA3AF] text-sm">Завантаження...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF] text-sm">Поки немає клієнтів</div>
        ) : (
          <div className="space-y-2">
            {clients.map(client => {
              const total = client.tasks?.length ?? 0
              const done = client.tasks?.filter(t => t.is_done).length ?? 0
              return (
                <Link
                  key={client.id}
                  href={`/admin/${client.id}`}
                  className="bg-white border border-[#E5E7EB] rounded-2xl px-5 py-4 flex items-center justify-between hover:border-[#D1D5DB] hover:bg-[#F9FAFB] transition-all group"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1F2937] group-hover:text-[#111827] transition-colors">
                      {client.name}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {total === 0 ? 'Немає задач' : `${done} з ${total} виконано`}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#6366F1] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
