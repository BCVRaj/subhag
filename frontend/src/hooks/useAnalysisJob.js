/**
 * Analysis Job Hook - Poll job status and get results
 */
import { useState, useEffect, useCallback } from 'react'
import { jobsAPI } from '../services/api'

export const useAnalysisJob = (pollInterval = 2000) => {
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState(null)
  const [progress, setProgress] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isPolling, setIsPolling] = useState(false)
  
  const fetchStatus = useCallback(async (currentJobId) => {
    if (!currentJobId) return
    
    try {
      const response = await jobsAPI.getStatus(currentJobId)
      setStatus(response.data)
      setProgress(response.data.progress || 0)
      
      // Stop polling if job is completed or failed
      if (response.data.status === 'completed') {
        setIsPolling(false)
        setProgress(100)
        fetchResults(currentJobId)
      } else if (response.data.status === 'failed') {
        setIsPolling(false)
        setError(response.data.error || 'Job failed')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch job status')
      setIsPolling(false)
    }
  }, [])
  
  const fetchResults = async (currentJobId) => {
    if (!currentJobId) return
    
    setLoading(true)
    try {
      const response = await jobsAPI.getResults(currentJobId)
      setResults(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch results')
    } finally {
      setLoading(false)
    }
  }
  
  const startPolling = useCallback((newJobId) => {
    setJobId(newJobId)
    setIsPolling(true)
    setProgress(0)
    setError(null)
    setResults(null)
  }, [])
  
  const stopPolling = useCallback(() => {
    setIsPolling(false)
  }, [])
  
  // Polling effect
  useEffect(() => {
    if (!isPolling || !jobId) return
    
    const interval = setInterval(() => fetchStatus(jobId), pollInterval)
    
    // Initial fetch
    fetchStatus(jobId)
    
    return () => clearInterval(interval)
  }, [isPolling, jobId, pollInterval, fetchStatus])
  
  return {
    jobId,
    status,
    progress,
    results,
    loading,
    error,
    isPolling,
    startPolling,
    stopPolling,
    refreshStatus: () => fetchStatus(jobId),
    fetchResults: () => fetchResults(jobId),
  }
}
