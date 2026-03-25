'use client'

import { useState } from 'react'

interface Comment {
  id: string
  task_id: string
  content: string
  author_type: 'admin' | 'client'
  created_at: string
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

export function CommentsSection({ taskId, token }: { taskId: string; token?: string }) {
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    if (loaded) return
    const url = `/api/tasks/${taskId}/comments${token ? `?token=${token}` : ''}`
    const res = await fetch(url)
    if (res.ok) { setComments(await res.json()); setLoaded(true) }
  }

  function toggle() {
    if (!open) load()
    setOpen(v => !v)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim(), token }),
    })
    if (res.ok) {
      const newComment = await res.json()
      setComments(prev => [...prev, newComment])
      setText('')
    }
    setSaving(false)
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#F3F4F6]">
      <button
        onClick={toggle}
        className="text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {open
          ? 'Сховати'
          : loaded && comments.length > 0
            ? `${comments.length} коментар${comments.length === 1 ? '' : 'і'}`
            : 'Коментарі'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {!loaded ? (
            <p className="text-xs text-[#9CA3AF]">Завантаження...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-[#9CA3AF]">Поки немає коментарів</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2.5 items-start">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 mt-0.5 tracking-wide uppercase ${
                  c.author_type === 'admin'
                    ? 'bg-[#EEF2FF] text-[#6366F1]'
                    : 'bg-[#F3F4F6] text-[#6B7280]'
                }`}>
                  {c.author_type === 'admin' ? 'Адмін' : 'Клієнт'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#374151] break-words leading-relaxed">{c.content}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-1">{formatTime(c.created_at)}</p>
                </div>
              </div>
            ))
          )}

          <form onSubmit={submit} className="flex gap-2 pt-1">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Написати коментар..."
              className="flex-1 text-xs bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-lg px-3 py-2 focus:outline-none focus:border-[#6366F1] transition-colors"
            />
            <button
              type="submit"
              disabled={saving || !text.trim()}
              className="text-xs bg-[#6366F1] hover:bg-[#818CF8] disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors font-medium"
            >
              {saving ? '...' : '→'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
