'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Block, ImageBlock,
  uid, parseBlocks, blocksToContent, hasContent,
  BlockEditor, BlocksDisplay,
} from '@/app/components/blocks'

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
}

interface Props {
  client: Client
  initialTasks: Task[]
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
            className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors max-w-xs">
            <span>📎</span>
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
    <div className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm transition-all ${task.is_done && !editing ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id, task.is_done)}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            task.is_done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-gray-400'
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
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? '...' : 'Зберегти'}
                </button>
                <button onClick={cancel}
                  className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  Скасувати
                </button>
              </div>
            </div>
          ) : (
            <div onClick={startEdit} className={`cursor-pointer hover:opacity-75 transition-opacity ${task.is_done ? 'line-through text-gray-400' : ''}`}>
              <BlocksDisplay content={task.content} />
            </div>
          )}
        </div>

        {!editing && (
          <button onClick={() => onDelete(task.id)}
            className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <FilesDisplay files={task.files} />
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
        <span className="text-sm text-gray-400">{done}/{total}</span>
      </div>

      <button onClick={copyLink} className="ml-8 text-sm text-blue-500 hover:text-blue-700 mb-8 block transition-colors">
        {copied ? '✓ Скопійовано!' : 'Копіювати посилання клієнта'}
      </button>

      {sortedDates.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">У цього клієнта поки немає задач</div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
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
