import React, { useEffect } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import type { Expense } from '../types'

export interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  event: Expense | null
}

export const initialContextMenuState: ContextMenuState = {
  isOpen: false,
  x: 0,
  y: 0,
  event: null
}

export function calculateContextMenuPosition(
  e: React.MouseEvent,
  menuWidth = 160,
  menuHeight = 90
): { x: number; y: number } {
  const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10)
  const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10)
  return {
    x: Math.max(10, x),
    y: Math.max(10, y)
  }
}

interface EventContextMenuProps {
  contextMenu: ContextMenuState
  onClose: () => void
  onEdit?: (event: Expense) => void
  onDelete?: (event: Expense) => void
}

export function EventContextMenu({
  contextMenu,
  onClose,
  onEdit,
  onDelete
}: EventContextMenuProps) {
  useEffect(() => {
    if (!contextMenu.isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('click', onClose)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)

    return () => {
      window.removeEventListener('click', onClose)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [contextMenu.isOpen, onClose])

  if (!contextMenu.isOpen || !contextMenu.event) return null

  return (
    <div
      className="fixed z-[70] min-w-[150px] bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-xs font-medium select-none"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <button
        type="button"
        className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2.5 transition-colors cursor-pointer"
        onClick={() => {
          const evt = contextMenu.event!
          onClose()
          if (onEdit) onEdit(evt)
        }}
      >
        <Edit2 className="h-3.5 w-3.5 text-slate-500" />
        <span>Editar</span>
      </button>
      <div className="h-px bg-slate-100 my-1" />
      <button
        type="button"
        className="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
        onClick={() => {
          const evt = contextMenu.event!
          onClose()
          if (onDelete) onDelete(evt)
        }}
      >
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
        <span>Eliminar</span>
      </button>
    </div>
  )
}

