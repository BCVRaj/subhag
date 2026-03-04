/**
 * API Service - Axios client for backend communication
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth APIs
export const authAPI = {
  login: (username, password) =>
    apiClient.post('/auth/login/json', { username, password }),
  
  register: (username, email, password, fullName, role = 'operator') =>
    apiClient.post('/auth/register', { 
      username, 
      email, 
      password, 
      full_name: fullName,
      role 
    }),
  
  loginWithGoogle: (googleToken) =>
    apiClient.post('/auth/google', { token: googleToken }),
  
  getCurrentUser: () => apiClient.get('/auth/me'),
  
  logout: () => apiClient.post('/auth/logout'),
}

// Upload APIs
export const uploadAPI = {
  createSession: () => apiClient.post('/upload/create-session'),
  
  uploadFile: (sessionId, formData) => {
    return apiClient.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  
  validateData: (sessionId, scadaFilename = null) =>
    apiClient.post('/upload/validate', { 
      session_id: sessionId,
      scada_file: scadaFilename
    }),
  
  listFiles: (sessionId) => apiClient.get(`/upload/session/${sessionId}/files`),
}

// Analysis APIs
export const analysisAPI = {
  runAnalysis: (sessionId, analysisType, parameters = {}) =>
    apiClient.post('/analysis/run', {
      session_id: sessionId,
      analysis_type: analysisType,
      parameters,
    }),
  
  runFullAnalysis: (sessionId, parameters = {}) =>
    apiClient.post('/analysis/full', null, { params: { session_id: sessionId, ...parameters } }),
}

// Jobs APIs
export const jobsAPI = {
  getStatus: (jobId) => apiClient.get(`/jobs/${jobId}/status`),
  
  getResults: (jobId) => apiClient.get(`/jobs/${jobId}/results`),
  
  cancelJob: (jobId) => apiClient.delete(`/jobs/${jobId}`),
}

// Results APIs
export const resultsAPI = {
  getResults: (jobId) => apiClient.get(`/results/${jobId}`),
  
  getEnergyYield: (jobId, turbineId = null) => {
    const params = turbineId ? { turbine_id: turbineId } : {}
    return apiClient.get(`/results/${jobId}/energy-yield`, { params })
  },
  
  getPowerCurve: (jobId, turbineId = null) => {
    const params = turbineId ? { turbine_id: turbineId } : {}
    return apiClient.get(`/results/${jobId}/power-curve`, { params })
  },
  
  getOverviewDashboard: (jobId, turbineId = null) => {
    const params = turbineId ? { turbine_id: turbineId } : {}
    return apiClient.get(`/results/${jobId}/overview-dashboard`, { params })
  },
  
  getFinancial: (jobId) => apiClient.get(`/results/${jobId}/financial`),
  
  getLiveFinancial: (
    lat = 39.45, 
    lon = -119.78, 
    turbineCount = 10, 
    turbineCapacity = 2.5, 
    electricityPrice = 45.0, 
    numSimulations = 10000,
    regressionModel = 'regression',
    timeResolution = 'monthly',
    includeTemperature = true,
    includeWindDirection = true
  ) => 
    apiClient.get('/results/live/financial', { 
      params: { 
        lat, 
        lon, 
        turbine_count: turbineCount,
        turbine_capacity_mw: turbineCapacity,
        electricity_price: electricityPrice,
        num_simulations: numSimulations,
        regression_model: regressionModel,
        time_resolution: timeResolution,
        include_temperature: includeTemperature,
        include_wind_direction: includeWindDirection
      } 
    }),
}

// Turbines APIs
export const turbinesAPI = {
  listTurbines: () => apiClient.get('/turbines/list'),
  
  getPerformance: (turbineId = null) => {
    const params = turbineId ? { turbine_id: turbineId } : {}
    return apiClient.get('/turbines/performance', { params })
  },
  
  getTurbineDetails: (turbineId) => apiClient.get(`/turbines/${turbineId}`),
  
  getTelemetry: (turbineId, hours = 24) =>
    apiClient.get(`/turbines/${turbineId}/telemetry`, { params: { hours } }),
  
  getAlarms: (turbineId, limit = 10) =>
    apiClient.get(`/turbines/${turbineId}/alarms`, { params: { limit } }),
  
  getLiveStatus: () => apiClient.get('/turbines/status/live'),
  
  scheduleService: (turbineId, serviceType, date) =>
    apiClient.post(`/turbines/${turbineId}/service`, { service_type: serviceType, date }),
}

// Maintenance APIs
export const maintenanceAPI = {
  getTasks: (filters = {}) =>
    apiClient.get('/maintenance/tasks', { params: filters }),
  
  getTaskDetails: (taskId) => apiClient.get(`/maintenance/tasks/${taskId}`),
  
  createTask: (taskData) => apiClient.post('/maintenance/tasks', taskData),
  
  updateTask: (taskId, updates) => apiClient.patch(`/maintenance/tasks/${taskId}`, updates),
  
  deleteTask: (taskId) => apiClient.delete(`/maintenance/tasks/${taskId}`),
  
  getHistory: (turbineId, days = 30) =>
    apiClient.get('/maintenance/history', { params: { turbine_id: turbineId, days } }),
}

// Prospecting APIs
export const prospectingAPI = {
  getAllSites: (search = null, viability = null) => {
    const params = {}
    if (search) params.search = search
    if (viability) params.viability = viability
    return apiClient.get('/prospecting/sites', { params })
  },
  
  getSiteDetails: (siteId) => apiClient.get(`/prospecting/sites/${siteId}`),
  
  savePin: (coordinates, notes = null, pinId = null) =>
    apiClient.post('/prospecting/pins', { coordinates, notes, pin_id: pinId }),
  
  getPins: () => apiClient.get('/prospecting/pins'),
  
  deletePin: (pinId) => apiClient.delete(`/prospecting/pins/${pinId}`),
  
  getWindData: (siteId) => apiClient.get(`/prospecting/wind-data/${siteId}`),
  
  assessLocation: (lat, lon) =>
    apiClient.post('/prospecting/assess-location', {
      lat,
      long: lon
    }),
  
  runSimulation: (siteId, turbineCount = 10, turbineModel = 'Generic 2.5MW', parameters = {}) =>
    apiClient.post('/prospecting/simulate', {
      site_id: siteId,
      turbine_count: turbineCount,
      turbine_model: turbineModel,
      parameters,
    }),
  
  generateReport: (siteId) => apiClient.get(`/prospecting/report/${siteId}`),
}

export default apiClient
