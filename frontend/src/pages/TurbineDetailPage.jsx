/**
 * Turbine Detail Page - Deep dive into individual turbine
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import Sidebar from '../components/common/Sidebar'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { turbinesAPI } from '../services/api'

export default function TurbineDetailPage() {
  const { turbineId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [turbineData, setTurbineData] = useState(null)
  const [telemetryData, setTelemetryData] = useState([])
  const [alarms, setAlarms] = useState([])
  
  useEffect(() => {
    fetchTurbineData()
  }, [turbineId])
  
  const fetchTurbineData = async () => {
    setLoading(true)
    try {
      console.log(`🔍 Fetching data for turbine: ${turbineId}`)
      
      // Fetch real turbine details from backend
      const detailsResponse = await turbinesAPI.getTurbineDetails(turbineId)
      setTurbineData(detailsResponse.data)
      console.log('✅ Turbine details:', detailsResponse.data)
      
      // Fetch real telemetry data from SCADA
      const telemetryResponse = await turbinesAPI.getTelemetry(turbineId, 24)
      setTelemetryData(telemetryResponse.data.telemetry || [])
      console.log(`✅ Telemetry data: ${telemetryResponse.data.telemetry?.length} points`)
      
      // Fetch real alarms based on SCADA anomalies
      const alarmsResponse = await turbinesAPI.getAlarms(turbineId, 10)
      setAlarms(alarmsResponse.data.alarms || [])
      console.log(`✅ Alarms: ${alarmsResponse.data.alarms?.length} items`)
    } catch (error) {
      console.error('Failed to fetch turbine data:', error)
      // Set empty states on error
      setTurbineData(null)
      setTelemetryData([])
      setAlarms([])
    } finally {
      setLoading(false)
    }
  }
  
  const metrics = [
    {
      label: 'Power Output',
      value: turbineData?.current_status?.power_kw 
        ? `${turbineData.current_status.power_kw.toFixed(0)} kW`
        : '--',
      icon: 'bolt',
      status: 'good',
    },
    {
      label: 'Wind Speed',
      value: turbineData?.current_status?.wind_speed_ms
        ? `${turbineData.current_status.wind_speed_ms.toFixed(1)} m/s`
        : '--',
      icon: 'air',
      status: 'good',
    },
    {
      label: 'Temperature',
      value: turbineData?.current_status?.temperature_c
        ? `${turbineData.current_status.temperature_c.toFixed(1)}°C`
        : '--',
      icon: 'thermostat',
      status: turbineData?.current_status?.temperature_c > 15 ? 'warning' : 'good',
    },
    {
      label: 'Wind Direction',
      value: turbineData?.current_status?.wind_direction_deg
        ? `${turbineData.current_status.wind_direction_deg.toFixed(0)}°`
        : '--',
      icon: 'explore',
      status: 'good',
    },
  ]
  
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30'
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'info':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }
  
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'help'
    }
  }
  
  if (loading) {
    return (
      <div className="flex min-h-screen bg-background-dark">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen bg-background-dark">
      <Sidebar />
      
      <div className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/ops-health')}
            className="flex items-center gap-1 text-gray-400 hover:text-white mb-3 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="text-sm">Back to Dashboard</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">wind_power</span>
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">
                  {turbineData?.turbine_name || `Turbine ${turbineId}`}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`size-2 rounded-full ${
                      turbineData?.current_status?.status === 'operational' ? 'bg-primary' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm text-gray-400 capitalize">
                    {turbineData?.current_status?.status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
            
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined">settings</span>
              Settings
            </button>
          </div>
        </div>
        
        {/* Real-time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics.map((metric, idx) => (
            <div key={idx} className="glass-panel rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">{metric.icon}</span>
                </div>
                <span
                  className={`size-2 rounded-full ${
                    metric.status === 'good' ? 'bg-primary' : 'bg-yellow-400'
                  }`}
                />
              </div>
              <div className="text-2xl font-black text-white mb-1">{metric.value}</div>
              <div className="text-xs text-gray-400">{metric.label}</div>
            </div>
          ))}
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Power Output (24h)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={telemetryData}>
                <defs>
                  <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b77f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b77f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="power"
                  stroke="#10b77f"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#powerGradient)"
                  name="Power (kW)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Wind Speed (24h)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={telemetryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="windSpeed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Wind Speed (m/s)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alarms & Events */}
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recent Alarms & Events</h2>
            <div className="space-y-3">
              {alarms.length > 0 ? (
                alarms.map((alarm, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${getSeverityColor(alarm.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`material-symbols-outlined ${getSeverityColor(alarm.severity)}`}>
                        {getSeverityIcon(alarm.severity)}
                      </span>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium mb-1">{alarm.message}</p>
                        <p className="text-xs text-gray-400">{alarm.time_ago || 'Historical data'}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-sm text-center py-4">
                  No recent alarms or events
                </div>
              )}
            </div>
          </div>
          
          {/* Technical Specs */}
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Technical Specifications</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-gray-400 text-sm">Manufacturer & Model</span>
                <span className="text-white font-medium">{turbineData?.model || '--'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-gray-400 text-sm">Rated Power</span>
                <span className="text-white font-medium">
                  {turbineData?.capacity_kw ? `${turbineData.capacity_kw} kW` : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-gray-400 text-sm">Rotor Diameter</span>
                <span className="text-white font-medium">
                  {turbineData?.rotor_diameter_m ? `${turbineData.rotor_diameter_m} m` : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-gray-400 text-sm">Hub Height</span>
                <span className="text-white font-medium">
                  {turbineData?.hub_height_m ? `${turbineData.hub_height_m} m` : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-gray-400 text-sm">Cut-in Speed</span>
                <span className="text-white font-medium">
                  {turbineData?.cut_in_speed_ms ? `${turbineData.cut_in_speed_ms} m/s` : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-gray-400 text-sm">Cut-out Speed</span>
                <span className="text-white font-medium">
                  {turbineData?.cut_out_speed_ms ? `${turbineData.cut_out_speed_ms} m/s` : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400 text-sm">Location</span>
                <span className="text-white font-medium">
                  {turbineData?.location ? 
                    `${turbineData.location.latitude.toFixed(4)}°, ${turbineData.location.longitude.toFixed(4)}°` 
                    : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
