import { ChevronLeft, ChevronRight, List, Calendar, Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClientLookup } from './ui/ClientLookup'
import { ProjectLookup } from './ui/ProjectLookup'
import { LawyerLookup } from './ui/LawyerLookup'
import logoAptus from '../assets/aptus_square_icon.png'

type ViewType = 'month' | 'week' | 'day'
type DisplayMode = 'list' | 'calendar'

interface CalendarHeaderProps {
  currentDate?: Date
  view?: ViewType
  orgId?: string | null
  displayMode?: DisplayMode
  setDisplayMode?: (mode: DisplayMode) => void
  onViewChange?: (view: ViewType) => void
  onPrev?: () => void
  onNext?: () => void
  onToday?: () => void
  onOpenSettings?: () => void
  onAddExpense?: () => void
  selectedClients?: any[]
  onClientSelect?: (clients: any[]) => void
  selectedProjects?: any[]
  onProjectSelect?: (projects: any[]) => void
  selectedLawyers?: any[]
  onLawyerSelect?: (lawyers: any[]) => void
}

export function CalendarHeader({
  currentDate: _currentDate = new Date(),
  view = 'month',
  orgId = null,
  displayMode = 'calendar',
  setDisplayMode,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onOpenSettings,
  onAddExpense,
  selectedClients = [],
  onClientSelect,
  selectedProjects = [],
  onProjectSelect,
  selectedLawyers = [],
  onLawyerSelect
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-brand-900 to-fuchsia-900 text-white gap-4 relative z-20">
      {/* Left side filters */}
      <div className="flex items-center gap-3 shrink-0">

        {/* App Logo */}
        <div className="flex items-center justify-center shrink-0 mr-4">
          <img src={logoAptus} alt="Aptus Logo" className="h-8 w-8 object-contain" />
        </div>

        {/* View Toggle (List vs Calendar) */}
        <div className="flex bg-white/10 rounded-md p-0.5 mr-2">
          <button
            onClick={() => setDisplayMode && setDisplayMode('list')}
            className={`px-3 py-1 flex items-center gap-1.5 text-xs font-bold rounded shadow-sm transition-colors ${displayMode === 'list' ? 'bg-white text-brand-900' : 'text-white hover:bg-white/20 font-medium'}`}
            title="Vista de Lista"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDisplayMode && setDisplayMode('calendar')}
            className={`px-3 py-1 flex items-center gap-1.5 text-xs font-bold rounded shadow-sm transition-colors ${displayMode === 'calendar' ? 'bg-white text-brand-900' : 'text-white hover:bg-white/20 font-medium'}`}
            title="Vista de Calendario"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>

        {displayMode === 'calendar' && (
          <div className="flex bg-white/10 rounded-md p-0.5">
            <button
              onClick={() => onViewChange && onViewChange('month')}
              className={`px-3 py-1 text-xs font-bold rounded shadow-sm transition-colors ${view === 'month' ? 'bg-white text-brand-900' : 'text-white hover:bg-white/20 font-medium'}`}>
              MES
            </button>
            <button
              onClick={() => onViewChange && onViewChange('week')}
              className={`px-3 py-1 text-xs font-bold rounded shadow-sm transition-colors ${view === 'week' ? 'bg-white text-brand-900' : 'text-white hover:bg-white/20 font-medium'}`}>
              SEMANA
            </button>
            <button
              onClick={() => onViewChange && onViewChange('day')}
              className={`px-3 py-1 text-xs font-bold rounded shadow-sm transition-colors ${view === 'day' ? 'bg-white text-brand-900' : 'text-white hover:bg-white/20 font-medium'}`}>
              DÍA
            </button>
          </div>
        )}

        <ClientLookup
          orgId={orgId}
          selectedClients={selectedClients}
          onSelect={onClientSelect}
        />

        <ProjectLookup
          orgId={orgId}
          selectedProjects={selectedProjects}
          onSelect={onProjectSelect}
          selectedClients={selectedClients}
          disabled={selectedClients.length === 0}
        />

        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm font-semibold">Abogado</span>
          <LawyerLookup
            orgId={orgId}
            selectedLawyers={selectedLawyers}
            onSelect={onLawyerSelect}
          />
        </div>
      </div>

      {/* Right side pagination */}
      <div className="flex items-center gap-3 shrink-0">
        {displayMode === 'calendar' && (
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-r-none border border-white/20" onClick={onPrev} title="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="h-8 px-4 text-white hover:bg-white/20 rounded-none border-y border-white/20 font-medium" onClick={onToday} title="Hoy">
              HOY
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-l-none border border-white/20" onClick={onNext} title="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Botón Agregar (Outline border) */}
        <Button
          onClick={onAddExpense}
          variant="outline"
          className="border-2 border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 hover:text-white font-semibold flex items-center gap-1.5 px-3.5 h-8 text-xs rounded-lg transition-all active:scale-95 shadow-sm"
          title="Agregar gasto"
        >
          <Plus className="h-4 w-4 text-emerald-400" />
          <span>Agregar</span>
        </Button>

        <div className="h-8 w-px bg-white/20 mx-1"></div>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20 shrink-0 rounded-full" onClick={onOpenSettings} title="Configuraciones">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
