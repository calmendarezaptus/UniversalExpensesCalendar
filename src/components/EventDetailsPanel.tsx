import { useEffect, useState, type ReactNode } from 'react'
import { X, DollarSign, FileText, Calendar, User, Briefcase, Tag, CheckCircle2, Activity, MoreVertical, Edit2, Trash2, FileCheck, Receipt, Wallet, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Expense } from '../types'
import { PAGADO_POR_LABEL, STATUS_LABEL, TIPO_LABEL, isExpenseFacturado } from '../types'

interface EventDetailsPanelProps {
  event: Expense
  onClose?: () => void
  onEdit?: (event: Expense) => void
  onDelete?: (event: Expense) => void
}

export function EventDetailsPanel({ event, onClose, onEdit, onDelete }: EventDetailsPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && onClose) onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('es-MX', { style: 'currency', currency: event.moneda || 'MXN', minimumFractionDigits: 2 }).format(value)
    return event.moneda ? `${formatted} ${event.moneda}` : formatted
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const row = (icon: ReactNode, label: string, value: ReactNode) => (
    <div className="flex">
      <div className="w-8 flex justify-center text-slate-400 shrink-0">{icon}</div>
      <div className="w-28 text-slate-500">{label}</div>
      <div className="font-medium text-slate-800 min-w-0">{value}</div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-slate-900/40 backdrop-blur-sm p-4 transition-all animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl flex flex-col h-full max-h-[calc(100vh-6rem)] overflow-y-auto animate-in slide-in-from-right-8 duration-300 ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-4 flex items-center justify-between relative">
          <div className="relative">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 rounded-full hover:bg-slate-200"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}>
              <MoreVertical className="h-5 w-5" />
            </Button>
            {menuOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  onClick={() => { setMenuOpen(false); if (onEdit) onEdit(event) }}>
                  <Edit2 className="h-4 w-4" />
                  Editar
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  onClick={() => { setMenuOpen(false); if (onDelete) onDelete(event) }}>
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 rounded-full hover:bg-slate-200" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">{event.cliente_nombre || 'Sin cliente'}</h3>
            <p className="text-sm text-slate-500">{event.proyecto_nombre || 'Sin proyecto'}</p>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-4 flex flex-col gap-3 border border-slate-100">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-slate-600"><DollarSign className="h-4 w-4 text-purple-600" /><span>Monto:</span></div>
              <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">{formatCurrency(event.monto || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                {event.tipo === 'reembolso' ? <RotateCcw className="h-4 w-4 text-amber-600" /> : <Receipt className="h-4 w-4 text-blue-600" />}
                <span>Tipo:</span>
              </div>
              <span className={`font-semibold px-2 py-0.5 rounded ${event.tipo === 'reembolso' ? 'text-amber-700 bg-amber-50' : 'text-blue-700 bg-blue-100'}`}>
                {TIPO_LABEL[event.tipo] || event.tipo} · {event.tipo === 'reembolso' ? 'sin IVA' : 'con IVA'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-slate-600"><Wallet className="h-4 w-4 text-green-600" /><span>Cobro al cliente:</span></div>
              <span className={`font-semibold px-2 py-0.5 rounded ${event.facturable ? 'text-green-700 bg-green-100' : 'text-slate-700 bg-slate-200'}`}>
                {event.facturable ? 'Facturable' : 'No facturable'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className={`h-4 w-4 ${event.liberado ? 'text-green-500' : 'text-slate-400'}`} /><span>Liberado:</span>
              </div>
              <span className={`font-semibold px-2 py-0.5 rounded ${event.liberado ? 'text-green-700 bg-green-100' : 'text-slate-700 bg-slate-200'}`}>{event.liberado ? 'Sí' : 'No'}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2 font-bold text-slate-800"><FileText className="h-4 w-4" /><span>Descripción</span></div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-600 leading-relaxed max-h-32 overflow-y-auto">{event.descripcion || 'Sin descripción'}</div>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            {row(<Calendar className="h-4 w-4" />, 'Fecha', formatDate(event.fecha))}
            {row(<Tag className="h-4 w-4" />, 'Categoría', `${event.categoria_nombre || 'Sin categoría'}${event.categoria_codigo_utbms ? ` (${event.categoria_codigo_utbms})` : ''}`)}
            {row(<Wallet className="h-4 w-4" />, 'Pagado por', PAGADO_POR_LABEL[event.pagado_por] || event.pagado_por)}
            {row(<User className="h-4 w-4 mt-0.5" />, 'Abogado', event.abogado_nombre ? (
              <span className="flex items-center gap-2">
                {event.abogado_foto_url ? (
                  <img src={event.abogado_foto_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0 border border-brand-200">{event.abogado_nombre.charAt(0).toUpperCase()}</span>
                )}
                <span>{event.abogado_nombre}</span>
              </span>
            ) : '-')}
            {event.reembolso_estado && row(<RotateCcw className="h-4 w-4" />, 'Reembolso', event.reembolso_estado === 'reembolsado' ? `Reembolsado${event.reembolsado_en ? ` (${event.reembolsado_en})` : ''}` : 'Pendiente al abogado')}
            {row(<Briefcase className="h-4 w-4" />, 'Proyecto', event.proyecto_zoho_nombre || event.proyecto_nombre || '-')}
            {row(<Activity className="h-4 w-4" />, 'Status', `${STATUS_LABEL[event.status] || event.status}${event.prebill_id ? ` · Prebill #${event.prebill_id}` : ''}`)}
            {row(<Tag className="h-4 w-4" />, 'Facturado', isExpenseFacturado(event) ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <FileCheck className="h-3 w-3 text-emerald-600" />Sí (Facturado)
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">No</span>
            ))}
          </div>
          <div className="flex-1"></div>
        </div>
      </div>
    </div>
  )
}
