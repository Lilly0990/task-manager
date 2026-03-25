'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Block, ImageBlock,
  uid, parseBlocks, blocksToContent, hasContent,
  BlockEditor, BlocksDisplay,
} from '@/app/components/blocks'
import { CommentsSection } from '@/app/components/comments'

interface Task {
  id: string
  content: string
  files: string[]
  is_done: boolean
  date: string
  created_at: string
}

interface Client {
  id: string
  name: string
  token: string
  allowed_emails: string[]
}

interface Props {
  client: Client
  initialTasks: Task[]
}

function EmailManager({ client }: { client: Client }) {
  const [emails, setEmails] = useState<string[]>(client.allowed_emails ?? [])
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function save(updated: string[]) {
    setSaving(true)
    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed_emails: updated }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Збережено')
      setTimeout(() => setMsg(''), 2000)
    }
  }

  async function addEmail(e: React.FormEvent) {
    e.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!email || !email.includes('@') || emails.includes(email)) return
    const updated = [...emails, email]
    setEmails(updated)
    setNewEmail('')
    await save(updated)
  }

  async function removeEmail(email: string) {
    const updated = emails.filter(e => e !== email)
    setEmails(updated)
    await save(updated)
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-[#111827]">Доступ по email</h2>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-[#9CA3AF]">Збереження...</span>}
          {msg && <span className="text-xs text-[#16A34A]">{msg}</span>}
        </div>
      </div>

      {emails.length === 0 ? (
        <p className="text-xs text-[#9CA3AF] mb-4">Доступ відкритий для всіх хто має посилання</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {emails.map(email => (
            <div key={email} className="flex items-center gap-1.5 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg px-2.5 py-1.5 text-xs text-[#6366F1]">
              <span>{email}</span>
              <button onClick={() => removeEmail(email)} className="text-[#6366F1] hover:text-[#EF4444] transition-colors leading-none">×</button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addEmail} className="flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder="Додати email..."
          className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
        />
        <button type="submit" disabled={!newEmail.trim()}
          className="bg-[#6366F1] hover:bg-[#818CF8] disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          Додати
        </button>
      </form>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.getTime() === today.getTime()) return 'Сьогодні'
  if (date.getTime() === yesterday.getTime()) return 'Вчора'
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

function FilesDisplay({ files }: { files: string[] }) {
  if (!files?.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {files.map((url, i) => {
        const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'file')
        return (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#6B7280] bg-[#F3F4F6] hover:bg-[#E5E7EB] px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors max-w-xs">
            <span className="opacity-60">⬡</span>
            <span className="truncate">{name}</span>
          </a>
        )
      })}
    </div>
  )
}

function AdminTaskCard({ task, onToggle, onDelete, onEdit }: {
  task: Task
  onToggle: (id: string, is_done: boolean) => void
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [editBlocks, setEditBlocks] = useState<Block[]>([])
  const [saving, setSaving] = useState(false)

  function startEdit() {
    const saved = parseBlocks(task.content)
    setEditBlocks(saved.map(b => ({
      ...b,
      id: uid(),
      ...(b.type === 'image' ? { uploading: false } : {}),
    }) as Block))
    setEditing(true)
  }

  async function save() {
    if (!hasContent(editBlocks)) return
    if (editBlocks.some(b => (b as ImageBlock).uploading)) return
    setSaving(true)
    await onEdit(task.id, blocksToContent(editBlocks))
    setSaving(false)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
    setEditBlocks([])
  }

  return (
    <div className={`bg-white border border-[#E5E7EB] rounded-xl p-4 transition-all ${task.is_done && !editing ? 'opacity-40' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id, task.is_done)}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            task.is_done ? 'bg-[#6366F1] border-[#6366F1]' : 'border-[#D1D5DB] hover:border-[#6B7280]'
          }`}
        >
          {task.is_done && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <BlockEditor blocks={editBlocks} setBlocks={setEditBlocks} />
              <div className="flex gap-2">
                <button onClick={save} disabled={saving || !hasContent(editBlocks)}
                  className="text-xs bg-[#6366F1] hover:bg-[#818CF8] text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
                  {saving ? '...' : 'Зберегти'}
                </button>
                <button onClick={cancel}
                  className="text-xs text-[#6B7280] hover:text-[#111827] px-3 py-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors">
                  Скасувати
                </button>
              </div>
            </div>
          ) : (
            <div onClick={startEdit} className={`cursor-pointer hover:opacity-60 transition-opacity ${task.is_done ? 'line-through text-[#9CA3AF]' : ''}`}>
              <BlocksDisplay content={task.content} />
            </div>
          )}
        </div>

        {!editing && (
          <button onClick={() => onDelete(task.id)}
            className="text-[#D1D5DB] hover:text-[#EF4444] transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <FilesDisplay files={task.files} />
      <CommentsSection taskId={task.id} />
    </div>
  )
}

export default function ClientTasks({ client, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [copied, setCopied] = useState(false)

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!acc[task.date]) acc[task.date] = []
    acc[task.date].push(task)
    return acc
  }, {})
  const sortedDates = Object.keys(tasksByDate).sort((a, b) => b.localeCompare(a))

  async function toggleTask(id: string, is_done: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_done: !is_done }),
    })
    if (res.ok) setTasks(prev => prev.map(t => t.id === id ? { ...t, is_done: !is_done } : t))
  }

  async function deleteTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function editTask(id: string, content: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (res.ok) setTasks(prev => prev.map(t => t.id === id ? { ...t, content } : t))
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/${client.token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const total = tasks.length
  const done = tasks.filter(t => t.is_done).length

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/admin" className="text-[#9CA3AF] hover:text-[#111827] transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-[#111827] tracking-tight">{client.name}</h1>
        <span className="text-xs text-[#9CA3AF] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-full">{done}/{total}</span>
      </div>

      <button onClick={copyLink} className="ml-8 text-xs text-[#9CA3AF] hover:text-[#6366F1] mb-8 block transition-colors">
        {copied ? '✓ Скопійовано' : 'Копіювати посилання клієнта'}
      </button>

      <EmailManager client={client} />

      {sortedDates.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF] text-sm">У цього клієнта поки немає задач</div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-widest mb-3">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {tasksByDate[date].map(task => (
                  <AdminTaskCard key={task.id} task={task}
                    onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
