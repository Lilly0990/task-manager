'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      setError('Невірний пароль')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F7F8FA]">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1] mb-6" />
          <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Вхід</h1>
          <p className="text-[#6B7280] text-sm mt-1.5">Адмін панель</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
            autoFocus
          />
          {error && <p className="text-[#EF4444] text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#6366F1] hover:bg-[#818CF8] disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {loading ? 'Вхід...' : 'Увійти'}
          </button>
        </form>
      </div>
    </div>
  )
}
