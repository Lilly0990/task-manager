'use client'

import { useRef } from 'react'

export type TextBlock = { id: string; type: 'text'; value: string }
export type ImageBlock = { id: string; type: 'image'; url: string; uploading: boolean }
export type Block = TextBlock | ImageBlock
export type SavedBlock = { type: 'text'; value: string } | { type: 'image'; url: string }

export const uid = () => Math.random().toString(36).slice(2, 10)

export function parseBlocks(content: string): SavedBlock[] {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return [{ type: 'text', value: content }]
}

export function blocksToContent(blocks: Block[]): string {
  const saved: SavedBlock[] = blocks
    .filter(b => b.type === 'text' || !!(b as ImageBlock).url)
    .map(b => b.type === 'text'
      ? { type: 'text', value: b.value }
      : { type: 'image', url: (b as ImageBlock).url }
    )
  return JSON.stringify(saved)
}

export function hasContent(blocks: Block[]): boolean {
  return blocks.some(b =>
    (b.type === 'text' && b.value.trim()) ||
    (b.type === 'image' && !!(b as ImageBlock).url)
  )
}

export function BlocksDisplay({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content)
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === 'image') {
          return (
            <a key={i} href={block.url} target="_blank" rel="noopener noreferrer" className="block my-1">
              <img src={block.url} alt="" className="max-w-full max-h-64 rounded-lg border border-[#E5E7EB]" />
            </a>
          )
        }
        return block.value
          ? <p key={i} className="text-sm whitespace-pre-wrap">{block.value}</p>
          : null
      })}
    </div>
  )
}

export function BlockEditor({
  blocks,
  setBlocks,
  token,
  placeholder,
}: {
  blocks: Block[]
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
  token?: string
  placeholder?: string
}) {
  const refs = useRef<Map<string, HTMLTextAreaElement>>(new Map())

  function removeAndMerge(imgId: string) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === imgId)
      if (idx === -1) return prev
      const newBlocks = [...prev]
      const prevBlock = idx > 0 ? prev[idx - 1] : null
      const nextBlock = idx < prev.length - 1 ? prev[idx + 1] : null
      if (prevBlock?.type === 'text' && nextBlock?.type === 'text') {
        newBlocks.splice(idx - 1, 3, { id: prevBlock.id, type: 'text', value: prevBlock.value + nextBlock.value })
      } else {
        newBlocks.splice(idx, 1)
      }
      return newBlocks.length ? newBlocks : [{ id: uid(), type: 'text', value: '' }]
    })
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>, blockId: string) {
    const imageItem = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (!imageItem) return
    e.preventDefault()

    const ta = refs.current.get(blockId)
    const cursor = ta?.selectionStart ?? 0
    const imgId = uid()
    const afterId = uid()

    setBlocks(prev => {
      const block = prev.find(b => b.id === blockId) as TextBlock | undefined
      if (!block) return prev
      const before = block.value.slice(0, cursor)
      const after = block.value.slice(cursor)
      return prev.flatMap(b =>
        b.id === blockId ? [
          { id: blockId, type: 'text' as const, value: before },
          { id: imgId, type: 'image' as const, url: '', uploading: true },
          { id: afterId, type: 'text' as const, value: after },
        ] : [b]
      )
    })

    const blob = imageItem.getAsFile()
    if (!blob) { removeAndMerge(imgId); return }

    const fd = new FormData()
    fd.append('file', new File([blob], `screenshot-${Date.now()}.png`, { type: blob.type }))
    if (token) fd.append('token', token)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        setBlocks(prev => prev.map(b => b.id === imgId ? { ...b, url, uploading: false } : b))
      } else {
        removeAndMerge(imgId)
      }
    } catch {
      removeAndMerge(imgId)
    }
  }

  const firstTextId = blocks.find(b => b.type === 'text')?.id

  return (
    <div className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2.5 focus-within:border-[#6366F1] transition-colors">
      {blocks.map(block => {
        if (block.type === 'image') {
          const img = block as ImageBlock
          return (
            <div key={block.id} className="relative group my-2">
              {img.uploading ? (
                <div className="h-16 w-32 bg-[#E5E7EB] rounded-lg animate-pulse flex items-center justify-center text-xs text-[#9CA3AF]">
                  Завантаження...
                </div>
              ) : (
                <img src={img.url} alt="" className="max-w-full max-h-64 rounded-lg border border-[#E5E7EB] block" />
              )}
              <button
                type="button"
                onClick={() => removeAndMerge(block.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          )
        }

        const tb = block as TextBlock
        return (
          <textarea
            key={block.id}
            ref={el => { if (el) refs.current.set(block.id, el); else refs.current.delete(block.id) }}
            value={tb.value}
            onChange={e => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, value: e.target.value } : b))}
            onPaste={e => handlePaste(e, block.id)}
            placeholder={block.id === firstTextId ? (placeholder ?? '') : ''}
            rows={Math.max(1, tb.value.split('\n').length)}
            className="w-full outline-none resize-none text-sm text-[#1F2937] placeholder-[#9CA3AF] bg-transparent block"
          />
        )
      })}
    </div>
  )
}
