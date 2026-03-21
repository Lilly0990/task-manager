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
      setPasswordMsg('Пароль змінено!')
      setNewPassword('')
      setShowPasswordForm(false)
      setTimeout(() => setPasswordMsg(''), 3000)
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Клієнти</h1>
        <div className="flex items-center gap-2">
          {passwordMsg && <span className="text-green-600 text-sm">{passwordMsg}</span>}
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Пароль
          </button>
          <button
            onClick={logout}
            className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Вийти
          </button>
        </div>
      </div>

      {/* Change password */}
      {showPasswordForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Новий пароль</h2>
          <form onSubmit={changePassword} className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Мінімум 4 символи"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newPassword || newPassword.length < 4}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Зберегти
            </button>
          </form>
        </div>
      )}

      {/* New client created */}
      {createdClient && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between mb-2">
            <p className="font-semibold text-green-800">Клієнта створено!</p>
            <button onClick={() => setCreatedClient(null)} className="text-green-600 text-sm hover:underline">
              Закрити
            </button>
          </div>
          <p className="text-sm text-green-700 mb-2">Посилання для клієнта:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-green-200 rounded px-3 py-1.5 text-sm text-green-800 break-all">
              {baseUrl}/{createdClient.token}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${baseUrl}/${createdClient.token}`)}
              className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
            >
              Копіювати
            </button>
          </div>
        </div>
      )}

      {/* Create client form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">Новий клієнт</h2>
        <form onSubmit={createClient} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ім'я або назва компанії"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? '...' : 'Створити'}
          </button>
        </form>
      </div>

      {/* Clients list */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Всі клієнти · {clients.length}
        </p>
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Завантаження...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Поки немає клієнтів</div>
        ) : (
          <div className="space-y-2">
            {clients.map(client => {
              const total = client.tasks?.length ?? 0
              const done = client.tasks?.filter(t => t.is_done).length ?? 0
              return (
                <Link
                  key={client.id}
                  href={`/admin/${client.id}`}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div>
                    <p className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                      {client.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{done}/{total} виконано</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
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
