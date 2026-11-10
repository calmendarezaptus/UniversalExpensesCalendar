import React, { useState, useMemo, useEffect } from 'react'
import type { Expense } from '../types'
import { STATUS_LABEL, TIPO_LABEL, PAGADO_POR_LABEL, formatMoney, statusBadgeClass, totalsByCurrency } from '../types'
import { ArrowUp, ArrowDown, Calendar, Search, Filter, X, LayoutGrid, ChevronDown, ChevronRight, Download, FileText, FileCheck, MoreVertical, Edit2, Trash2, Receipt, RotateCcw } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

type SortDirection = 'asc' | 'desc'
type SortConfig = { key: keyof Expense | null, direction: SortDirection }

interface ExpenseListProps {
  events: Expense[]
  orgId?: string | null
  onEventClick?: (event: Expense) => void
  onEdit?: (event: Expense) => void
  onDelete?: (event: Expense) => void
}

// Colores de la marca Turquesa para el PDF (brand-600 / brand-50 / brand-900).
const PDF_HEAD: [number, number, number] = [13, 148, 136]
const PDF_GROUP_BG: [number, number, number] = [240, 253, 250]
const PDF_GROUP_TEXT: [number, number, number] = [19, 78, 74]

const statusText = (evt: Expense) => STATUS_LABEL[evt.status] || evt.status

function useStored<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : initial } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* sin almacenamiento */ } }, [key, value])
  return [value, setValue]
}

export function ExpenseList({ events, orgId, onEventClick, onEdit, onDelete }: ExpenseListProps) {
  const id = orgId || new URLSearchParams(window.location.search).get('organization_id')
  const storageKey = (suffix: string) => id ? `aptus_expenselist_${suffix}_${id}` : `aptus_expenselist_${suffix}`

  const [sortConfig, setSortConfig] = useStored<SortConfig>(storageKey('sort'), { key: 'fecha', direction: 'desc' })
  const [dateRange, setDateRange] = useStored<{ start: string; end: string }>(storageKey('daterange'), { start: '', end: '' })
  const [abogadoFilters, setAbogadoFilters] = useStored<string[]>(storageKey('abogados'), [])
  const [descFilter, setDescFilter] = useStored<string>(storageKey('desc'), '')
  const [statusFilter, setStatusFilter] = useStored<string>(storageKey('status'), 'all')
  const [tipoFilter, setTipoFilter] = useStored<string>(storageKey('tipo'), 'all')
  const [groupBy, setGroupBy] = useStored<keyof Expense | null>(storageKey('groupby'), null)
  const [abogadoSearchText, setAbogadoSearchText] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; event: Expense | null }>({ isOpen: false, x: 0, y: 0, event: null })

  useEffect(() => {
    if (!contextMenu.isOpen) return
    const closeMenu = () => setContextMenu(prev => ({ ...prev, isOpen: false }))
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu() }
    window.addEventListener('click', closeMenu)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', closeMenu, true)
    window.addEventListener('resize', closeMenu)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', closeMenu, true)
      window.removeEventListener('resize', closeMenu)
    }
  }, [contextMenu.isOpen])

  const openMenuAt = (x: number, y: number, evt: Expense) => {
    const menuWidth = 160, menuHeight = 90
    setContextMenu({ isOpen: true, x: Math.max(10, Math.min(x, window.innerWidth - menuWidth - 10)), y: Math.max(10, Math.min(y, window.innerHeight - menuHeight - 10)), event: evt })
  }
  const handleRowContextMenu = (e: React.MouseEvent, evt: Expense) => { e.preventDefault(); e.stopPropagation(); openMenuAt(e.clientX, e.clientY, evt) }
  const handleDotsClick = (e: React.MouseEvent, evt: Expense) => {
    e.preventDefault(); e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    openMenuAt(rect.right + 4, rect.bottom + 4, evt)
  }

  const handleSort = (key: keyof Expense) => {
    setSortConfig(prev => prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' })
  }

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => { const next = new Set(prev); if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey); return next })
  }

  const groupLabel = (evt: Expense, key: keyof Expense): string => {
    if (key === 'status') return statusText(evt)
    if (key === 'tipo') return TIPO_LABEL[evt.tipo] || evt.tipo
    if (key === 'pagado_por') return PAGADO_POR_LABEL[evt.pagado_por] || evt.pagado_por
    if (key === 'categoria_nombre') return evt.categoria_nombre || 'Sin categoría'
    if (key === 'abogado_nombre') return evt.abogado_nombre || 'Sin abogado'
    return String(evt[key] ?? 'Desconocido')
  }

  const { processedEvents, groupedEvents } = useMemo(() => {
    let result = events.filter(evt => {
      if (dateRange.start && evt.fecha < dateRange.start) return false
      if (dateRange.end && evt.fecha > dateRange.end) return false
      if (abogadoFilters.length > 0 && !abogadoFilters.some(f => (evt.abogado_nombre || '').toLowerCase().includes(f.toLowerCase()))) return false
      if (descFilter && !(evt.descripcion || '').toLowerCase().includes(descFilter.toLowerCase())) return false
      if (statusFilter !== 'all' && evt.status !== statusFilter) return false
      if (tipoFilter !== 'all' && evt.tipo !== tipoFilter) return false
      return true
    })

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const valA = a[sortConfig.key as keyof Expense]
        const valB = b[sortConfig.key as keyof Expense]
        if (valA === valB) return 0
        if (valA === null || valA === undefined) return sortConfig.direction === 'asc' ? -1 : 1
        if (valB === null || valB === undefined) return sortConfig.direction === 'asc' ? 1 : -1
        const aVal = typeof valA === 'string' ? valA.toLowerCase() : valA
        const bVal = typeof valB === 'string' ? valB.toLowerCase() : valB
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    let grouped: Record<string, { items: Expense[]; totalMonto: number }> | null = null
    if (groupBy) {
      grouped = result.reduce((acc, evt) => {
        const groupName = groupLabel(evt, groupBy)
        if (!acc[groupName]) acc[groupName] = { items: [], totalMonto: 0 }
        acc[groupName].items.push(evt)
        acc[groupName].totalMonto += evt.monto || 0
        return acc
      }, {} as Record<string, { items: Expense[]; totalMonto: number }>)
    }
    return { processedEvents: result, groupedEvents: grouped }
  }, [events, sortConfig, dateRange, abogadoFilters, descFilter, statusFilter, tipoFilter, groupBy])

  const renderSortIcon = (key: keyof Expense) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-brand-600" /> : <ArrowDown className="h-3 w-3 ml-1 text-brand-600" />
  }

  const renderGroupOption = (key: keyof Expense) => (
    <div className="mt-4 pt-3 border-t border-slate-100">
      <Button variant="secondary" size="sm" className="w-full text-xs flex items-center justify-center gap-2" onClick={() => setGroupBy(key)}>
        <LayoutGrid className="h-3 w-3" />
        Agrupar por esta columna
      </Button>
    </div>
  )

  const renderTh = ({ label, sortKey, filterIcon, filterPopover, onPopoverOpenChange, align = 'left' }: {
    label: string; sortKey?: keyof Expense; filterIcon?: React.ReactNode; filterPopover?: React.ReactNode
    onPopoverOpenChange?: (open: boolean) => void; align?: 'left' | 'right' | 'center'
  }) => (
    <th className={`px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <div className={`flex items-center select-none ${sortKey ? 'cursor-pointer hover:text-brand-600 transition-colors' : ''} ${sortConfig.key === sortKey ? 'text-brand-700' : ''}`}
          onClick={() => sortKey && handleSort(sortKey)}>
          {label}
          {sortKey && renderSortIcon(sortKey)}
        </div>
        {filterIcon && filterPopover && (
          <Popover onOpenChange={onPopoverOpenChange}>
            <PopoverTrigger className="p-1 rounded-sm hover:bg-slate-200 transition-colors ml-1 focus:outline-none flex items-center justify-center">
              {filterIcon}
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 shadow-xl bg-white border border-slate-200 rounded-xl z-50" align="start">
              {filterPopover}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </th>
  )

  const renderRow = (evt: Expense, idx: number, isSubRow = false) => {
    const isBilled = evt.status === 'facturado' || evt.facturado === 1
    return (
      <tr key={evt.id || idx}
        onClick={() => onEventClick && onEventClick(evt)}
        onContextMenu={(e) => handleRowContextMenu(e, evt)}
        className={`hover:bg-slate-50/80 cursor-pointer transition-colors group ${isSubRow ? 'bg-slate-50/30' : 'bg-white'} ${isBilled ? 'border-l-[3px] border-l-emerald-500' : 'border-l-[3px] border-l-transparent'}`}>
        <td className="w-10 px-2 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={(e) => handleDotsClick(e, evt)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none" title="Opciones">
            <MoreVertical className="h-4 w-4" />
          </button>
        </td>
        <td className={`px-4 py-3 whitespace-nowrap text-slate-600 font-medium ${isSubRow ? 'pl-6 border-l-[3px] border-l-brand-200' : ''}`}>{evt.fecha}</td>
        <td className="px-4 py-3 text-slate-700 truncate max-w-[160px]" title={evt.categoria_nombre || ''}>{evt.categoria_nombre || <span className="text-slate-400">Sin categoría</span>}</td>
        <td className="px-4 py-3 whitespace-nowrap text-slate-800 font-medium">
          {evt.abogado_nombre ? (
            <div className="flex items-center gap-2">
              {evt.abogado_foto_url ? (
                <img src={evt.abogado_foto_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0 border border-brand-200">{evt.abogado_nombre.charAt(0).toUpperCase()}</div>
              )}
              <span>{evt.abogado_nombre}</span>
            </div>
          ) : <span className="text-slate-400 font-normal">—</span>}
        </td>
        <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]" title={evt.cliente_nombre}>{evt.cliente_nombre}</td>
        <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]" title={evt.proyecto_nombre}>{evt.proyecto_nombre}</td>
        <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={evt.descripcion || ''}>{evt.descripcion}</td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${evt.tipo === 'reembolso' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            {evt.tipo === 'reembolso' ? <RotateCcw className="h-3 w-3" /> : <Receipt className="h-3 w-3" />}
            {TIPO_LABEL[evt.tipo] || evt.tipo}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-center text-slate-600 font-medium text-xs">{evt.moneda || 'MXN'}</td>
        <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-slate-700">{formatMoney(evt.monto || 0)}</td>
        <td className="px-4 py-3 whitespace-nowrap text-center">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${statusBadgeClass(evt.status)}`}>
            {isBilled && <FileCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
            <span>{statusText(evt)}</span>
          </span>
        </td>
      </tr>
    )
  }

  const activeFiltersCount = (dateRange.start ? 1 : 0) + (dateRange.end ? 1 : 0) + abogadoFilters.length + (descFilter ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (tipoFilter !== 'all' ? 1 : 0)
  const isGrouped = !!groupBy
  const totals = useMemo(() => totalsByCurrency(processedEvents), [processedEvents])

  const mapGroupKeyToLabel = (key: string) => ({
    fecha: 'Fecha', categoria_nombre: 'Categoría', abogado_nombre: 'Abogado', cliente_nombre: 'Cliente',
    proyecto_nombre: 'Proyecto', tipo: 'Tipo', status: 'Estado', moneda: 'Moneda', pagado_por: 'Pagado por',
  } as Record<string, string>)[key] || key

  const HEADERS = ['Fecha', 'Categoría', 'Abogado', 'Cliente', 'Proyecto', 'Descripción', 'Tipo', 'Pagado por', 'Moneda', 'Monto', 'Estado']
  const rowValues = (evt: Expense) => [
    evt.fecha, evt.categoria_nombre || '', evt.abogado_nombre || '', evt.cliente_nombre, evt.proyecto_nombre, evt.descripcion || '',
    TIPO_LABEL[evt.tipo] || evt.tipo, PAGADO_POR_LABEL[evt.pagado_por] || evt.pagado_por, evt.moneda || 'MXN',
  ]

  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,﻿'
    const escapeCSV = (val: string | number | undefined | null) => `"${String(val ?? '').replace(/"/g, '""')}"`
    csvContent += HEADERS.join(',') + '\r\n'
    const pushRow = (evt: Expense) => { csvContent += [...rowValues(evt), evt.monto || 0, statusText(evt)].map(escapeCSV).join(',') + '\r\n' }
    if (isGrouped && groupedEvents) {
      Object.entries(groupedEvents).forEach(([groupName, groupData]) => {
        csvContent += [`[GRUPO] ${mapGroupKeyToLabel(groupBy as string)}: ${groupName}`, '', '', '', '', '', '', '', '', groupData.totalMonto.toFixed(2), ''].map(escapeCSV).join(',') + '\r\n'
        groupData.items.forEach(pushRow)
      })
    } else processedEvents.forEach(pushRow)
    if (processedEvents.length > 0) {
      csvContent += '\r\n'
      Object.entries(totals).forEach(([currency, t]) => {
        csvContent += [`TOTAL (${currency}): ${t.count} gastos`, '', '', '', '', '', '', '', currency, t.monto.toFixed(2), ''].map(escapeCSV).join(',') + '\r\n'
      })
    }
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `reporte_gastos_${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const doc = new jsPDF('landscape')
    const body: any[] = []
    const pushRow = (evt: Expense) => body.push([...rowValues(evt), formatMoney(evt.monto || 0), statusText(evt)])
    if (isGrouped && groupedEvents) {
      Object.entries(groupedEvents).forEach(([groupName, groupData]) => {
        body.push([
          { content: `[GRUPO] ${mapGroupKeyToLabel(groupBy as string)}: ${groupName}`, colSpan: 9, styles: { fillColor: PDF_GROUP_BG, fontStyle: 'bold', textColor: PDF_GROUP_TEXT } },
          { content: formatMoney(groupData.totalMonto), styles: { fillColor: PDF_GROUP_BG, fontStyle: 'bold', halign: 'right', textColor: PDF_GROUP_TEXT } },
          { content: '', styles: { fillColor: PDF_GROUP_BG } },
        ])
        groupData.items.forEach(pushRow)
      })
    } else processedEvents.forEach(pushRow)
    const foot: any[] = Object.entries(totals).map(([currency, t]) => [
      { content: `TOTAL (${currency}) · ${t.count} gastos:`, colSpan: 8, styles: { halign: 'right', fontStyle: 'bold', textColor: PDF_GROUP_TEXT } },
      { content: currency, styles: { halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] } },
      { content: formatMoney(t.monto), styles: { halign: 'right', fontStyle: 'bold', textColor: PDF_GROUP_TEXT } },
      { content: '', styles: {} },
    ])
    autoTable(doc, {
      head: [HEADERS], body, foot: foot.length > 0 ? foot : undefined, showFoot: 'lastPage',
      headStyles: { fillColor: PDF_HEAD },
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8 }, theme: 'grid',
    })
    doc.save(`reporte_gastos_${new Date().getTime()}.pdf`)
  }

  const chip = (key: string, text: string, onRemove: () => void) => (
    <span key={key} className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full text-xs font-medium border border-brand-100 shadow-sm">
      {text}
      <button onClick={onRemove} className="hover:bg-brand-200 rounded-full p-0.5 ml-1 transition-colors"><X className="h-3 w-3" /></button>
    </span>
  )

  const clearAll = () => {
    setDateRange({ start: '', end: '' }); setAbogadoFilters([]); setAbogadoSearchText(''); setDescFilter('')
    setStatusFilter('all'); setTipoFilter('all'); setGroupBy(null)
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 p-2 sm:p-4 min-w-[800px] h-full overflow-hidden">
      <div className="flex justify-end gap-2 mb-2">
        <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm">
          <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Exportar CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportToPDF} className="h-8 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm">
          <FileText className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Exportar PDF
        </Button>
      </div>

      {(activeFiltersCount > 0 || isGrouped) && (
        <div className="mb-3 flex items-center justify-between text-sm text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200/60 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-brand-500 shrink-0" />
            <span className="font-medium mr-2 shrink-0">({processedEvents.length}) resultados:</span>
            {groupBy && (
              <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium border border-amber-200 shadow-sm">
                <LayoutGrid className="h-3 w-3 mr-0.5" />
                Agrupado por: {mapGroupKeyToLabel(groupBy as string)}
                <button onClick={() => setGroupBy(null)} className="hover:bg-amber-200 rounded-full p-0.5 ml-1 transition-colors"><X className="h-3 w-3" /></button>
              </span>
            )}
            {(dateRange.start || dateRange.end) && chip('fechas', `Fechas: ${dateRange.start || '...'} a ${dateRange.end || '...'}`, () => setDateRange({ start: '', end: '' }))}
            {abogadoFilters.map((filter, idx) => chip(`abog-${idx}`, `Abogado: ${filter}`, () => setAbogadoFilters(prev => prev.filter((_, i) => i !== idx))))}
            {descFilter && chip('desc', `Desc: ${descFilter}`, () => setDescFilter(''))}
            {tipoFilter !== 'all' && chip('tipo', `Tipo: ${TIPO_LABEL[tipoFilter as 'gasto'] || tipoFilter}`, () => setTipoFilter('all'))}
            {statusFilter !== 'all' && chip('status', `Estado: ${STATUS_LABEL[statusFilter] || statusFilter}`, () => setStatusFilter('all'))}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs hover:text-red-600 hover:bg-red-50 shrink-0 ml-4" onClick={clearAll}>Limpiar todo</Button>
        </div>
      )}

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col relative">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur z-10 shadow-sm border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-2 py-3 text-center"><span className="sr-only">Acciones</span></th>
                {renderTh({
                  label: 'Fecha', sortKey: 'fecha',
                  filterIcon: <Calendar className={`h-3 w-3 ${(dateRange.start || dateRange.end) || groupBy === 'fecha' ? 'text-brand-600' : 'text-slate-400'}`} />,
                  filterPopover: (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Filtrar por Rango de Fecha</h4>
                      <div className="grid gap-2 text-sm">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">Desde</label>
                          <Input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="h-8" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">Hasta</label>
                          <Input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="h-8" />
                        </div>
                        {(dateRange.start || dateRange.end) && (
                          <Button variant="ghost" size="sm" onClick={() => setDateRange({ start: '', end: '' })} className="h-8 mt-1 text-xs text-red-600 hover:bg-red-50">Limpiar fechas</Button>
                        )}
                      </div>
                      {renderGroupOption('fecha')}
                    </div>
                  ),
                })}
                {renderTh({
                  label: 'Categoría', sortKey: 'categoria_nombre',
                  filterIcon: <LayoutGrid className={`h-3 w-3 ${groupBy === 'categoria_nombre' ? 'text-brand-600' : 'text-slate-400'}`} />,
                  filterPopover: (<div className="space-y-2"><h4 className="font-medium text-sm">Opciones de Categoría</h4>{renderGroupOption('categoria_nombre')}</div>),
                })}
                {renderTh({
                  label: 'Abogado', sortKey: 'abogado_nombre',
                  filterIcon: <Search className={`h-3 w-3 ${abogadoFilters.length > 0 || groupBy === 'abogado_nombre' ? 'text-brand-600' : 'text-slate-400'}`} />,
                  onPopoverOpenChange: (open) => {
                    if (!open) {
                      if (abogadoSearchText.trim()) setAbogadoFilters(prev => [...prev, abogadoSearchText.trim()])
                      setAbogadoSearchText('')
                    }
                  },
                  filterPopover: (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Buscar Abogado</h4>
                      <div className="flex flex-col gap-2">
                        <Input placeholder="Nombre y presiona Enter..." value={abogadoSearchText} onChange={e => setAbogadoSearchText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && abogadoSearchText.trim()) { setAbogadoFilters(prev => [...prev, abogadoSearchText.trim()]); setAbogadoSearchText('') }
                          }}
                          className="h-8" autoFocus />
                        <div className="flex flex-wrap gap-1 mt-1">
                          {abogadoFilters.map((filter, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs border border-slate-200 font-medium">
                              {filter}
                              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setAbogadoFilters(prev => prev.filter((_, i) => i !== idx))} />
                            </span>
                          ))}
                        </div>
                      </div>
                      {renderGroupOption('abogado_nombre')}
                    </div>
                  ),
                })}
                {renderTh({
                  label: 'Cliente', sortKey: 'cliente_nombre',
                  filterIcon: <LayoutGrid className={`h-3 w-3 ${groupBy === 'cliente_nombre' ? 'text-brand-600' : 'text-slate-400'}`} />,
                  filterPopover: (<div className="space-y-2"><h4 className="font-medium text-sm">Opciones de Cliente</h4>{renderGroupOption('cliente_nombre')}</div>),
                })}
                {renderTh({
                  label: 'Proyecto', sortKey: 'proyecto_nombre',
                  filterIcon: <LayoutGrid className={`h-3 w-3 ${groupBy === 'proyecto_nombre' ? 'text-brand-600' : 'text-slate-400'}`} />,
                  filterPopover: (<div className="space-y-2"><h4 className="font-medium text-sm">Opciones de Proyecto</h4>{renderGroupOption('proyecto_nombre')}</div>),
                })}
                {renderTh({
                  label: 'Descripción',
                  filterIcon: <Search className={`h-3 w-3 ${descFilter ? 'text-brand-600' : 'text-slate-400'}`} />,
                  filterPopover: (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Buscar en Descripción</h4>
                      <div className="flex gap-2">
                        <Input placeholder="Palabras clave..." value={descFilter} onChange={e => setDescFilter(e.target.value)} className="h-8" autoFocus />
                        {descFilter && (
                          <Button variant="ghost" size="icon" onClick={() => setDescFilter('')} className="h-8 w-8 shrink-0 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </div>
                  ),
                })}
                {renderTh({
                  label: 'Tipo', sortKey: 'tipo', align: 'center',
                  filterIcon: <Filter className={`h-3 w-3 ${tipoFilter !== 'all' || groupBy === 'tipo' ? 'text-brand-600' : 'text-slate-400'}`} />,
                  filterPopover: (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Tipo de cargo</h4>
                      <Select value={tipoFilter} onValueChange={(val) => setTipoFilter(val || 'all')}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="gasto">Gasto (con IVA)</SelectItem>
                          <SelectItem value="reembolso">Reembolso (sin IVA)</SelectItem>
                        </SelectContent>
                      </Select>
                      {renderGroupOption('tipo')}
                      {renderGroupOption('pagado_por')}
                    </div>
                  ),
                })}
                {renderTh({
                  label: 'Moneda', sortKey: 'moneda', align: 'center',
                  filterIcon: <LayoutGrid className={`h-3 w-3 ${groupBy === 'moneda' ? 'text-brand-600' : 'text-slate-400'}`} />,
                  filterPopover: (<div className="space-y-2"><h4 className="font-medium text-sm">Opciones de Moneda</h4>{renderGroupOption('moneda')}</div>),
                })}
                {renderTh({ label: 'Monto', sortKey: 'monto', align: 'right' })}
                {renderTh({
                  label: 'Estado', sortKey: 'status', align: 'center',
                  filterIcon: <Filter className={`h-3 w-3 ${statusFilter !== 'all' || groupBy === 'status' ? 'text-brand-600' : 'text-slate-400'}`} />,
                  filterPopover: (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Estado del gasto</h4>
                      <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                          <SelectItem value="all">Todos</SelectItem>
                          {Object.entries(STATUS_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {renderGroupOption('status')}
                    </div>
                  ),
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {processedEvents.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">No se encontraron registros que coincidan con los filtros.</td></tr>
              ) : isGrouped && groupedEvents ? (
                Object.entries(groupedEvents).map(([groupName, groupData]) => {
                  const isCollapsed = collapsedGroups.has(groupName)
                  return (
                    <React.Fragment key={`group-${groupName}`}>
                      <tr className="bg-brand-50/60 border-y border-brand-100 cursor-pointer hover:bg-brand-100/60 transition-colors" onClick={() => toggleGroup(groupName)}>
                        <td colSpan={8} className="px-4 py-3 font-semibold text-brand-900">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? <ChevronRight className="h-4 w-4 text-brand-500" /> : <ChevronDown className="h-4 w-4 text-brand-500" />}
                            {groupName}
                            <span className="text-xs text-brand-500 font-normal ml-1">({groupData.items.length} {groupData.items.length === 1 ? 'registro' : 'registros'})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right font-bold text-brand-900">{formatMoney(groupData.totalMonto)}</td>
                        <td className="px-4 py-3"></td>
                      </tr>
                      {!isCollapsed && groupData.items.map((evt, idx) => renderRow(evt, idx, true))}
                    </React.Fragment>
                  )
                })
              ) : (
                processedEvents.map((evt, idx) => renderRow(evt, idx, false))
              )}
            </tbody>

            {processedEvents.length > 0 && (
              <tfoot className="sticky bottom-0 bg-slate-50/95 backdrop-blur border-t-2 border-brand-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                {Object.entries(totals).map(([currency, t]) => (
                  <tr key={currency} className="border-b border-slate-200/50 last:border-0">
                    <td colSpan={8} className="px-4 py-3 text-right font-bold text-slate-600 uppercase tracking-wider text-xs">
                      Total ({currency}) · <span className="text-brand-700">{t.count} {t.count === 1 ? 'gasto' : 'gastos'}</span>:
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-500 text-xs">{currency}</td>
                    <td className="px-4 py-3 text-right font-black text-brand-700 text-[15px]">{formatMoney(t.monto)}</td>
                    <td></td>
                  </tr>
                ))}
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {contextMenu.isOpen && contextMenu.event && (
        <div className="fixed z-50 min-w-[150px] bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-xs font-medium"
          style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2.5 transition-colors"
            onClick={() => { const evt = contextMenu.event!; setContextMenu(prev => ({ ...prev, isOpen: false })); if (onEdit) onEdit(evt) }}>
            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
            <span>Editar</span>
          </button>
          <div className="h-px bg-slate-100 my-1" />
          <button type="button" className="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
            onClick={() => { const evt = contextMenu.event!; setContextMenu(prev => ({ ...prev, isOpen: false })); if (onDelete) onDelete(evt) }}>
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
            <span>Eliminar</span>
          </button>
        </div>
      )}
    </div>
  )
}
