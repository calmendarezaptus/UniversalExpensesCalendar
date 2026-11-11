# Calendario de Gastos (Expenses Calendar)

Lista y calendario (mes, semana, día) de los gastos y reembolsos capturados en Aptus. Mismo stack,
componentes y diseño que el calendario de tiempos (`UniversalTimesCalendar`): React + Vite +
TypeScript, Tailwind CSS v3, shadcn/ui (`base-nova`, Base UI), lucide, jsPDF y fuente Geist. El
tema por omisión es **Turquesa** para distinguirlo del de tiempos (Índigo queda como opción).

## Qué hace

- **Lista** con orden y filtros por columna (fecha, abogado, descripción, tipo, estado), agrupación
  por categoría, abogado, cliente, proyecto, tipo, quién pagó, estado o moneda, totales por moneda y
  exportación a CSV y PDF.
- **Calendario** de mes, semana y día con totales por día (número de gastos y monto por moneda).
- **Filtros globales** de cliente, proyecto y abogado en el encabezado (guardados por organización).
- **Detalle** lateral del gasto: monto, tipo (con/sin IVA), cobro al cliente, quién pagó, reembolso
  al abogado, estado y Prebill.
- **Agregar / Editar** abren la captura de gastos (`UniversalAptusExpenseEntry`) con `origin` para
  regresar aquí. **Eliminar** llama a `DELETE /{org}/gastos/{id}`.
- Un gasto **en Prebill o facturado** no se edita ni se elimina (misma regla que la API, 409).

## Parámetros de URL

| Parámetro | Uso |
|---|---|
| `organization_id` | **Requerido.** Sin él se muestra un error. |

## Llamadas al backend (función `expense_services`, proyecto Gastos)

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/{org}/gastos` | Listado completo |
| GET | `/{org}/clientes`, `/{org}/proyectos`, `/{org}/abogados` | Filtros del encabezado (caché 6 h) |
| DELETE | `/{org}/gastos/{id}` | Eliminar |

Solo un 404 **en JSON** de la API ("Gasto no encontrado") se toma como "ya no existe". Un 404 en
HTML significa que la función desplegada no tiene la ruta y se muestra como error (en el calendario
de tiempos un 404 se tomaba como éxito).

## Variables de entorno (opcionales)

| Variable | Por omisión |
|---|---|
| `VITE_API_BASE_URL` | `https://expensesforaptusfinancials-730085095.development.catalystserverless.com/server/expense_services` |
| `VITE_EXPENSE_ENTRY_URL` | `https://universal-aptus-expenseentry.onslate.com/` |

En desarrollo todas las llamadas pasan por el proxy de Vite `/api`.

**CORS:** el dominio de esta Slate debe estar en los dominios autorizados del proyecto de Catalyst
de la función, igual que el de la captura.

## Comandos

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # pruebas de src/lib y src/types (node:test)
npm run build    # compilación para la Slate (dist/)
```

## Proyecto

Forma parte del proyecto de Catalyst **Gastos**. Configuración, despliegue y pendientes: `02-gastos/PROYECTO.md` en el repositorio de trabajo `AptusWidgets`.
