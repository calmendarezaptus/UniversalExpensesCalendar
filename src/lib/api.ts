import type { Expense } from '../types'

// Desarrollo usa el proxy de Vite (mismo origen); producción usa la URL configurada.
export const API_BASE = import.meta.env.DEV
  ? '/api/time-entry'
  : (import.meta.env.VITE_TIME_ENTRY_API_BASE_URL || 'https://timeentryforaptusfinancials-730085095.development.catalystserverless.com/server/time_entry_services').replace(/\/$/, '')

// Slate de captura de gastos (Agregar / Editar).
export const ENTRY_URL = import.meta.env.VITE_EXPENSE_ENTRY_URL || 'https://universal-aptus-expenseentry.onslate.com/'

export function entryUrl(orgId: string, gastoId?: number | null): string {
  const origin = new URL(window.location.href)
  origin.search = ''
  origin.searchParams.set('organization_id', orgId)
  const target = new URL(ENTRY_URL)
  target.searchParams.set('organization_id', orgId)
  if (gastoId != null) target.searchParams.set('gasto_id', String(gastoId))
  target.searchParams.set('origin', origin.toString())
  target.searchParams.set('_t', Date.now().toString())
  return target.toString()
}

export async function fetchExpenses(orgId: string): Promise<Expense[]> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(orgId)}/gastos`)
  if (!response.ok) throw new Error('Error en la respuesta del servidor')
  const data = await response.json().catch(() => null)
  if (!Array.isArray(data)) throw new Error('El listado de gastos tiene un formato inesperado.')
  return data
}

// Resultado del borrado. `gone` = ya no existe en Aptus (borrado ahora o antes).
export type DeleteResult = { ok: true; alreadyGone: boolean } | { ok: false; message: string }

export async function deleteExpense(orgId: string, gastoId: number): Promise<DeleteResult> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/${encodeURIComponent(orgId)}/gastos/${encodeURIComponent(String(gastoId))}`, { method: 'DELETE', signal: AbortSignal.timeout(60000) })
  } catch {
    return { ok: false, message: 'Se perdió la respuesta del servidor. Recarga el listado para comprobar si el gasto se eliminó.' }
  }
  const data = await response.json().catch(() => null)
  if (response.ok) return { ok: true, alreadyGone: false }
  // Solo un 404 en JSON de la API significa "ya no existe". Un 404 en HTML es una ruta no desplegada.
  if (response.status === 404 && data && typeof data.error === 'string' && data.stage) return { ok: true, alreadyGone: true }
  if (response.status === 404 && !data) return { ok: false, message: 'La función de Catalyst no tiene la ruta para eliminar gastos (HTTP 404). Despliega la versión actual de time_entry_services.' }
  return { ok: false, message: data?.error || `No se pudo eliminar el gasto (HTTP ${response.status}).` }
}
