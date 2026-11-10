import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const toModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText).toString('base64')
const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8')
const types = await import(toModule(read('../src/types.ts')))
const api = await import(toModule(read('../src/lib/api.ts')
  .replace('import.meta.env.DEV', 'true')
  .replace('import.meta.env.VITE_TIME_ENTRY_API_BASE_URL', 'undefined')
  .replace('import.meta.env.VITE_EXPENSE_ENTRY_URL', 'undefined')))

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => { if (body === undefined) throw new Error('html'); return body } })

test('borrar: éxito y "ya no existe" (404 JSON de la API) quitan el gasto', async () => {
  let call
  globalThis.fetch = async (url, options) => { call = { url, options }; return json(200, { ok: true }) }
  assert.deepEqual(await api.deleteExpense('636939444', 31), { ok: true, alreadyGone: false })
  assert.equal(call.url, '/api/time-entry/636939444/gastos/31'); assert.equal(call.options.method, 'DELETE')
  globalThis.fetch = async () => json(404, { error: 'Gasto no encontrado', stage: 'delete_gasto', outcome_unknown: false })
  assert.deepEqual(await api.deleteExpense('1', 31), { ok: true, alreadyGone: true })
})

test('borrar: 404 sin JSON (ruta no desplegada) NO se toma como borrado', async () => {
  globalThis.fetch = async () => json(404)
  const result = await api.deleteExpense('1', 31)
  assert.equal(result.ok, false); assert.match(result.message, /HTTP 404/)
})

test('borrar: 409 de la API conserva su mensaje; red caída no se toma como borrado', async () => {
  globalThis.fetch = async () => json(409, { error: 'No editable/eliminable: ya está facturado o incluido en una Prebill', stage: 'delete_gasto' })
  assert.deepEqual(await api.deleteExpense('1', 31), { ok: false, message: 'No editable/eliminable: ya está facturado o incluido en una Prebill' })
  globalThis.fetch = async () => { throw new Error('offline') }
  assert.equal((await api.deleteExpense('1', 31)).ok, false)
})

test('listado: rechaza respuestas que no son arreglo', async () => {
  globalThis.fetch = async () => json(200, { error: 'x' })
  await assert.rejects(api.fetchExpenses('1'), /formato inesperado/)
})

test('enlace a la captura lleva organización, gasto y origen', () => {
  globalThis.window = { location: { href: 'https://universal-expenseentry-calendar.onslate.com/?organization_id=1&x=2' } }
  const url = new URL(api.entryUrl('636939444', 31))
  assert.equal(url.origin, 'https://universal-aptus-expenseentry.onslate.com')
  assert.equal(url.searchParams.get('organization_id'), '636939444')
  assert.equal(url.searchParams.get('gasto_id'), '31')
  assert.equal(url.searchParams.get('origin'), 'https://universal-expenseentry-calendar.onslate.com/?organization_id=636939444')
  assert.equal(new URL(api.entryUrl('1')).searchParams.get('gasto_id'), null)
})

test('candado igual al de la API y totales por moneda', () => {
  assert.equal(types.expenseLockReason({ facturado: 0, prebill_id: null, status: 'liberado' }), null)
  assert.match(types.expenseLockReason({ facturado: 0, prebill_id: 9, status: 'en_prebill' }), /Prebill #9/)
  assert.match(types.expenseLockReason({ facturado: 1, prebill_id: 9, status: 'facturado' }), /facturado/)
  const totals = types.totalsByCurrency([{ moneda: 'MXN', monto: 2500 }, { moneda: 'MXN', monto: 640.5 }, { moneda: 'USD', monto: 85 }])
  assert.deepEqual(totals, { MXN: { count: 2, monto: 3140.5 }, USD: { count: 1, monto: 85 } })
})
