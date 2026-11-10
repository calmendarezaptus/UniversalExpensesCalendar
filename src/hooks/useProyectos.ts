import { API_BASE } from '../lib/api'
import { useState, useEffect, useCallback } from 'react'

export interface Proyecto {
  id: number
  nombre: string
  cliente_id: string
  cliente_nombre: string
  moneda: string
  activo: number
  zoho_project_id: string | null
  zoho_project_name: string | null
  zoho_project_code: string | null
  zoho_id: string | null
  nombre_completo: string
  cliente_zoho_id: string
  status: string
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 horas en milisegundos

export function useProyectos(orgId: string | null) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProyectos = useCallback(async (forceRefresh = false) => {
    if (!orgId) return

    const cacheKeyData = `proyectos_data_${orgId}`
    const cacheKeyTime = `proyectos_timestamp_${orgId}`

    if (!forceRefresh) {
      const cachedData = localStorage.getItem(cacheKeyData)
      const cachedTime = localStorage.getItem(cacheKeyTime)

      if (cachedData && cachedTime) {
        const timePassed = Date.now() - parseInt(cachedTime, 10)
        if (timePassed < CACHE_TTL_MS) {
          try {
            const parsed = JSON.parse(cachedData)
            setProyectos(parsed)
            return
          } catch (e) {
            console.error('Error parsing cached proyectos:', e)
            // Continue to fetch if parse fails
          }
        }
      }
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(orgId)}/proyectos`)
      
      if (!response.ok) {
        throw new Error('Error al obtener el catálogo de proyectos')
      }
      
      const data = await response.json()
      
      // Store in memory
      setProyectos(data)
      
      // Store in cache
      localStorage.setItem(cacheKeyData, JSON.stringify(data))
      localStorage.setItem(cacheKeyTime, Date.now().toString())
      
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error desconocido al cargar proyectos')
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchProyectos()
  }, [fetchProyectos])

  return { proyectos, isLoading, error, refreshProyectos: () => fetchProyectos(true) }
}
