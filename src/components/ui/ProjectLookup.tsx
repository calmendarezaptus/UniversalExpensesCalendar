import React, { useState, useRef, useEffect, useMemo } from 'react'
import { RefreshCw, Check, X, Briefcase } from 'lucide-react'
import { useProyectos } from '../../hooks/useProyectos'
import type { Proyecto } from '../../hooks/useProyectos'
import type { Cliente } from '../../hooks/useClientes'
import { Button } from '@/components/ui/button'

interface ProjectLookupProps {
  orgId: string | null
  selectedProjects?: Proyecto[]
  onSelect?: (proyectos: Proyecto[]) => void
  disabled?: boolean
  selectedClients?: Cliente[]
}

export function ProjectLookup({ orgId, selectedProjects = [], onSelect, disabled = false, selectedClients = [] }: ProjectLookupProps) {
  const { proyectos, isLoading, error, refreshProyectos } = useProyectos(orgId)
  
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Derived available projects (filtered by selected clients)
  const availableProjects = useMemo(() => {
    if (selectedClients.length === 0) return [] // Si no hay clientes, no hay proyectos disponibles
    
    // Crear un Set con los IDs de los clientes para búsqueda rápida
    const clientIds = new Set(selectedClients.map(c => c.cliente_id || c.id))
    
    return proyectos.filter(p => clientIds.has(p.cliente_id) || clientIds.has(p.cliente_zoho_id))
  }, [proyectos, selectedClients])

  // Search filtering
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return availableProjects.slice(0, 50)
    
    const lowerTerm = searchTerm.toLowerCase()
    const matches = []
    
    for (let i = 0; i < availableProjects.length; i++) {
      const project = availableProjects[i]
      const name = project.nombre_completo || project.nombre || ''
      if (name.toLowerCase().includes(lowerTerm)) {
        matches.push(project)
        if (matches.length >= 50) break
      }
    }
    return matches
  }, [availableProjects, searchTerm])

  const handleSelect = (project: Proyecto) => {
    if (disabled) return
    const projectId = project.id
    const isAlreadySelected = selectedProjects.some(p => p.id === projectId)
    
    let newSelection = []
    if (isAlreadySelected) {
      newSelection = selectedProjects.filter(p => p.id !== projectId)
    } else {
      newSelection = [...selectedProjects, project]
    }
    
    setSearchTerm('')
    if (onSelect) onSelect(newSelection)
  }

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    setSearchTerm('')
    setIsOpen(true)
  }

  const removeProject = (projectId: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (disabled) return
    const newSelection = selectedProjects.filter(p => p.id !== projectId)
    if (onSelect) onSelect(newSelection)
  }

  return (
    <div className={`flex flex-col gap-1 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Chips de proyectos seleccionados */}
      {selectedProjects.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1 absolute -top-8 left-0 z-10">
          {selectedProjects.map(project => {
            const id = project.id
            const name = project.nombre_completo || project.nombre || 'Desconocido'
            return (
              <div key={id} className="flex items-center gap-1 bg-brand-600/90 text-white px-2 py-0.5 rounded shadow-sm text-xs border border-brand-500">
                <span className="truncate max-w-[120px]">{name}</span>
                <button 
                  onClick={(e) => removeProject(id, e)} 
                  className="hover:text-red-200 transition-colors bg-white/10 rounded-full p-0.5"
                  title="Quitar proyecto"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative" ref={containerRef}>
          <div className={`relative flex items-center bg-white/10 ${disabled ? '' : 'hover:bg-white/20 focus-within:bg-white/30'} rounded-md transition-colors w-[240px]`}>
            <Briefcase className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
            
            <input
              type="text"
              disabled={disabled}
              placeholder={
                disabled 
                  ? "Seleccione un cliente..." 
                  : isOpen 
                    ? "Buscar proyecto..." 
                    : selectedProjects.length > 0
                      ? `${selectedProjects.length} seleccionados` 
                      : (isLoading ? "Cargando..." : "Buscar proyecto...")
              }
              className={`h-8 w-full pl-8 pr-8 bg-transparent border-transparent focus:outline-none focus:ring-0 text-white placeholder:text-white/70 text-sm ${!isOpen && selectedProjects.length > 0 && !searchTerm ? 'placeholder:text-white font-medium' : ''}`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => {
                if (!disabled) setIsOpen(true)
              }}
            />
            
            {searchTerm && !disabled && (
              <button 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-10"
                onClick={clearSelection}
                title="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

        {isOpen && !disabled && (
          <div className="absolute top-full left-0 mt-1 w-[300px] bg-white rounded-md shadow-xl border border-slate-200 overflow-hidden z-50">
            {isLoading ? (
              <div className="p-3 text-sm text-slate-500 text-center">Cargando proyectos...</div>
            ) : error ? (
              <div className="p-3 text-sm text-red-500 text-center">Error al cargar</div>
            ) : availableProjects.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">Los clientes seleccionados no tienen proyectos</div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">No hay resultados</div>
            ) : (
              <ul className="max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
                {filteredProjects.map((project, idx) => {
                  const id = project.id || idx
                  const name = project.nombre_completo || project.nombre || 'Desconocido'
                  const isSelected = selectedProjects.some(p => p.id === id)

                  return (
                    <li
                      key={id}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center hover:bg-slate-50 transition-colors ${isSelected ? 'bg-brand-50/50 text-brand-900' : 'text-slate-700'}`}
                      onClick={() => handleSelect(project)}
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center mr-3 shrink-0 transition-colors ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white'}`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="truncate">{name}</span>
                    </li>
                  )
                })}
                {availableProjects.length > 50 && (
                  <li className="px-3 py-2 text-xs text-slate-400 text-center border-t border-slate-50 bg-slate-50">
                    Se muestran hasta 50 resultados. Escribe para buscar más.
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-8 w-8 text-white hover:bg-white/20 shrink-0 ${isLoading ? 'animate-spin opacity-50' : ''}`}
        onClick={() => refreshProyectos()}
        disabled={isLoading || disabled}
        title="Refrescar proyectos"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      </div>
    </div>
  )
}
