import { API_BASE } from '../lib/api'
import { useState, useEffect, useCallback } from 'react'

export interface Abogado {
  id: number
  nombre: string
  tipo_id: number
  tarifa_propia: number
  activo: number
  zoho_user_id: string
  foto_url: string
  zoho_user_nombre: string
  zoho_user_status: string
  email: string
  zoho_user_email: string
  tipo_nombre: string
  tarifa_default: number
  zoho_id: string | null
  status: string
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 horas en milisegundos

export function useAbogados(orgId: string | null) {
  const [abogados, setAbogados] = useState<Abogado[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAbogados = useCallback(async (forceRefresh = false) => {
    if (!orgId) return

    const cacheKeyData = `abogados_data_${orgId}`
    const cacheKeyTime = `abogados_timestamp_${orgId}`

    if (!forceRefresh) {
      const cachedData = localStorage.getItem(cacheKeyData)
      const cachedTime = localStorage.getItem(cacheKeyTime)

      if (cachedData && cachedTime) {
        const timePassed = Date.now() - parseInt(cachedTime, 10)
        if (timePassed < CACHE_TTL_MS) {
          try {
            const parsed = JSON.parse(cachedData) as Abogado[]
            setAbogados(parsed.filter(a => a.status === 'activo'))
            return
          } catch (e) {
            console.error('Error parsing cached abogados:', e)
            // Continue to fetch if parse fails
          }
        }
      }
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/${encodeURIComponent(orgId)}/abogados`)
      
      if (!response.ok) {
        throw new Error('Error al obtener el catálogo de abogados')
      }
      
      const data = (await response.json()) as Abogado[]
      const activos = data.filter(a => a.status === 'activo')
      
      // Store in memory
      setAbogados(activos)
      
      // Store in cache (store all or just active? better to store all to match original API response payload)
      localStorage.setItem(cacheKeyData, JSON.stringify(data))
      localStorage.setItem(cacheKeyTime, Date.now().toString())
      
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error desconocido al cargar abogados')
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchAbogados()
  }, [fetchAbogados])

  return { abogados, isLoading, error, refreshAbogados: () => fetchAbogados(true) }
}
