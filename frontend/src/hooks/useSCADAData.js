/**
 * SCADA Data Hook
 */
import { useState, useEffect } from 'react'
import { turbinesAPI } from '../services/api'

export const useSCADAData = (turbineId = null, refreshInterval = 30000) => {
  const [liveData, setLiveData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const fetchLiveData = async () => {
    setLoading(true)
    try {
      const response = await turbinesAPI.getLiveStatus()
      let data = response.data.turbines
      
      if (turbineId) {
        data = [data.find(t => t.turbine_id === turbineId) || null]
      }
      
      setLiveData(data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch SCADA data')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchLiveData()
    
    const interval = setInterval(fetchLiveData, refreshInterval)
    
    return () => clearInterval(interval)
  }, [turbineId, refreshInterval])
  
  return {
    liveData,
    loading,
    error,
    refresh: fetchLiveData,
  }
}
