import React, { useState, useMemo } from 'react'
import type { Expense } from '../types'
import { PAGADO_POR_LABEL, formatMoney, totalsByCurrency } from '../types'
import { EventContextMenu, calculateContextMenuPosition, initialContextMenuState, type ContextMenuState } from './EventContextMenu'
import { BilledBadge, ExpenseAvatar, ReimbursementTag, TotalsBar, cardColors, expenseTitle } from './ExpenseBits'

interface DayGridProps {
  events: Expense[]
  currentDate: Date
  onEventClick?: (event: Expense) => void
  onEdit?: (event: Expense) => void
  onDelete?: (event: Expense) => void
}

// Igual al día del calendario de tiempos, sin la columna de horas.
export function DayGrid({ events, currentDate, onEventClick, onEdit, onDelete }: DayGridProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(initialContextMenuState)

  const handleContextMenu = (e: React.MouseEvent, evt: Expense) => {
    e.preventDefault()
    e.stopPropagation()
    const { x, y } = calculateContextMenuPosition(e)
    setContextMenu({ isOpen: true, x, y, event: evt })
  }

  const isToday = new Date().toDateString() === currentDate.toDateString()

  const dayEvents = useMemo(() => events.filter(e => {
    if (!e.fecha) return false
    const [yStr, mStr, dStr] = e.fecha.split('-')
    return parseInt(dStr, 10) === currentDate.getDate() && parseInt(mStr, 10) - 1 === currentDate.getMonth() && parseInt(yStr, 10) === currentDate.getFullYear()
  }), [events, currentDate])

  const dayTotals = useMemo(() => totalsByCurrency(dayEvents), [dayEvents])

  const monthName = currentDate.toLocaleString('es-MX', { month: 'long' })
  const dayName = currentDate.toLocaleString('es-MX', { weekday: 'long' })
  const displayTitle = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${currentDate.getDate()} de ${monthName}`

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden p-4 sm:p-6 min-w-[500px]">
      <div className="flex items-center justify-between pb-3 px-2 shrink-0">
        <h2 className="text-3xl font-extrabold font-heading text-slate-800 tracking-tight drop-shadow-sm">{displayTitle}</h2>
        {dayEvents.length > 0 && <TotalsBar totals={dayTotals} />}
      </div>
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden min-h-0">
        <div className="flex border-b border-slate-100 bg-slate-50/80">
          <div className="flex-1 py-4 text-center">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">{currentDate.toLocaleString('es-MX', { weekday: 'long' })}</div>
            <div className={`text-2xl font-medium mt-1 inline-flex w-10 h-10 items-center justify-center rounded-full ${isToday ? 'bg-red-700 text-white' : 'text-slate-700'}`}>{currentDate.getDate()}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="p-2 flex flex-col gap-2">
            {dayEvents.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No hay gastos registrados este día.</p>}
            {dayEvents.map((evt, idx) => {
              const { isBilled, colorClass } = cardColors(evt)
              return (
                <div key={evt.id || idx}
                  onClick={() => onEventClick && onEventClick(evt)}
                  onContextMenu={(e) => handleContextMenu(e, evt)}
                  className={`text-sm rounded-lg p-3 ${colorClass} border shadow-sm cursor-pointer hover:shadow-md shrink-0 flex items-start justify-between select-none`}>
                  <div className="flex gap-3 items-start min-w-0">
                    <ExpenseAvatar evt={evt} size="w-10 h-10" icon="h-5 w-5" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="font-bold text-[15px] leading-tight text-slate-800">{expenseTitle(evt)}</div>
                      <div className="opacity-90 max-w-xl text-slate-600 leading-snug">{evt.descripcion}</div>
                      <div className="text-xs text-slate-500">{evt.cliente_nombre} · {evt.proyecto_nombre} · Pagó: {PAGADO_POR_LABEL[evt.pagado_por] || evt.pagado_por}{evt.abogado_nombre ? ` (${evt.abogado_nombre})` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ReimbursementTag evt={evt} />
                    {isBilled && <BilledBadge size="md" />}
                    <div className="font-bold whitespace-nowrap bg-white/50 px-2 py-1 rounded">{formatMoney(evt.monto)} {evt.moneda}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <EventContextMenu contextMenu={contextMenu} onClose={() => setContextMenu(initialContextMenuState)} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
