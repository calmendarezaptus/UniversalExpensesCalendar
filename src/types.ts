// Gasto tal como lo devuelve ReportesSandbox (GET /gastos) a través de la función de Catalyst.
export type ExpenseTipo = 'gasto' | 'reembolso'
export type PagadoPor = 'despacho' | 'caja_chica' | 'abogado'
export type ExpenseStatus = 'capturado' | 'liberado' | 'en_prebill' | 'facturado' | 'no_facturable'

export interface Expense {
  id: number
  proyecto_id: number
  fecha: string
  monto: number
  moneda: string
  descripcion: string | null
  liberado: number
  prebill_id: number | null
  facturado: number
  creado_en: string
  categoria_id: number | null
  categoria_nombre: string | null
  categoria_codigo_utbms: string | null
  facturable: number
  tipo: ExpenseTipo
  pagado_por: PagadoPor
  abogado_id: number | null
  abogado_nombre: string | null
  abogado_zoho_user_id: string | null
  abogado_foto_url?: string
  reembolso_estado: 'pendiente' | 'reembolsado' | null
  reembolsado_en: string | null
  proyecto_nombre: string
  cliente_id: string
  cliente_nombre: string
  proyecto_zoho_id: string | null
  proyecto_zoho_nombre: string | null
  proyecto_zoho_codigo: string | null
  zoho_id: null
  status: ExpenseStatus | string
  cliente_zoho_id: string
}

export const STATUS_LABEL: Record<string, string> = {
  capturado: 'Capturado',
  liberado: 'Liberado',
  en_prebill: 'En Prebill',
  facturado: 'Facturado',
  no_facturable: 'No facturable',
}

export const TIPO_LABEL: Record<ExpenseTipo, string> = { gasto: 'Gasto', reembolso: 'Reembolso' }
export const PAGADO_POR_LABEL: Record<PagadoPor, string> = { despacho: 'Despacho', caja_chica: 'Caja chica', abogado: 'Abogado' }

export function isExpenseFacturado(evt?: Partial<Expense> | null): boolean {
  if (!evt) return false
  const statusStr = evt.status?.toString().trim().toLowerCase()
  return statusStr === 'facturado' || evt.facturado === 1
}

// Mismo candado que la API (409): facturado o dentro de una Prebill.
export function expenseLockReason(evt: Pick<Expense, 'facturado' | 'prebill_id' | 'status'>): string | null {
  if (evt.facturado === 1 || evt.status === 'facturado') return 'Este gasto ya está facturado y no puede modificarse ni eliminarse.'
  if (evt.prebill_id != null || evt.status === 'en_prebill') return `Este gasto está en la Prebill #${evt.prebill_id}. Quítalo de la Prebill antes de modificarlo o eliminarlo.`
  return null
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'facturado': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'en_prebill': return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'liberado': return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'no_facturable': return 'bg-amber-50 text-amber-700 border-amber-200'
    default: return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

// Totales por moneda: número de gastos y monto.
export function totalsByCurrency(events: Expense[]): Record<string, { count: number; monto: number }> {
  return events.reduce((acc, evt) => {
    const currency = evt.moneda || 'MXN'
    if (!acc[currency]) acc[currency] = { count: 0, monto: 0 }
    acc[currency].count += 1
    acc[currency].monto += evt.monto || 0
    return acc
  }, {} as Record<string, { count: number; monto: number }>)
}

export const formatMoney = (val: number) => `$${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`
