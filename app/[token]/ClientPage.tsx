'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Block, ImageBlock, SavedBlock,
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

interface Props {
  token: string
  client: { id: string; name: string }
  allowedEmails: string[]
  initialTasks: Task[]
}

function EmailGate({ token, allowedEmails, children }: {
  token: string
  allowedEmails: string[]
  children: React.ReactNode
}) {
  const storageKey = `email_auth_${token}`
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(storageKey) ?? ''
    if (allowedEmails.length === 0 || allowedEmails.map(e => e.toLowerCase()).includes(saved.toLowerCase())) {
      setAuthed(true)
    }
  }, [allowedEmails, storageKey])

  if (allowedEmails.length === 0 || authed) return <>{children}</>

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = input.trim().toLowerCase()
    if (allowedEmails.map(e => e.toLowerCase()).includes(normalized)) {
      localStorage.setItem(storageKey, input.trim())
      setAuthed(true)
    } else {
      setError('Цей email не має доступу до цієї сторінки')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#090909]">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A2E] border border-[#2A2A4A] flex items-center justify-center mb-6">
            <svg className="w-4 h-4 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Доступ обмежено</h1>
          <p className="text-[#555] text-sm mt-1.5">Введіть ваш email щоб увійти</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={input}
            onChange={e => { setInput(e.target.value); setError('') }}
            placeholder="your@email.com"
            className="w-full bg-[#111] border border-[#222] text-white placeholder-[#444] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
            autoFocus
          />
          {error && <p className="text-[#EF4444] text-sm">{error}</p>}
          <button type="submit" disabled={!input.trim()}
            className="w-full bg-[#6366F1] hover:bg-[#818CF8] disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium transition-colors">
            Увійти
          </button>
        </form>
      </div>
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
            className="flex items-center gap-1.5 text-xs text-[#888] bg-[#161616] hover:bg-[#1E1E1E] px-2.5 py-1.5 rounded-lg border border-[#222] hover:border-[#333] transition-colors max-w-xs">
            <span className="opacity-60">⬡</span>
            <span className="truncate">{name}</span>
          </a>
        )
      })}
    </div>
  )
}

function TaskCard({ task, token, onToggle, onDelete, onEdit }: {
  task: Task
  token: string
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
    <div className={`bg-[#111] border border-[#1E1E1E] rounded-xl p-4 transition-all ${task.is_done && !editing ? 'opacity-40' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id, task.is_done)}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            task.is_done ? 'bg-[#6366F1] border-[#6366F1]' : 'border-[#333] hover:border-[#555]'
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
              <BlockEditor blocks={editBlocks} setBlocks={setEditBlocks} token={token} />
              <div className="flex gap-2">
                <button onClick={save} disabled={saving || !hasContent(editBlocks)}
                  className="text-xs bg-[#6366F1] hover:bg-[#818CF8] text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
                  {saving ? '...' : 'Зберегти'}
                </button>
                <button onClick={cancel}
                  className="text-xs text-[#555] hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors">
                  Скасувати
                </button>
              </div>
            </div>
          ) : (
            <div onClick={startEdit} className={`cursor-pointer hover:opacity-60 transition-opacity ${task.is_done ? 'line-through text-[#444]' : ''}`}>
              <BlocksDisplay content={task.content} />
            </div>
          )}
        </div>

        {!editing && (
          <button onClick={() => onDelete(task.id)}
            className="text-[#2A2A2A] hover:text-[#EF4444] transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <FilesDisplay files={task.files} />
      <CommentsSection taskId={task.id} token={token} />
    </div>
  )
}

export default function ClientPage({ token, client, allowedEmails, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [blocks, setBlocks] = useState<Block[]>([{ id: uid(), type: 'text', value: '' }])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!acc[task.date]) acc[task.date] = []
    acc[task.date].push(task)
    return acc
  }, {})
  const sortedDates = Object.keys(tasksByDate).sort((a, b) => b.localeCompare(a))

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? [])
    const oversized = newFiles.filter(f => f.size > 50 * 1024 * 1024)
    if (oversized.length > 0) {
      setError(`Файли понад 50MB: ${oversized.map(f => f.name).join(', ')}`)
      return
    }
    setSelectedFiles(prev => {
      const combined = [...prev, ...newFiles]
      if (combined.length > 5) { setError('Максимум 5 файлів'); return prev }
      return combined
    })
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!hasContent(blocks)) return
    if (blocks.some(b => (b as ImageBlock).uploading)) {
      setError('Зачекайте, зображення завантажується...')
      return
    }
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('token', token)
      formData.append('content', blocksToContent(blocks))
      for (const file of selectedFiles) formData.append('files', file)

      const res = await fetch('/api/tasks', { method: 'POST', body: formData })
      if (!res.ok) throw new Error()

      const task = await res.json()
      setTasks(prev => [task, ...prev])
      setBlocks([{ id: uid(), type: 'text', value: '' }])
      setSelectedFiles([])
    } catch {
      setError('Помилка при збереженні')
    } finally {
      setSaving(false)
    }
  }

  async function toggleTask(id: string, is_done: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_done: !is_done, token }),
    })
    if (res.ok) setTasks(prev => prev.map(t => t.id === id ? { ...t, is_done: !is_done } : t))
  }

  async function deleteTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function editTask(id: string, content: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, token }),
    })
    if (res.ok) setTasks(prev => prev.map(t => t.id === id ? { ...t, content } : t))
  }

  return (
    <EmailGate token={token} allowedEmails={allowedEmails}>
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="text-lg font-semibold text-white tracking-tight mb-8">{client.name}</h1>

      {/* New task form */}
      <div className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-5 mb-8">
        <form onSubmit={handleSave} className="space-y-3">
          <BlockEditor
            blocks={blocks}
            setBlocks={setBlocks}
            token={token}
            placeholder="Опишіть задачу... (Ctrl+V для вставки скріншота)"
          />

          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, i) => (
                <div key={i} className="relative group">
                  <div className="flex items-center gap-1 text-xs bg-[#161616] border border-[#222] px-2 py-1.5 rounded-lg max-w-[150px] text-[#888]">
                    <span className="opacity-60">⬡</span>
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#EF4444] text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-[#EF4444] text-sm">{error}</p>}

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              disabled={selectedFiles.length >= 5}
              className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#888] px-3 py-2 rounded-lg border border-[#1E1E1E] hover:border-[#2E2E2E] transition-colors disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Файли {selectedFiles.length > 0 && `(${selectedFiles.length}/5)`}
            </button>
            <button type="submit" disabled={saving || !hasContent(blocks)}
              className="ml-auto bg-[#6366F1] hover:bg-[#818CF8] disabled:opacity-40 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors">
              {saving ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>

          <input ref={fileInputRef} type="file" multiple
            accept=".pdf,.doc,.docx,.zip,.ttf,.otf,.woff,.woff2,.txt"
            onChange={handleFileChange} className="hidden" />
        </form>
      </div>

      {/* Tasks list */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-16 text-[#444] text-sm">Поки немає задач. Додайте першу!</div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-[10px] font-medium text-[#444] uppercase tracking-widest mb-3">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {tasksByDate[date].map(task => (
                  <TaskCard key={task.id} task={task} token={token}
                    onToggle={toggleTask} onDelete={deleteTask} onEdit={editTask} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </EmailGate>
  )
}
