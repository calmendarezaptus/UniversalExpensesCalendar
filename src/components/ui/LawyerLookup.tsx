import React, { useState, useRef, useEffect, useMemo } from 'react'
import { RefreshCw, Check, X, User } from 'lucide-react'
import { useAbogados } from '../../hooks/useAbogados'
import type { Abogado } from '../../hooks/useAbogados'
import { Button } from '@/components/ui/button'

interface LawyerLookupProps {
  orgId: string | null
  selectedLawyers?: Abogado[]
  onSelect?: (abogados: Abogado[]) => void
}

export function LawyerLookup({ orgId, selectedLawyers = [], onSelect }: LawyerLookupProps) {
  const { abogados, isLoading, error, refreshAbogados } = useAbogados(orgId)
  
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
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

  // Search filtering
  const filteredLawyers = useMemo(() => {
    if (!searchTerm) return abogados.slice(0, 50)
    
    const lowerTerm = searchTerm.toLowerCase()
    const matches = []
    
    for (let i = 0; i < abogados.length; i++) {
      const lawyer = abogados[i]
      const name = lawyer.zoho_user_nombre || lawyer.nombre || ''
      if (name.toLowerCase().includes(lowerTerm)) {
        matches.push(lawyer)
        if (matches.length >= 50) break
      }
    }
    return matches
  }, [abogados, searchTerm])

  const handleSelect = (lawyer: Abogado) => {
    const lawyerId = lawyer.zoho_user_id || lawyer.id.toString()
    const isAlreadySelected = selectedLawyers.some(l => (l.zoho_user_id || l.id.toString()) === lawyerId)
    
    let newSelection = []
    if (isAlreadySelected) {
      newSelection = selectedLawyers.filter(l => (l.zoho_user_id || l.id.toString()) !== lawyerId)
    } else {
      newSelection = [...selectedLawyers, lawyer]
    }
    
    setSearchTerm('')
    if (onSelect) onSelect(newSelection)
  }

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchTerm('')
    setIsOpen(true)
  }

  const removeLawyer = (lawyerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const newSelection = selectedLawyers.filter(l => (l.zoho_user_id || l.id.toString()) !== lawyerId)
    if (onSelect) onSelect(newSelection)
  }

  const getFirstLetter = (name: string) => {
    if (!name) return '?'
    return name.charAt(0).toUpperCase()
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Chips de abogados seleccionados */}
      {selectedLawyers.length > 0 && (
        <div className="flex flex-wrap gap-1 absolute -top-8 left-0 z-10">
          {selectedLawyers.map(lawyer => {
            const id = lawyer.zoho_user_id || lawyer.id.toString()
            const name = lawyer.zoho_user_nombre || lawyer.nombre || 'Desconocido'
            return (
              <div key={id} className="flex items-center gap-1 bg-brand-600/90 text-white px-2 py-0.5 rounded shadow-sm text-xs border border-brand-500">
                <span className="truncate max-w-[120px]">{name}</span>
                <button 
                  onClick={(e) => removeLawyer(id, e)} 
                  className="hover:text-red-200 transition-colors bg-white/10 rounded-full p-0.5"
                  title="Quitar abogado"
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
          <div className="relative flex items-center bg-white/10 hover:bg-white/20 focus-within:bg-white/30 rounded-md transition-colors w-[240px]">
            <User className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
            
            <input
              type="text"
              placeholder={
                isOpen 
                  ? "Buscar abogado..." 
                  : selectedLawyers.length > 0
                    ? `${selectedLawyers.length} seleccionados` 
                    : (isLoading ? "Cargando..." : "Buscar abogado...")
              }
              className={`h-8 w-full pl-8 pr-8 bg-transparent border-transparent focus:outline-none focus:ring-0 text-white placeholder:text-white/70 text-sm ${!isOpen && selectedLawyers.length > 0 && !searchTerm ? 'placeholder:text-white font-medium' : ''}`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
            />
            
            {searchTerm && (
              <button 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-10"
                onClick={clearSelection}
                title="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-[320px] bg-white rounded-md shadow-xl border border-slate-200 overflow-hidden z-50">
            {isLoading ? (
              <div className="p-3 text-sm text-slate-500 text-center">Cargando abogados...</div>
            ) : error ? (
              <div className="p-3 text-sm text-red-500 text-center">Error al cargar</div>
            ) : filteredLawyers.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">No hay resultados</div>
            ) : (
              <ul className="max-h-[350px] overflow-y-auto py-1 custom-scrollbar">
                {filteredLawyers.map((lawyer, idx) => {
                  const id = lawyer.zoho_user_id || lawyer.id.toString() || idx.toString()
                  const name = lawyer.zoho_user_nombre || lawyer.nombre || 'Desconocido'
                  const isSelected = selectedLawyers.some(l => (l.zoho_user_id || l.id.toString()) === id)

                  return (
                    <li
                      key={id}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center hover:bg-slate-50 transition-colors ${isSelected ? 'bg-brand-50/50' : ''}`}
                      onClick={() => handleSelect(lawyer)}
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center mr-3 shrink-0 transition-colors ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white'}`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold mr-3 shrink-0 overflow-hidden border border-brand-200">
                        {lawyer.foto_url && !imgErrors[id] ? (
                          <img 
                            src={lawyer.foto_url} 
                            alt={name} 
                            className="w-full h-full object-cover"
                            onError={() => setImgErrors(prev => ({ ...prev, [id]: true }))}
                          />
                        ) : (
                          <span>{getFirstLetter(name)}</span>
                        )}
                      </div>
                      
                      <div className="flex flex-col min-w-0">
                        <span className={`truncate ${isSelected ? 'text-brand-900 font-medium' : 'text-slate-700'}`}>{name}</span>
                        {lawyer.email && (
                          <span className="truncate text-xs text-slate-500">{lawyer.email}</span>
                        )}
                      </div>
                    </li>
                  )
                })}
                {abogados.length > 50 && (
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
        onClick={() => refreshAbogados()}
        disabled={isLoading}
        title="Refrescar abogados"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      </div>
    </div>
  )
}
