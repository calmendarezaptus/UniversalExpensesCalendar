import { useState, useEffect, useMemo } from 'react'
import { CalendarHeader } from './components/CalendarHeader'
import { MonthGrid } from './components/MonthGrid'
import { WeekGrid } from './components/WeekGrid'
import { DayGrid } from './components/DayGrid'
import { ExpenseList } from './components/ExpenseList'
import { EventDetailsPanel } from './components/EventDetailsPanel'
import { Modal } from './components/ui/Modal'
import { SettingsModal } from './components/SettingsModal'
import type { Expense } from './types'
import { expenseLockReason } from './types'
import type { Cliente } from './hooks/useClientes'
import type { Proyecto } from './hooks/useProyectos'
import type { Abogado } from './hooks/useAbogados'
import { useAbogados } from './hooks/useAbogados'
import { deleteExpense, entryUrl, fetchExpenses } from './lib/api'

type ViewType = 'month' | 'week' | 'day'
type DisplayMode = 'list' | 'calendar'

function readStored<T>(key: string, fallback: T): T {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : fallback } catch { return fallback }
}
function writeStored(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* sin almacenamiento */ }
}

function App() {
  const [orgId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('organization_id'))
  const [events, setEvents] = useState<Expense[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Expense | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('Error de Organización')
  const [modalMessage, setModalMessage] = useState('')
  const [modalType, setModalType] = useState<'error' | 'warning' | 'info'>('error')
  const [isLoading, setIsLoading] = useState(false)

  const showModal = (title: string, message: string, type: 'error' | 'warning' | 'info') => {
    setModalTitle(title); setModalMessage(message); setModalType(type); setIsModalOpen(true)
  }

  // Filtros globales guardados por organización (claves propias del calendario de gastos)
  const key = (name: string) => orgId ? `aptus_exp_selected_${name}_${orgId}` : `aptus_exp_selected_${name}`
  const [selectedClients, setSelectedClients] = useState<Cliente[]>(() => readStored(key('clients'), []))
  const [selectedProjects, setSelectedProjects] = useState<Proyecto[]>(() => readStored(key('projects'), []))
  const [selectedLawyers, setSelectedLawyers] = useState<Abogado[]>(() => readStored(key('lawyers'), []))

  const { abogados } = useAbogados(orgId)

  useEffect(() => writeStored(key('clients'), selectedClients), [selectedClients]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => writeStored(key('projects'), selectedProjects), [selectedProjects]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => writeStored(key('lawyers'), selectedLawyers), [selectedLawyers]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedClients.length === 0 && selectedProjects.length > 0) setSelectedProjects([])
  }, [selectedClients]) // eslint-disable-line react-hooks/exhaustive-deps

  const globalFilteredEvents = useMemo(() => {
    let filtered = events
    if (selectedClients.length > 0) {
      const clientIds = new Set(selectedClients.map(c => c.cliente_id || c.id))
      filtered = filtered.filter(evt => clientIds.has(evt.cliente_id))
    }
    if (selectedProjects.length > 0) {
      const projectIds = new Set(selectedProjects.map(p => p.id?.toString()))
      filtered = filtered.filter(evt => evt.proyecto_id && projectIds.has(evt.proyecto_id.toString()))
    }
    if (selectedLawyers.length > 0) {
      const lawyerIds = new Set(selectedLawyers.map(l => l.id?.toString()))
      filtered = filtered.filter(evt => evt.abogado_id != null && lawyerIds.has(evt.abogado_id.toString()))
    }
    if (abogados.length > 0) {
      const byId = new Map(abogados.map(l => [String(l.id), l]))
      filtered = filtered.map(evt => {
        const lawyer = evt.abogado_id != null ? byId.get(String(evt.abogado_id)) : undefined
        if (!lawyer) return evt
        return { ...evt, abogado_nombre: lawyer.zoho_user_nombre || lawyer.nombre || evt.abogado_nombre, abogado_foto_url: lawyer.foto_url || undefined }
      })
    }
    return filtered
  }, [events, selectedClients, selectedProjects, selectedLawyers, abogados])

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const saved = readStored<string | null>('aptus_exp_current_date', null)
    const parsed = saved ? new Date(saved) : null
    return parsed && !isNaN(parsed.getTime()) ? parsed : new Date()
  })
  const [view, setView] = useState<ViewType>(() => readStored('aptus_exp_calendar_view', 'month'))
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => readStored('aptus_exp_display_mode', 'list'))
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [theme, setTheme] = useState(() => readStored('aptus_exp_theme', 'teal'))

  useEffect(() => writeStored('aptus_exp_current_date', currentDate.toISOString()), [currentDate])
  useEffect(() => writeStored('aptus_exp_calendar_view', view), [view])
  useEffect(() => writeStored('aptus_exp_display_mode', displayMode), [displayMode])
  useEffect(() => {
    writeStored('aptus_exp_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!orgId) {
      showModal('Error de Organización', 'No se pudo obtener datos de la organización actual (falta organization_id en la URL).', 'error')
      return
    }
    setIsLoading(true)
    fetchExpenses(orgId)
      .then(setEvents)
      .catch(() => showModal('Error al cargar datos', 'Ocurrió un error al intentar obtener los gastos de la organización.', 'error'))
      .finally(() => setIsLoading(false))
  }, [orgId])

  const move = (delta: number) => setCurrentDate(prev => {
    const next = new Date(prev)
    if (view === 'month') next.setMonth(next.getMonth() + delta)
    else if (view === 'week') next.setDate(next.getDate() + 7 * delta)
    else next.setDate(next.getDate() + delta)
    return next
  })

  const handleAddExpense = () => {
    if (!orgId) return
    window.location.href = entryUrl(orgId)
  }

  const handleEditEvent = (event: Expense) => {
    if (!orgId) return
    const locked = expenseLockReason(event)
    if (locked) { showModal('Gasto no editable', locked, 'warning'); return }
    window.location.href = entryUrl(orgId, event.id)
  }

  const handleDeleteEvent = async (event: Expense) => {
    if (!orgId) return
    const locked = expenseLockReason(event)
    if (locked) { showModal('Gasto no eliminable', locked, 'warning'); return }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar este gasto?${event.descripcion ? `\n\n"${event.descripcion}"` : ''}`)) return
    setIsLoading(true)
    const result = await deleteExpense(orgId, event.id)
    setIsLoading(false)
    if (!result.ok) { showModal('Error al eliminar', result.message, 'error'); return }
    setEvents(prev => prev.filter(e => e.id !== event.id))
    if (selectedEvent?.id === event.id) setSelectedEvent(null)
    if (result.alreadyGone) showModal('Gasto ya eliminado', 'El gasto ya no existía en Aptus; se quitó del listado.', 'info')
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-200/60 p-2 sm:p-4 font-sans overflow-hidden">
      <div className="w-full h-full max-w-[1900px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative border border-slate-200/60">
        <CalendarHeader
          currentDate={currentDate} view={view} orgId={orgId}
          displayMode={displayMode} setDisplayMode={setDisplayMode} onViewChange={setView}
          onPrev={() => move(-1)} onNext={() => move(1)} onToday={() => setCurrentDate(new Date())}
          onOpenSettings={() => setIsSettingsOpen(true)} onAddExpense={handleAddExpense}
          selectedClients={selectedClients} onClientSelect={setSelectedClients}
          selectedProjects={selectedProjects} onProjectSelect={setSelectedProjects}
          selectedLawyers={selectedLawyers} onLawyerSelect={setSelectedLawyers}
        />

        <div className="flex-1 flex overflow-auto bg-slate-50 relative custom-scrollbar">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
          )}

          {displayMode === 'list' ? (
            <ExpenseList events={globalFilteredEvents} orgId={orgId} onEventClick={setSelectedEvent} onEdit={handleEditEvent} onDelete={handleDeleteEvent} />
          ) : (
            <>
              {view === 'month' && <MonthGrid events={globalFilteredEvents} currentDate={currentDate} onEventClick={setSelectedEvent} onEdit={handleEditEvent} onDelete={handleDeleteEvent} />}
              {view === 'week' && <WeekGrid events={globalFilteredEvents} currentDate={currentDate} onEventClick={setSelectedEvent} onEdit={handleEditEvent} onDelete={handleDeleteEvent} />}
              {view === 'day' && <DayGrid events={globalFilteredEvents} currentDate={currentDate} onEventClick={setSelectedEvent} onEdit={handleEditEvent} onDelete={handleDeleteEvent} />}
            </>
          )}

          {selectedEvent && (
            <EventDetailsPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} onEdit={handleEditEvent} onDelete={handleDeleteEvent} />
          )}

          {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} currentTheme={theme} setTheme={setTheme} />}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle} message={modalMessage} type={modalType} />
    </div>
  )
}

export default App
