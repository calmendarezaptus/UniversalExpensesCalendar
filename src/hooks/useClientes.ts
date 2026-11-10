import { API_BASE } from '../lib/api'
import { useState, useEffect, useCallback } from 'react'

export interface Cliente {
  cliente_id: string
  cliente_nombre: string
  id?: string
  nombre?: string
  // Extend this if the API returns more fields you need
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 horas en milisegundos

export function useClientes(orgId: string | null) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchClientes = useCallback(async (forceRefresh = false) => {
    if (!orgId) return

    const cacheKeyData = `clientes_data_${orgId}`
    const cacheKeyTime = `clientes_timestamp_${orgId}`

    if (!forceRefresh) {
      const cachedData = localStorage.getItem(cacheKeyData)
      const cachedTime = localStorage.getItem(cacheKeyTime)

      if (cachedData && cachedTime) {
        const timePassed = Date.now() - parseInt(cachedTime, 10)
        if (timePassed < CACHE_TTL_MS) {
          try {
            const parsed = JSON.parse(cachedData)
            setClientes(parsed)
            return
          } catch (e) {
            console.error('Error parsing cached clientes:', e)
            // Continue to fetch if parse fails
          }
        }
      }
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(orgId)}/clientes`)
      
      if (!response.ok) {
        throw new Error('Error al obtener el catálogo de clientes')
      }
      
      const data = await response.json()
      
      // Store in memory
      setClientes(data)
      
      // Store in cache
      localStorage.setItem(cacheKeyData, JSON.stringify(data))
      localStorage.setItem(cacheKeyTime, Date.now().toString())
      
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error desconocido al cargar clientes')
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  return { clientes, isLoading, error, refreshClientes: () => fetchClientes(true) }
}
