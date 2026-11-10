import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, RefreshCw, Check, X } from 'lucide-react'
import { useClientes } from '../../hooks/useClientes'
import type { Cliente } from '../../hooks/useClientes'
import { Button } from '@/components/ui/button'

interface ClientLookupProps {
  orgId: string | null
  selectedClients?: Cliente[]
  onSelect?: (clientes: Cliente[]) => void
}

export function ClientLookup({ orgId, selectedClients = [], onSelect }: ClientLookupProps) {
  const { clientes, isLoading, error, refreshClientes } = useClientes(orgId)
  
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Manejar clics fuera del componente para cerrar la lista
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

  // Filtrado ultra rápido en memoria, limitado a 50 resultados para evitar lentitud del DOM
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clientes.slice(0, 50)
    
    const lowerTerm = searchTerm.toLowerCase()
    const matches = []
    
    for (let i = 0; i < clientes.length; i++) {
      const client = clientes[i]
      const name = client.cliente_nombre || client.nombre || ''
      if (name.toLowerCase().includes(lowerTerm)) {
        matches.push(client)
        if (matches.length >= 50) break
      }
    }
    return matches
  }, [clientes, searchTerm])

  const handleSelect = (client: Cliente) => {
    const clientId = client.cliente_id || client.id
    const isAlreadySelected = selectedClients.some(c => (c.cliente_id || c.id) === clientId)
    
    let newSelection = []
    if (isAlreadySelected) {
      newSelection = selectedClients.filter(c => (c.cliente_id || c.id) !== clientId)
    } else {
      newSelection = [...selectedClients, client]
    }
    
    setSearchTerm('')
    if (onSelect) onSelect(newSelection)
    // Keep isOpen true so they can pick more
  }

  const removeClient = (clientId: string) => {
    const newSelection = selectedClients.filter(c => (c.cliente_id || c.id) !== clientId)
    if (onSelect) onSelect(newSelection)
  }

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchTerm('')
    setIsOpen(true)
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Chips de clientes seleccionados */}
      {selectedClients.length > 0 && (
        <div className="flex flex-wrap gap-1 absolute -top-8 left-0 z-10">
          {selectedClients.map(client => {
            const id = client.cliente_id || client.id || ''
            const name = client.cliente_nombre || client.nombre || 'Desconocido'
            return (
              <div key={id} className="flex items-center gap-1 bg-brand-600/90 text-white px-2 py-0.5 rounded shadow-sm text-xs border border-brand-500">
                <span className="truncate max-w-[120px]">{name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeClient(id); }} 
                  className="hover:text-red-200 transition-colors bg-white/10 rounded-full p-0.5"
                  title="Quitar cliente"
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
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
            
            <input
              type="text"
              placeholder={
                isOpen 
                  ? "Buscar cuenta..." 
                  : selectedClients.length > 0
                    ? `${selectedClients.length} seleccionadas` 
                    : (isLoading ? "Cargando..." : "Buscar cuenta...")
              }
              className={`h-8 w-full pl-8 pr-8 bg-transparent border-transparent focus:outline-none focus:ring-0 text-white placeholder:text-white/70 text-sm ${!isOpen && selectedClients.length > 0 && !searchTerm ? 'placeholder:text-white font-medium' : ''}`}
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
          <div className="absolute top-full left-0 mt-1 w-[300px] bg-white rounded-md shadow-xl border border-slate-200 overflow-hidden z-50">
            {isLoading ? (
              <div className="p-3 text-sm text-slate-500 text-center">Cargando...</div>
            ) : error ? (
              <div className="p-3 text-sm text-red-500 text-center">Error al cargar</div>
            ) : filteredClients.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">No hay resultados</div>
            ) : (
              <ul className="max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
                {filteredClients.map((client, idx) => {
                  const id = client.cliente_id || client.id || idx.toString()
                  const name = client.cliente_nombre || client.nombre || 'Desconocido'
                  const isSelected = selectedClients.some(c => (c.cliente_id || c.id) === id)

                  return (
                    <li
                      key={id}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center hover:bg-slate-50 transition-colors ${isSelected ? 'bg-brand-50/50 text-brand-900' : 'text-slate-700'}`}
                      onClick={() => handleSelect(client)}
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center mr-3 shrink-0 transition-colors ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white'}`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="truncate">{name}</span>
                    </li>
                  )
                })}
                {clientes.length > 50 && (
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
        onClick={() => refreshClientes()}
        disabled={isLoading}
        title="Refrescar cuentas"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      </div>
    </div>
  )
}
