import React, { useState, useMemo } from 'react'
import type { Expense } from '../types'
import { formatMoney, totalsByCurrency } from '../types'
import { EventContextMenu, calculateContextMenuPosition, initialContextMenuState, type ContextMenuState } from './EventContextMenu'
import { BilledBadge, ExpenseAvatar, ReimbursementTag, TotalsBar, cardColors, expenseTitle, getSoftCurrencyColor } from './ExpenseBits'

interface WeekGridProps {
  events: Expense[]
  currentDate: Date
  onEventClick?: (event: Expense) => void
  onEdit?: (event: Expense) => void
  onDelete?: (event: Expense) => void
}

// Igual a la semana del calendario de tiempos, sin la columna de horas (un gasto no tiene hora).
export function WeekGrid({ events, currentDate, onEventClick, onEdit, onDelete }: WeekGridProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(initialContextMenuState)

  const handleContextMenu = (e: React.MouseEvent, evt: Expense) => {
    e.preventDefault()
    e.stopPropagation()
    const { x, y } = calculateContextMenuPosition(e)
    setContextMenu({ isOpen: true, x, y, event: evt })
  }

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day + (day === 0 ? -6 : 1))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [currentDate])

  const daysData = useMemo(() => weekDays.map(d => {
    const dayEvents = events.filter(e => {
      if (!e.fecha) return false
      const [yStr, mStr, dStr] = e.fecha.split('-')
      return parseInt(dStr, 10) === d.getDate() && parseInt(mStr, 10) - 1 === d.getMonth() && parseInt(yStr, 10) === d.getFullYear()
    })
    return { date: d, events: dayEvents, dayTotals: totalsByCurrency(dayEvents) }
  }), [events, weekDays])

  const weekEvents = useMemo(() => daysData.flatMap(d => d.events), [daysData])
  const weekTotals = useMemo(() => totalsByCurrency(weekEvents), [weekEvents])

  const startMonthName = weekDays[0].toLocaleString('es-MX', { month: 'short' })
  const endMonthName = weekDays[6].toLocaleString('es-MX', { month: 'short' })
  const displayTitle = startMonthName === endMonthName
    ? `Semana del ${weekDays[0].getDate()} al ${weekDays[6].getDate()} de ${startMonthName}`
    : `Semana del ${weekDays[0].getDate()} de ${startMonthName} al ${weekDays[6].getDate()} de ${endMonthName}`

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden p-4 sm:p-6 min-w-[800px]">
      <div className="flex items-center justify-between pb-3 px-2 shrink-0">
        <h2 className="text-3xl font-extrabold font-heading text-slate-800 tracking-tight drop-shadow-sm">{displayTitle}</h2>
        {weekEvents.length > 0 && <TotalsBar totals={weekTotals} />}
      </div>
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden min-h-0">
        <div className="flex border-b border-slate-100 bg-slate-50/80">
          {daysData.map(({ date: d, events: dayEvents, dayTotals }, i) => {
            const isToday = new Date().toDateString() === d.toDateString()
            return (
              <div key={i} className="flex-1 py-3 text-center border-r border-slate-100 last:border-0 flex flex-col items-center">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">{d.toLocaleString('es-MX', { weekday: 'short' })}</div>
                <div className={`text-xl font-medium mt-1 inline-flex w-8 h-8 items-center justify-center rounded-full ${isToday ? 'bg-red-700 text-white' : 'text-slate-700'}`}>{d.getDate()}</div>
                {dayEvents.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1.5 px-0.5 w-full">
                    {Object.entries(dayTotals).map(([currency, totals]) => (
                      <div key={currency} className="flex flex-wrap justify-center gap-1 w-full">
                        <span className={`${getSoftCurrencyColor(currency, true)} px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm leading-none border whitespace-nowrap`}>
                          {totals.count} {totals.count === 1 ? 'gasto' : 'gastos'}
                        </span>
                        <span className={`${getSoftCurrencyColor(currency, false)} px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm leading-none border whitespace-nowrap`}>
                          {formatMoney(totals.monto)} <span className="opacity-75">{currency}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="flex relative min-h-full">
            {daysData.map(({ events: dayEvents }, dayIdx) => (
              <div key={dayIdx} className="flex-1 border-r border-slate-100 last:border-0 p-1 flex flex-col gap-1 min-w-0">
                {dayEvents.map((evt, idx) => {
                  const { isBilled, colorClass } = cardColors(evt)
                  return (
                    <div key={evt.id || idx}
                      onClick={() => onEventClick && onEventClick(evt)}
                      onContextMenu={(e) => handleContextMenu(e, evt)}
                      className={`text-xs rounded-md p-2 ${colorClass} border shadow-sm cursor-pointer hover:shadow-md shrink-0 flex gap-2 items-start select-none`}>
                      <div className="mt-0.5"><ExpenseAvatar evt={evt} size="w-8 h-8" icon="h-4 w-4" /></div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 leading-tight mb-0.5">
                          <span className="font-bold truncate text-slate-800">{expenseTitle(evt)}</span>
                          {isBilled && <BilledBadge />}
                        </div>
                        <div className="truncate opacity-90 text-slate-600">{evt.descripcion}</div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <span className="font-medium">{formatMoney(evt.monto)} {evt.moneda}</span>
                          <ReimbursementTag evt={evt} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <EventContextMenu contextMenu={contextMenu} onClose={() => setContextMenu(initialContextMenuState)} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
