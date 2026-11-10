import { FileCheck, Receipt, RotateCcw } from 'lucide-react'
import type { Expense } from '../types'
import { isExpenseFacturado } from '../types'

// Piezas comunes de las tarjetas de gasto (mismo estilo que las tarjetas de tiempo).
export function ExpenseAvatar({ evt, size = 'w-6 h-6', icon = 'h-3 w-3' }: { evt: Expense; size?: string; icon?: string }) {
  if (evt.abogado_foto_url) {
    return <img src={evt.abogado_foto_url} alt="" className={`${size} rounded-full object-cover shrink-0 border border-black/5 shadow-sm`} />
  }
  return (
    <div className={`${size} rounded-full bg-black/10 flex items-center justify-center shrink-0 shadow-sm`} title={evt.abogado_nombre || undefined}>
      <Receipt className={`${icon} opacity-70`} />
    </div>
  )
}

export function cardColors(evt: Expense) {
  const isBilled = isExpenseFacturado(evt)
  return {
    isBilled,
    colorClass: isBilled
      ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80 hover:border-emerald-300'
      : 'bg-blue-50/90 text-blue-800 border-blue-200/80 hover:border-blue-300',
    dotClass: isBilled ? 'bg-emerald-500' : 'bg-blue-500',
  }
}

export function BilledBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span title="Gasto relacionado a una factura"
      className={size === 'sm'
        ? 'inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-100/90 border border-emerald-300/60 rounded px-1 py-0.5 leading-none shrink-0'
        : 'inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300/60 rounded-md px-2 py-0.5 leading-none'}>
      <FileCheck className={size === 'sm' ? 'h-2.5 w-2.5 text-emerald-600' : 'h-3 w-3 text-emerald-600'} />
      <span>Facturado</span>
    </span>
  )
}

export function ReimbursementTag({ evt }: { evt: Expense }) {
  if (evt.tipo !== 'reembolso') return null
  return (
    <span title="Reembolso: sin IVA" className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 leading-none shrink-0">
      <RotateCcw className="h-2.5 w-2.5" />
      <span>Reemb.</span>
    </span>
  )
}

export const expenseTitle = (evt: Expense) => evt.categoria_nombre || 'Gasto sin categoría'

// Colores por moneda para los totales del día (iguales a los del calendario de tiempos).
export const getCurrencyColor = (currency: string, isCount: boolean) => {
  const c = currency.toUpperCase()
  if (c === 'USD') return isCount ? 'bg-emerald-700 border-emerald-600' : 'bg-emerald-600 border-emerald-500'
  if (c === 'EUR') return isCount ? 'bg-violet-700 border-violet-600' : 'bg-violet-600 border-violet-500'
  if (c === 'MXN') return isCount ? 'bg-brand-700 border-brand-600' : 'bg-brand-600 border-brand-500'
  return isCount ? 'bg-amber-700 border-amber-600' : 'bg-amber-600 border-amber-500'
}

export const getSoftCurrencyColor = (currency: string, isCount: boolean) => {
  const c = currency.toUpperCase()
  if (c === 'USD') return isCount ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
  if (c === 'EUR') return isCount ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-violet-50 text-violet-600 border-violet-100'
  if (c === 'MXN') return isCount ? 'bg-brand-100 text-brand-700 border-brand-200' : 'bg-brand-50 text-brand-600 border-brand-100'
  return isCount ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-50 text-amber-600 border-amber-100'
}

// Barra oscura de totales (mes/semana/día), igual a la del calendario de tiempos.
export function TotalsBar({ totals }: { totals: Record<string, { count: number; monto: number }> }) {
  const entries = Object.entries(totals)
  if (!entries.length) return null
  return (
    <div className="flex items-center gap-4 bg-slate-800 px-4 py-2 rounded-xl shadow-md border border-slate-700 overflow-x-auto custom-scrollbar">
      {entries.map(([currency, t], idx) => (
        <div key={currency} className="flex items-center gap-4 shrink-0">
          {idx > 0 && <div className="w-px h-8 bg-slate-600 mx-2 shrink-0"></div>}
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Gastos ({currency})</span>
            <span className="text-base font-black text-white leading-tight">{t.count}</span>
          </div>
          <div className="w-px h-6 bg-slate-600/50"></div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-brand-200 font-bold uppercase tracking-wider">Monto ({currency})</span>
            <span className="text-base font-black text-white leading-tight">{`$${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.monto)}`}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
