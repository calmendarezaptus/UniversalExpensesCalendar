import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { Expense } from '../types'
import { formatMoney, totalsByCurrency } from '../types'
import { X } from 'lucide-react'
import { EventContextMenu, calculateContextMenuPosition, initialContextMenuState, type ContextMenuState } from './EventContextMenu'
import { BilledBadge, ExpenseAvatar, ReimbursementTag, TotalsBar, cardColors, expenseTitle, getCurrencyColor } from './ExpenseBits'

interface MonthGridProps {
  events: Expense[]
  currentDate: Date
  onEventClick?: (event: Expense) => void
  onEdit?: (event: Expense) => void
  onDelete?: (event: Expense) => void
}

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function MonthGrid({ events, currentDate, onEventClick, onEdit, onDelete }: MonthGridProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(initialContextMenuState)

  const handleContextMenu = (e: React.MouseEvent, evt: Expense) => {
    e.preventDefault()
    e.stopPropagation()
    const { x, y } = calculateContextMenuPosition(e)
    setContextMenu({ isOpen: true, x, y, event: evt })
  }

  const [popoverDay, setPopoverDay] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setPopoverDay(null)
    }
    if (popoverDay) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [popoverDay])

  const days = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const startOffset = firstDay === 0 ? 6 : firstDay - 1
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    const calendarDays = []
    for (let i = 0; i < startOffset; i++) {
      calendarDays.push({ date: daysInPrevMonth - startOffset + i + 1, month: month === 0 ? 11 : month - 1, year: month === 0 ? year - 1 : year, isCurrentMonth: false })
    }
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push({ date: i, month, year, isCurrentMonth: true })
    const totalCells = calendarDays.length > 35 ? 42 : 35
    const remaining = totalCells - calendarDays.length
    for (let i = 1; i <= remaining; i++) {
      calendarDays.push({ date: i, month: month === 11 ? 0 : month + 1, year: month === 11 ? year + 1 : year, isCurrentMonth: false })
    }
    return calendarDays
  }, [currentDate])

  const monthEvents = useMemo(() => events.filter(e => {
    if (!e.fecha) return false
    const [yStr, mStr] = e.fecha.split('-')
    return parseInt(mStr, 10) - 1 === currentDate.getMonth() && parseInt(yStr, 10) === currentDate.getFullYear()
  }), [events, currentDate])

  const monthTotals = useMemo(() => totalsByCurrency(monthEvents), [monthEvents])

  const monthName = currentDate.toLocaleString('es-MX', { month: 'long' })
  const displayTitle = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${currentDate.getFullYear()}`
  const today = new Date()

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 p-2 sm:p-4 min-w-[800px] h-full">
      <div className="flex items-center justify-between pb-3 px-2">
        <h2 className="text-3xl font-extrabold font-heading text-slate-800 tracking-tight drop-shadow-sm">{displayTitle}</h2>
        {monthEvents.length > 0 && <TotalsBar totals={monthTotals} />}
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200/60 relative">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl">
          {daysOfWeek.map(day => (
            <div key={day} className="py-3 text-center text-sm font-bold text-slate-500 uppercase tracking-wider">{day}</div>
          ))}
        </div>

        <div className={`flex-1 grid grid-cols-7 ${days.length > 35 ? 'grid-rows-6' : 'grid-rows-5'}`}>
          {days.map((dayObj, i) => {
            const dayEvents = events.filter(e => {
              if (!e.fecha) return false
              const [yStr, mStr, dStr] = e.fecha.split('-')
              return parseInt(dStr, 10) === dayObj.date && parseInt(mStr, 10) - 1 === dayObj.month && parseInt(yStr, 10) === dayObj.year
            })
            const isToday = dayObj.isCurrentMonth && dayObj.date === today.getDate() && dayObj.month === today.getMonth() && dayObj.year === today.getFullYear()
            const dayKey = `${dayObj.year}-${dayObj.month}-${dayObj.date}`
            const isPopoverOpen = popoverDay === dayKey
            const MAX_VISIBLE = 2
            const hasMore = dayEvents.length > MAX_VISIBLE
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE)
            const dayTotals = totalsByCurrency(dayEvents)

            return (
              <div key={i}
                onContextMenu={(e) => { if (dayEvents.length === 1) handleContextMenu(e, dayEvents[0]) }}
                className={`border-b border-r border-slate-100 p-1 flex flex-col gap-0.5 min-h-0 transition-colors relative hover:bg-slate-50/50 ${!dayObj.isCurrentMonth ? 'bg-slate-50/30' : 'bg-white'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-red-700 text-white' : !dayObj.isCurrentMonth ? 'text-slate-400' : 'text-slate-700'}`}>
                    {dayObj.date}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex flex-col items-end gap-1 mt-0.5 mr-0.5 max-w-[85%]">
                      {Object.entries(dayTotals).map(([currency, totals]) => (
                        <div key={currency} className="flex flex-wrap justify-end gap-1">
                          <span className={`${getCurrencyColor(currency, true)} text-white px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm leading-none flex items-center border`}>
                            {totals.count} {totals.count === 1 ? 'gasto' : 'gastos'}
                          </span>
                          <span className={`${getCurrencyColor(currency, false)} text-white px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm leading-none flex items-center border`}>
                            {formatMoney(totals.monto)} <span className="ml-1 opacity-75 font-medium">{currency}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                  {visibleEvents.map((evt, idx) => {
                    const { isBilled, colorClass, dotClass } = cardColors(evt)
                    return (
                      <div key={evt.id || idx}
                        onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(evt) }}
                        onContextMenu={(e) => handleContextMenu(e, evt)}
                        className={`text-[10px] sm:text-[12px] rounded p-1.5 ${colorClass} flex items-start gap-1.5 cursor-pointer hover:shadow-md hover:-translate-y-px transition-all duration-200 border select-none`}>
                        <div className="pt-0.5 shrink-0"><ExpenseAvatar evt={evt} /></div>
                        <div className="flex flex-col min-w-0 flex-1 leading-tight">
                          <div className="flex items-center gap-1 font-bold truncate text-slate-800">
                            <div className={`w-1 h-1 rounded-full shrink-0 ${dotClass}`}></div>
                            <span className="truncate">{expenseTitle(evt)}</span>
                          </div>
                          <span className="truncate opacity-90 text-slate-600">{evt.descripcion}</span>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="opacity-80 font-medium">{formatMoney(evt.monto)} {evt.moneda}</span>
                            <div className="flex gap-0.5">
                              <ReimbursementTag evt={evt} />
                              {isBilled && <BilledBadge />}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {hasMore && (
                    <button onClick={(e) => { e.stopPropagation(); setPopoverDay(dayKey) }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 text-left pl-1 pt-1 pb-1">
                      + {dayEvents.length - MAX_VISIBLE} más...
                    </button>
                  )}
                </div>

                {isPopoverOpen && (
                  <div ref={popoverRef}
                    className="absolute z-40 top-0 left-0 w-full min-w-[200px] bg-white rounded-xl shadow-2xl border border-slate-200 p-3 max-h-[300px] flex flex-col scale-105 origin-top-left ring-4 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                      <div className="font-bold text-slate-800 text-sm">{dayObj.date} de {monthName}</div>
                      <button className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
                        onClick={(e) => { e.stopPropagation(); setPopoverDay(null) }}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar pr-1">
                      {dayEvents.map((evt, idx) => {
                        const { isBilled, colorClass, dotClass } = cardColors(evt)
                        return (
                          <div key={evt.id || idx}
                            onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(evt) }}
                            onContextMenu={(e) => handleContextMenu(e, evt)}
                            className={`text-xs rounded-md p-2.5 ${colorClass} flex items-start gap-2.5 cursor-pointer hover:shadow-md transition-all border select-none`}>
                            <div className="mt-0.5"><ExpenseAvatar evt={evt} size="w-8 h-8" icon="h-4 w-4" /></div>
                            <div className="flex flex-col min-w-0 flex-1 leading-tight">
                              <div className="flex items-center gap-1 font-bold mb-0.5 truncate text-slate-800">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`}></div>
                                <span className="truncate">{expenseTitle(evt)}</span>
                              </div>
                              <span className="opacity-90 text-slate-600 mb-1">{evt.descripcion}</span>
                              <div className="flex items-center justify-between gap-1 mt-0.5">
                                <span className="opacity-80 font-semibold">{formatMoney(evt.monto)} {evt.moneda}</span>
                                <div className="flex gap-0.5">
                                  <ReimbursementTag evt={evt} />
                                  {isBilled && <BilledBadge />}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <EventContextMenu contextMenu={contextMenu} onClose={() => setContextMenu(initialContextMenuState)} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
