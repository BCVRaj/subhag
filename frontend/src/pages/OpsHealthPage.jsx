/**
 * Operations Health Dashboard - Turbine Deep-Dive
 */
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Sidebar from '../components/common/Sidebar'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { resultsAPI, turbinesAPI, maintenanceAPI } from '../services/api'
import { useSCADAData } from '../hooks/useSCADAData'

export default function OpsHealthPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const jobId = searchParams.get('job')
  const turbineId = searchParams.get('turbine') || null
  const tabParam = searchParams.get('tab') || 'overview'
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tabParam)
  const [turbineData, setTurbineData] = useState(null)
  const [telemetryHistory, setTelemetryHistory] = useState([])
  const [overviewData, setOverviewData] = useState(null)
  const [powerCurveData, setPowerCurveData] = useState(null)
  const [liveAssetStatus, setLiveAssetStatus] = useState([])
  const [turbineList, setTurbineList] = useState([])  // Real turbine list from backend
  const [serviceHistory, setServiceHistory] = useState([])  // Service history from API
  
  // State for performance chart series toggles
  const [visibleSeries, setVisibleSeries] = useState({
    windSpeed: true,
    power: true,
    temperature: false,
    direction: false,
    pitch: false,
    yawError: false
  })
  
  const { liveData, loading: liveLoading } = useSCADAData()
  
  useEffect(() => {
    fetchTurbineList()
  }, [])
  
  // Sync activeTab with URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [searchParams])
  
  useEffect(() => {
    if (turbineList.length > 0) {
      // Set default turbineId to first turbine if not set
      if (!turbineId && turbineList.length > 0) {
        navigate(`/ops-health?turbine=${turbineList[0].turbine_id}${jobId ? `&job=${jobId}` : ''}`, { replace: true })
      }
    }
  }, [turbineList, navigate, jobId, turbineId])
  
  useEffect(() => {
    fetchTurbineData()
    fetchOverviewData()
    fetchPowerCurveData()
    fetchLiveAssetStatus()
    fetchServiceHistory()
  }, [jobId, turbineId])
  
  const fetchTurbineList = async () => {
    try {
      const response = await turbinesAPI.listTurbines()
      const turbines = response.data.turbines || []
      setTurbineList(turbines)
      console.log('✅ Turbine list loaded from API:', turbines.map(t => t.turbine_id))
    } catch (error) {
      console.error('❌ Failed to fetch turbine list:', error)
      // Fallback to R80xxx to match asset table structure  
      const fallbackTurbines = [
        { turbine_id: 'R80711', turbine_name: 'Turbine-R80711' },
        { turbine_id: 'R80721', turbine_name: 'Turbine-R80721' },
        { turbine_id: 'R80736', turbine_name: 'Turbine-R80736' },
        { turbine_id: 'R80790', turbine_name: 'Turbine-R80790' },
      ]
      setTurbineList(fallbackTurbines)
      console.log('⚠️ Using fallback turbine list:', fallbackTurbines.map(t => t.turbine_id))
    }
  }
  
  const fetchTurbineData = async () => {
    setLoading(true)
    // Fetch turbine telemetry
    if (turbineId) {
        console.log(`🔍 Fetching turbine data for: ${turbineId}`)
        
        try {
          const detailsResponse = await turbinesAPI.getTurbineDetails(turbineId)
          console.log('✅ Details response:', detailsResponse.data)
          
          const telemetryResponse = await turbinesAPI.getTelemetry(turbineId, 24)
          console.log(`✅ Telemetry response: ${telemetryResponse.data.telemetry?.length || 0} points`)
          
          // Get latest telemetry point
          const telemetryData = telemetryResponse.data.telemetry || []
          setTelemetryHistory(telemetryData)
          
          const latestTelemetry = telemetryData.slice(-1)[0] || {}
          
          // Calculate dynamic values from real data - with safe defaults
          const currentPower = parseFloat(latestTelemetry?.power) || 0
          const currentWindSpeed = parseFloat(latestTelemetry?.windSpeed) || 0
          const currentTemp = parseFloat(latestTelemetry?.temperature) || 0
          const windDirection = parseFloat(latestTelemetry?.windDirection) || 0
          const pitchAngle = parseFloat(latestTelemetry?.pitchAngle) || 0
          const yawError = parseFloat(latestTelemetry?.yawError) || 0
          
          // Calculate rotor RPM based on wind speed (realistic formula: RPM increases with wind)
          // Typical turbine: 6-18 RPM range, faster at higher wind speeds
          const calculatedRPM = currentWindSpeed > 3 
            ? (Math.min(18, 6 + (currentWindSpeed - 3) * 0.6)).toFixed(1)
            : '0.0'
          
          // Dynamic subsystems based on actual SCADA sensor readings
          
          // 1. Generator Health - based on temperature
          const generatorStatus = currentTemp > 15 ? 'WARNING' : 'NORMAL'
          const generatorDetail = currentTemp > 15 ? `High Temp: ${currentTemp.toFixed(1)}°C` : ''
          
          // 2. Pitch System Health - based on pitch angle vs wind speed relationship
          // Expected pitch: low at low wind, increases at high wind (>12 m/s) for power limiting
          const expectedPitch = currentWindSpeed > 12 ? (currentWindSpeed - 12) * 2 : 0
          const pitchDeviation = Math.abs(pitchAngle - expectedPitch)
          const pitchStatus = pitchDeviation > 15 ? 'WARNING' : 'NORMAL'
          const pitchDetail = pitchDeviation > 15 ? `Pitch Deviation: ${pitchDeviation.toFixed(1)}°` : ''
          
          // 3. Yaw System Health - based on yaw error (misalignment with wind)
          const yawStatus = yawError > 20 ? 'WARNING' : 'NORMAL'
          const yawDetail = yawError > 20 ? `Yaw Error: ${yawError.toFixed(1)}°` : ''
          
          // 4. Gearbox Health - proxy using power output efficiency
          // If wind is good but power is low, might indicate gearbox issues
          const expectedPower = currentWindSpeed > 4 ? Math.min(2050, Math.pow(currentWindSpeed, 3) * 10) : 0
          const powerEfficiency = expectedPower > 0 ? (currentPower / expectedPower) * 100 : 100
          const gearboxStatus = (currentWindSpeed > 5 && powerEfficiency < 60) ? 'WARNING' : 'NORMAL'
          const gearboxDetail = (currentWindSpeed > 5 && powerEfficiency < 60) ? `Low Efficiency: ${powerEfficiency.toFixed(0)}%` : ''
          
          // 5. Main Bearing Health - proxy using combination of factors
          // Check for anomalies: high wind, low power, normal pitch = possible bearing issues
          const bearingStatus = (currentWindSpeed > 8 && currentPower < 500 && pitchAngle < 5) ? 'WARNING' : 'NORMAL'
          const bearingDetail = (currentWindSpeed > 8 && currentPower < 500 && pitchAngle < 5) ? 'Low Power Output' : ''
          
          const dynamicSubsystems = [
            { 
              name: 'Gearbox', 
              status: gearboxStatus, 
              icon: 'settings_input_component',
              detail: gearboxDetail
            },
            { 
              name: 'Generator', 
              status: generatorStatus, 
              icon: 'electric_bolt', 
              detail: generatorDetail
            },
            { 
              name: 'Pitch System', 
              status: pitchStatus, 
              icon: 'swap_calls',
              detail: pitchDetail
            },
            { 
              name: 'Yaw System', 
              status: yawStatus, 
              icon: 'rotate_right',
              detail: yawDetail
            },
            { 
              name: 'Main Bearing', 
              status: bearingStatus, 
              icon: 'circle',
              detail: bearingDetail
            },
          ]
          
          // Safely extract model and location with fallbacks
          const model = detailsResponse.data?.model || 'Senvion MM82'
          const location = detailsResponse.data?.location || { latitude: 0, longitude: 0 }
          const status = detailsResponse.data?.current_status?.status || 'operational'
          
          setTurbineData({
            id: turbineId,
            name: turbineId,
            model: model,
            location: location,
            status: status,
            telemetry: {
              power_output: (currentPower / 1000).toFixed(2),  // Convert kW to MW
              wind_speed: currentWindSpeed.toFixed(1),
              rotor_rpm: calculatedRPM,  // DYNAMIC based on wind speed
              pitch_angle: pitchAngle.toFixed(1),  // DYNAMIC from SCADA data
              generator_temp: currentTemp.toFixed(1),
            },
            subsystems: dynamicSubsystems  // FULLY DYNAMIC based on actual SCADA sensor readings
          })
          console.log(`✅ Turbine ${turbineId} data loaded: Power=${currentPower.toFixed(0)}kW, Wind=${currentWindSpeed.toFixed(1)}m/s, RPM=${calculatedRPM}, Pitch=${pitchAngle.toFixed(1)}°, Temp=${currentTemp.toFixed(1)}°C, YawError=${yawError.toFixed(1)}°`)
        } catch (apiError) {
          console.error(`❌ Error fetching turbine ${turbineId} data:`, apiError.message)
          console.error('Full error:', apiError)
          // Set empty but valid data on API error
          setTurbineData({
            id: turbineId,
            name: turbineId,
            model: 'Data unavailable',
            location: { latitude: 0, longitude: 0 },
            status: 'unknown',
            telemetry: {
              power_output: '0.00',
              wind_speed: '0.0',
              rotor_rpm: '0.0',
              pitch_angle: '0.0',
              generator_temp: '0.0',
            },
            subsystems: [
              { name: 'Gearbox', status: 'NORMAL', icon: 'settings_input_component' },
              { name: 'Generator', status: 'NORMAL', icon: 'electric_bolt' },
              { name: 'Pitch System', status: 'NORMAL', icon: 'swap_calls' },
              { name: 'Yaw System', status: 'NORMAL', icon: 'rotate_right' },
              { name: 'Main Bearing', status: 'NORMAL', icon: 'circle' },
            ]
          })
        }
      } else {
        // No turbine selected - use placeholder
        const placeholderSubsystems = [
          { name: 'Gearbox', status: 'NORMAL', icon: 'settings_input_component' },
          { name: 'Generator', status: 'NORMAL', icon: 'electric_bolt' },
          { name: 'Pitch System', status: 'NORMAL', icon: 'swap_calls' },
          { name: 'Yaw System', status: 'NORMAL', icon: 'rotate_right' },
          { name: 'Main Bearing', status: 'NORMAL', icon: 'circle' },
        ]
        
        setTurbineData({
          id: turbineId,
          name: turbineId || 'Select a turbine',
          model: 'N/A',
          location: 'N/A',
          status: 'unknown',
          telemetry: {
            power_output: 0,
            wind_speed: 0,
            rotor_rpm: 0,
            pitch_angle: 0,
            generator_temp: 0,
          },
          subsystems: placeholderSubsystems
        })
      }
    
    setLoading(false)
  }
  
  const fetchOverviewData = async () => {
    try {
      if (jobId) {
        // Fetch energy yield and performance data if jobId exists
        console.log(`📊 Fetching overview data for job: ${jobId}, turbine: ${turbineId || 'ALL (plant-level)'}`)
        console.log(`📊 API call: /results/${jobId}/energy-yield?turbine_id=${turbineId}`)
        const [energyYieldRes, performanceRes] = await Promise.all([
          resultsAPI.getEnergyYield(jobId, turbineId),
          turbinesAPI.getPerformance(turbineId)
        ])
        
        const energyYield = energyYieldRes.data
        const performance = performanceRes.data
        
        console.log('📊 Energy yield data received:', energyYield)
        console.log('📊 Performance data received:', performance)
        console.log(`📊 Wake Losses: ${energyYield.wake_losses_percent}% | Electrical: ${energyYield.electrical_losses_percent}%`)
        console.log(`📊 Performance Index: ${energyYield.performance_index}%`)
        
        // Calculate average availability and performance index
        const avgAvailability = performance.reduce((acc, t) => acc + t.availability_percent, 0) / performance.length
        
        // Note: Backend sends performance_index as percentage (91.7 = 91.7%), keep as-is for display
        setOverviewData({
          availability: avgAvailability || energyYield.availability_percent || 98.2,
          performanceIndex: energyYield.performance_index !== null && energyYield.performance_index !== undefined ? energyYield.performance_index : 94,
          potentialEnergy: energyYield.potential_energy_gwh || 0,
          wakeLosses: energyYield.wake_losses_percent || 0,
          wakeLossesGwh: energyYield.wake_losses_gwh || 0,
          electricalLosses: energyYield.electrical_losses_percent || 0,
          electricalLossesGwh: energyYield.electrical_losses_gwh || 0,
          actualEnergy: energyYield.actual_energy_gwh || 0,
          downtime: avgAvailability ? (100 - avgAvailability) : 3.2
        })
        console.log(`✅ Overview data set: Wake=${energyYield.wake_losses_percent?.toFixed(2)}%, Elec=${energyYield.electrical_losses_percent?.toFixed(2)}%, Avail=${avgAvailability?.toFixed(1)}%, PI=${energyYield.performance_index?.toFixed(1)}%`)
      } else {
        // No jobId - fetch turbine performance and use fallback for energy data
        const performanceRes = await turbinesAPI.getPerformance(turbineId)
        const performance = performanceRes.data
        const avgAvailability = performance.reduce((acc, t) => acc + t.availability_percent, 0) / performance.length
        
        setOverviewData({
          availability: avgAvailability || 98.2,
          performanceIndex: 94,
          potentialEnergy: 100,
          wakeLosses: 8.5,
          electricalLosses: 1.8,
          downtime: 3.2,
          actualEnergy: 86.5
        })
      }
    } catch (error) {
      console.error('Failed to fetch overview data:', error)
      // Fallback data
      setOverviewData({
        availability: 98.2,
        performanceIndex: 0.94,
        potentialEnergy: 100,
        wakeLosses: 8.5,
        electricalLosses: 1.8,
        downtime: 3.2,
        actualEnergy: 86.5
      })
    }
  }
  
  const fetchPowerCurveData = async () => {
    try {
      if (jobId) {
        // Fetch power curve data if jobId exists
        console.log(`📈 Fetching power curve data for job: ${jobId}, turbine: ${turbineId || 'ALL (plant-level)'}`)
        const response = await resultsAPI.getPowerCurve(jobId, turbineId)
        const data = response.data
        
        console.log('📈 Power curve data received:', data)
        console.log(`📈 Observed points: ${data.observed_curve?.length || 0}, Warranted points: ${data.warranted_curve?.length || 0}`)
        console.log(`📈 Performance gap: ${data.performance_gap_percent}%, Turbulence: ${data.turbulence_intensity}%`)
        
        // Generate wind speed distribution from power curve data
        let windSpeedDist = {}
        if (data.wind_distribution && data.wind_distribution.length > 0) {
          // Use backend's calculated distribution (from real SCADA data)
          console.log('📊 Using real wind distribution from SCADA data')
          data.wind_distribution.forEach(bin => {
            windSpeedDist[bin.wind_speed] = bin.frequency_percent
          })
        } else if (data.observed_curve && data.observed_curve.length > 0) {
          // Fallback: derive from observed curve bins
          console.log('⚠️ Fallback: deriving distribution from power curve')
          data.observed_curve.forEach(point => {
            const bin = Math.floor(point.wind_speed / 2.5) * 2.5
            windSpeedDist[bin] = (windSpeedDist[bin] || 0) + 1
          })
          console.log(`📊 Wind speed distribution generated:`, windSpeedDist)
        } else {
          // Final fallback: Create demo distribution if no data
          console.log('⚠️ No data available, using demo distribution')
          windSpeedDist = { 0: 5, 2.5: 15, 5: 25, 7.5: 35, 10: 30, 12.5: 20, 15: 12, 17.5: 8 }
        }
        
        setPowerCurveData({
          observedCurve: data.observed_curve || [],
          warrantedCurve: data.warranted_curve || [],
          performanceGap: data.performance_gap_percent || -4.2,
          windSpeedDist: windSpeedDist,
          turbulenceIntensity: data.turbulence_intensity || 12.1
        })
        console.log('✅ Power curve data set - windSpeedDist:', Object.keys(windSpeedDist).length, 'bins')
      } else {
        // No jobId - use demonstration data
        setPowerCurveData({
          observedCurve: [],
          warrantedCurve: [],
          performanceGap: -4.2,
          windSpeedDist: { 0: 5, 2.5: 15, 5: 25, 7.5: 35, 10: 30, 12.5: 20, 15: 12, 17.5: 8, 20: 5, 22.5: 3 },
          turbulenceIntensity: 12.1
        })
      }
    } catch (error) {
      console.error('Failed to fetch power curve data:', error)
      // Fallback with demonstration data
      setPowerCurveData({
        observedCurve: [],
        warrantedCurve: [],
        performanceGap: -4.2,
        windSpeedDist: { 0: 5, 2.5: 15, 5: 25, 7.5: 35, 10: 30, 12.5: 20, 15: 12, 17.5: 8, 20: 5, 22.5: 3 },
        turbulenceIntensity: 12.1
      })
    }
  }
  
  const fetchLiveAssetStatus = async () => {
    try {
      const response = await turbinesAPI.getLiveStatus()
      setLiveAssetStatus(response.data.turbines || [])
      console.log('🔴 Live asset status loaded:', response.data.turbines?.length, 'turbines')
    } catch (error) {
      console.error('Failed to fetch live asset status:', error)
      // Use turbine list for fallback with deterministic status
      const fallbackStatus = turbineList.length > 0 
        ? turbineList.map((turbine, i) => ({
            turbine_id: turbine.turbine_id,
            status: i === 2 ? 'warning' : 'normal',  // Third turbine has warning
            power_output: 1.5 + (i * 0.1),
            availability: 96.5
          }))
        : [
            { turbine_id: 'R80711', status: 'normal', power_output: 1.8, availability: 96.5 },
            { turbine_id: 'R80721', status: 'normal', power_output: 1.6, availability: 96.5 },
            { turbine_id: 'R80736', status: 'warning', power_output: 1.5, availability: 92.0 },
            { turbine_id: 'R80790', status: 'normal', power_output: 1.9, availability: 96.5 },
          ];
      setLiveAssetStatus(fallbackStatus)
      console.log('⚠️ Using fallback status for', fallbackStatus.length, 'turbines')
    }
  }
  
  const fetchServiceHistory = async () => {
    try {
      const response = await maintenanceAPI.getHistory(turbineId)
      const history = response.data.history || []
      
      // Transform to match component format
      const formattedHistory = history.map(record => ({
        date: new Date(record.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        task: record.task,
        technician: record.technician,
        status: record.status,
        statusColor: record.status === 'Completed' ? 'text-primary' : 
                     record.status === 'Deferred' ? 'text-accent-amber' : 'text-slate-400',
        highlight: record.status === 'Deferred'
      }))
      
      setServiceHistory(formattedHistory)
      console.log('✅ Service history loaded:', formattedHistory.length, 'records')
    } catch (error) {
      console.error('❌ Failed to fetch service history:', error)
      // Fallback data
      setServiceHistory([
        {
          date: 'Oct 24, 2023',
          task: 'Scheduled Lube & Filter Change',
          technician: 'M. Richards',
          status: 'Completed',
          statusColor: 'text-primary'
        },
        {
          date: 'Sep 12, 2023',
          task: 'Pitch Actuator Calibration',
          technician: 'D. Vogel',
          status: 'Completed',
          statusColor: 'text-primary'
        },
        {
          date: 'Aug 05, 2023',
          task: 'Generator Bearing Inspection',
          technician: 'S. Chen',
          status: 'Deferred',
          statusColor: 'text-accent-amber',
          highlight: true
        },
      ])
    }
  }
  
  // Performance history for 24h chart - use real telemetry or mock data
  const performanceHistory = telemetryHistory.length > 0 
    ? telemetryHistory.slice(-10).map(point => ({
        time: point.time,
        height: Math.min(100, (point.windSpeed / 25) * 100),  // Scale wind speed 0-25 m/s to 0-100%
        power: Math.min(100, (point.power / 2050) * 100)  // Scale power 0-2050 kW to 0-100%
      }))
    : Array.from({ length: 10 }, (_, i) => ({
        time: `${i * 2.4}h`,
        height: 30 + Math.random() * 40,
        power: 40 + Math.random() * 50
      }))
  
  if (loading || !turbineData) {
    return (
      <div className="flex min-h-screen bg-background-dark">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex h-screen overflow-hidden bg-background-dark">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Navigation Tabs */}
        <header className="border-b border-border-dark sticky top-0 bg-background-dark/80 backdrop-blur-md z-10">
          <div className="flex px-8 gap-8">
            <button 
              onClick={() => {
                setActiveTab('overview')
                navigate(`/ops-health${turbineId ? `?turbine=${turbineId}` : ''}${jobId ? `${turbineId ? '&' : '?'}job=${jobId}` : ''}`)
              }}
              className={`py-4 text-sm font-semibold transition-all border-b-2 ${
                activeTab === 'overview'
                  ? 'text-primary border-primary'
                  : 'text-slate-500 hover:text-slate-300 border-transparent'
              }`}
            >
              Overview
            </button>
            <button 
              onClick={() => {
                setActiveTab('power-curve')
                navigate(`/ops-health?tab=power-curve${turbineId ? `&turbine=${turbineId}` : ''}${jobId ? `&job=${jobId}` : ''}`)
              }}
              className={`py-4 text-sm font-semibold transition-all border-b-2 ${
                activeTab === 'power-curve'
                  ? 'text-primary border-primary'
                  : 'text-slate-500 hover:text-slate-300 border-transparent'
              }`}
            >
              Power Curve
            </button>
            <button 
              onClick={() => {
                setActiveTab('turbine-deep-dive')
                navigate(`/ops-health?tab=turbine-deep-dive${turbineId ? `&turbine=${turbineId}` : ''}${jobId ? `&job=${jobId}` : ''}`)
              }}
              className={`py-4 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'turbine-deep-dive'
                  ? 'text-primary border-primary'
                  : 'text-slate-500 hover:text-slate-300 border-transparent'
              }`}
            >
              Turbine Deep-Dive
            </button>
          </div>
        </header>
        
        <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Overview Tab Content */}
          {activeTab === 'overview' && !overviewData && (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner />
            </div>
          )}
          {activeTab === 'overview' && overviewData && (
            <div className="space-y-4">
              {/* Turbine Identifier Banner - only show when turbineId is selected */}
              {turbineId && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">wind_power</span>
                  <div>
                    <p className="text-white font-bold text-sm">Turbine-Specific View</p>
                    <p className="text-primary text-xs font-semibold">Showing data for {turbineId}</p>
                  </div>
                </div>
              )}
              {/* Tab Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">insights</span>
                  <h2 className="text-lg font-bold text-white">Operations Overview</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark border border-border-dark rounded-lg">
                    <span className="text-slate-400 text-xs font-medium">Asset:</span>
                    <select 
                      value={turbineId || (turbineList.length > 0 ? turbineList[0].turbine_id : '')}
                      onChange={(e) => navigate(`/ops-health?turbine=${e.target.value}${jobId ? `&job=${jobId}` : ''}`)}
                      className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
                    >
                      {turbineList.map((turbine) => (
                        <option key={turbine.turbine_id} value={turbine.turbine_id} className="bg-surface-dark text-white">
                          {turbine.turbine_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg cursor-pointer hover:bg-surface-dark/80 transition-colors">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_today</span>
                    <span className="text-white text-sm font-semibold">Last 30 Days</span>
                  </div>
                </div>
              </div>
              
              {/* Top KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Availability Card */}
                <div className="bg-surface-dark border border-border-dark rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">AVAILABILITY</h3>
                    <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-black text-white">{overviewData.availability.toFixed(1)}%</span>
                  </div>
                  {turbineId && (
                    <div className="text-[10px] text-slate-500 font-semibold">
                      Turbine: {turbineId}
                    </div>
                  )}
                </div>
                
                {/* Performance Index Card */}
                <div className="bg-surface-dark border border-border-dark rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">PERFORMANCE INDEX</h3>
                    <span className="material-symbols-outlined text-accent-amber text-lg">speed</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{overviewData.performanceIndex.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              {/* Energy Yield Analysis */}
              <div className="bg-surface-dark border border-border-dark rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">bar_chart</span>
                    <h3 className="text-sm font-bold text-white">Energy Yield Analysis</h3>
                    {turbineId && (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded font-bold">
                        {turbineId}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">Last 30 Days</span>
                </div>
                
                <div className="h-56 flex items-end justify-center gap-6 px-4">
                  {/* Potential Energy */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[100px]">
                    <div className="w-full bg-primary rounded-t relative" style={{ height: '190px' }}>
                      <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white/80">{overviewData.potentialEnergy?.toFixed(2)} GWh</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-300 text-center">Potential<br/>Energy</span>
                  </div>
                  
                  {/* Wake Losses */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[100px]">
                    <div className="w-full bg-accent-red/70 rounded-t relative" style={{ height: `${(overviewData.wakeLosses / overviewData.potentialEnergy) * 190 || 95}px` }}>
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-accent-red whitespace-nowrap">-{overviewData.wakeLosses.toFixed(2)}%</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-300 text-center">Wake<br/>Losses</span>
                  </div>
                  
                  {/* Downtime */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[100px]">
                    <div className="w-full bg-accent-red/70 rounded-t relative" style={{ height: `${(overviewData.downtime / 100) * 190 || 10}px` }}>
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-accent-red">-{overviewData.downtime.toFixed(1)}%</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-300 text-center">Downtime</span>
                  </div>
                  
                  {/* Electrical */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[100px]">
                    <div className="w-full bg-accent-amber/70 rounded-t relative" style={{ height: `${(overviewData.electricalLosses / overviewData.potentialEnergy) * 190 || 48}px` }}>
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-accent-amber whitespace-nowrap">-{overviewData.electricalLosses.toFixed(2)}%</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-300 text-center">Electrical</span>
                  </div>
                  
                  {/* Actual Energy */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[100px]">
                    <div className="w-full bg-primary rounded-t relative" style={{ height: `${((100 - overviewData.wakeLosses - overviewData.downtime - overviewData.electricalLosses) / 100) * 190}px` }}>
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-primary">{(100 - overviewData.wakeLosses - overviewData.downtime - overviewData.electricalLosses).toFixed(1)}%</span>
                      <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white/80">{overviewData.actualEnergy?.toFixed(2)} GWh</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-300 text-center">Actual<br/>Energy</span>
                  </div>
                </div>
              </div>
              
              {/* Live Asset Status */}
              <div className="bg-surface-dark border border-border-dark rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">grid_view</span>
                    <h3 className="text-sm font-bold text-white">Live Asset Status</h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-primary"></span>
                      <span className="text-slate-400">Normal ({liveAssetStatus.filter(t => t.status === 'normal').length})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-accent-amber"></span>
                      <span className="text-slate-400">Warning ({liveAssetStatus.filter(t => t.status === 'warning').length})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-accent-red"></span>
                      <span className="text-slate-400">Critical ({liveAssetStatus.filter(t => t.status === 'critical').length})</span>
                    </div>
                  </div>
                </div>
                
                {/* Hexagonal Grid */}
                <div className="grid grid-cols-10 gap-3">
                  {liveAssetStatus.map((turbine, idx) => {
                    const statusColor = turbine.status === 'critical' ? 'bg-accent-red/30 border-accent-red' : 
                                       turbine.status === 'warning' ? 'bg-accent-amber/30 border-accent-amber' : 
                                       'bg-primary/30 border-primary'
                    return (
                      <div 
                        key={turbine.turbine_id}
                        className="relative w-full aspect-square hover:scale-110 transition-transform cursor-pointer"
                        title={`${turbine.turbine_id} - ${turbine.status.toUpperCase()}`}
                      >
                        {/* Hexagon SVG */}
                        <svg 
                          viewBox="0 0 100 100" 
                          className="absolute inset-0 w-full h-full"
                        >
                          {/* Hexagon background */}
                          <polygon 
                            points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                            className={turbine.status === 'critical' ? 'fill-accent-red/20' : 
                                      turbine.status === 'warning' ? 'fill-accent-amber/20' : 
                                      'fill-primary/20'}
                          />
                          {/* Hexagon border */}
                          <polygon 
                            points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                            className={turbine.status === 'critical' ? 'stroke-accent-red' : 
                                      turbine.status === 'warning' ? 'stroke-accent-amber' : 
                                      'stroke-primary'}
                            strokeWidth="3"
                            fill="none"
                          />
                          {/* Text */}
                          <text 
                            x="50" 
                            y="55" 
                            textAnchor="middle" 
                            className="text-[14px] font-bold fill-white"
                            style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif' }}
                          >
                            {turbine.turbine_id}
                          </text>
                        </svg>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Power Curve Tab Content */}
          {activeTab === 'power-curve' && !powerCurveData && (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner />
            </div>
          )}
          {activeTab === 'power-curve' && powerCurveData && (
            <div className="space-y-6">
              {/* Turbine Identifier Banner - only show when turbineId is selected */}
              {turbineId && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">wind_power</span>
                  <div>
                    <p className="text-white font-bold text-sm">Turbine-Specific View</p>
                    <p className="text-primary text-xs font-semibold">Showing data for {turbineId}</p>
                  </div>
                </div>
              )}
              
              {/* Power Curve Section */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">show_chart</span>
                    <h2 className="text-lg font-bold text-white">Power Curve Analysis</h2>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark border border-border-dark rounded-lg">
                    <span className="text-slate-400 text-xs font-medium">Asset:</span>
                    <select 
                      value={turbineId || (turbineList.length > 0 ? turbineList[0].turbine_id : '')}
                      onChange={(e) => navigate(`/ops-health?turbine=${e.target.value}${jobId ? `&job=${jobId}` : ''}`)}
                      className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
                    >
                      {turbineList.map((turbine) => (
                        <option key={turbine.turbine_id} value={turbine.turbine_id} className="bg-surface-dark text-white">
                          {turbine.turbine_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark border border-border-dark rounded-lg cursor-pointer hover:bg-surface-dark/80 transition-colors">
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">calendar_today</span>
                    <span className="text-white text-xs font-semibold">Last 30 Days</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Power Curve Chart (2/3 width) */}
                <div className="lg:col-span-2 bg-surface-dark border border-border-dark rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary text-base">show_chart</span>
                    <h3 className="text-base font-bold text-white">Observed vs. Warranted Power Curve</h3>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-4 mb-4 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-slate-400"></span>
                      <span className="text-slate-400">Warranted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-primary"></span>
                      <span className="text-primary">Normal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-0.5 bg-accent-amber"></span>
                      <span className="text-accent-amber">Underperformance</span>
                    </div>
                  </div>
                  
                  {/* Power Curve Visualization */}
                  <div className="relative h-56 bg-slate-900/30 rounded-lg p-4">
                    {(() => {
                      // Calculate max power for scaling from actual data
                      const maxPower = powerCurveData.warrantedCurve && powerCurveData.warrantedCurve.length > 0
                        ? Math.max(...powerCurveData.warrantedCurve.map(p => p.power), ...powerCurveData.observedCurve.map(p => p.power))
                        : 2400;
                      
                      const maxWindSpeed = 25;
                      
                      // Generate Y-axis labels dynamically
                      const yAxisLabels = [
                        Math.round(maxPower),
                        Math.round(maxPower * 0.625),
                        Math.round(maxPower * 0.417),
                        Math.round(maxPower * 0.208),
                        0
                      ];
                      
                      // Function to generate SVG path from curve data
                      const generatePath = (curveData) => {
                        if (!curveData || curveData.length === 0) return "";
                        
                        return curveData.map((point, i) => {
                          const x = (point.wind_speed / maxWindSpeed) * 100;
                          const y = 100 - (point.power / maxPower) * 100;
                          return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                        }).join(' ');
                      };
                      
                      // Identify underperformance points (where observed < warranted significantly)
                      const underperformancePoints = powerCurveData.observedCurve && powerCurveData.warrantedCurve
                        ? powerCurveData.observedCurve
                            .map((obs, i) => {
                              const warrant = powerCurveData.warrantedCurve[i];
                              if (warrant && obs.power > 0 && warrant.power > 0) {
                                const gap = ((warrant.power - obs.power) / warrant.power) * 100;
                                if (gap > 5 && obs.wind_speed > 3 && obs.wind_speed < 20) {
                                  return {
                                    x: (obs.wind_speed / maxWindSpeed) * 100,
                                    y: 100 - (obs.power / maxPower) * 100
                                  };
                                }
                              }
                              return null;
                            })
                            .filter(p => p !== null)
                        : [];
                      
                      return (
                        <>
                          {/* Y-axis labels */}
                          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-slate-600 font-bold py-6">
                            {yAxisLabels.map((label, i) => (
                              <span key={i}>{label}</span>
                            ))}
                          </div>
                          
                          {/* Chart area */}
                          <div className="ml-6 h-full relative">
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex flex-col justify-between">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="w-full border-t border-slate-800"></div>
                              ))}
                            </div>
                            
                            {/* Warranted curve (gray line) */}
                            {powerCurveData.warrantedCurve && powerCurveData.warrantedCurve.length > 0 && (
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path 
                                  d={generatePath(powerCurveData.warrantedCurve)}
                                  stroke="#64748b" 
                                  strokeWidth="0.5" 
                                  fill="none"
                                  vectorEffect="non-scaling-stroke"
                                />
                              </svg>
                            )}
                            
                            {/* Observed curve (green line) */}
                            {powerCurveData.observedCurve && powerCurveData.observedCurve.length > 0 && (
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path 
                                  d={generatePath(powerCurveData.observedCurve)}
                                  stroke="#10b77f" 
                                  strokeWidth="0.5" 
                                  fill="none"
                                  vectorEffect="non-scaling-stroke"
                                />
                              </svg>
                            )}
                            
                            {/* Underperformance points (amber) */}
                            {underperformancePoints.length > 0 && (
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                {underperformancePoints.map((point, i) => (
                                  <circle 
                                    key={i}
                                    cx={point.x} 
                                    cy={point.y} 
                                    r="0.8" 
                                    fill="#F59E0B"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                ))}
                              </svg>
                            )}
                          </div>
                          
                          {/* X-axis labels */}
                          <div className="absolute bottom-0 left-6 right-0 flex justify-between text-[10px] text-slate-600 font-bold">
                            <span>0</span>
                            <span>5</span>
                            <span>10</span>
                            <span>15</span>
                            <span>20</span>
                            <span>25</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-[10px] text-slate-500 font-semibold -rotate-90 w-4">Power Output (kW)</p>
                    <p className="text-[10px] text-slate-500 text-center font-semibold flex-1">Wind Speed (m/s)</p>
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  {/* Performance Gap Card */}
                  <div className="bg-surface-dark border border-border-dark rounded-lg p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">PERFORMANCE GAP</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-accent-red text-xl">trending_down</span>
                      <span className="text-3xl font-black text-white">{powerCurveData.performanceGap}%</span>
                    </div>
                    <p className="text-xs text-accent-red font-bold mb-3">Below Warranty</p>
                    <p className="text-xs text-slate-500 leading-relaxed">Deviation from manufacturer curve calculated over selected period.</p>
                  </div>
                  
                  {/* Wind Speed Distribution */}
                  <div className="bg-surface-dark border border-border-dark rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-primary text-base">bar_chart</span>
                      <h3 className="text-xs font-bold text-white">Wind Speed Distribution</h3>
                    </div>
                    
                    {/* Histogram */}
                    <div className="h-28 flex items-end justify-between gap-1">
                      {(() => {
                        const entries = Object.entries(powerCurveData.windSpeedDist || {});
                        // Sort bins by numeric value
                        const sortedEntries = entries.sort((a, b) => Number(a[0]) - Number(b[0]));
                        const displayEntries = sortedEntries.length > 0 ? sortedEntries.slice(0, 8) : 
                          // Fallback display bins if no data
                          [[0, 5], [2.5, 15], [5, 25], [7.5, 35], [10, 30], [12.5, 20], [15, 12], [17.5, 8]];
                        
                        const maxCount = displayEntries.length > 0 
                          ? Math.max(...displayEntries.map(([_, count]) => count))
                          : 1;
                        
                        return displayEntries.map(([bin, count], idx) => {
                          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          return (
                            <div key={`${bin}-${idx}`} className="flex-1 flex flex-col items-center gap-1">
                              <div className="w-full bg-primary rounded-t" style={{ height: `${Math.max(height, 2)}%`, minHeight: '2px' }}></div>
                              <span className="text-[8px] text-slate-600 font-bold">{Number(bin).toFixed(1)}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    
                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Mean Wind Speed</span>
                        <span className="text-white font-bold">
                          {(() => {
                            // Calculate mean wind speed from observed curve data
                            if (powerCurveData.observedCurve && powerCurveData.observedCurve.length > 0) {
                              const validPoints = powerCurveData.observedCurve.filter(p => p.power > 0);
                              if (validPoints.length > 0) {
                                const weightedSum = validPoints.reduce((sum, p) => sum + (p.wind_speed * p.power), 0);
                                const totalPower = validPoints.reduce((sum, p) => sum + p.power, 0);
                                return totalPower > 0 ? (weightedSum / totalPower).toFixed(1) : '8.4';
                              }
                            }
                            return '8.4';
                          })()} m/s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Turbulence Intensity</span>
                        <span className="text-white font-bold">
                          {powerCurveData.turbulenceIntensity 
                            ? (powerCurveData.turbulenceIntensity > 1 
                                ? powerCurveData.turbulenceIntensity.toFixed(1) 
                                : (powerCurveData.turbulenceIntensity * 100).toFixed(1))
                            : '12.1'}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recent Alerts - Hidden until alert system is implemented */}
              {/* <div className="bg-surface-dark border border-border-dark rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-white">Recent Alerts</h3>
                  <button className="text-xs font-bold text-primary hover:underline">View All</button>
                </div>
                <div className="text-center py-8 text-slate-500 text-sm">
                  No active alerts
                </div>
              </div> */}
            </div>
          )}

          {/* Turbine Deep-Dive Tab Content */}
          {activeTab === 'turbine-deep-dive' && !turbineData && (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner />
            </div>
          )}
          {activeTab === 'turbine-deep-dive' && turbineData && (
            <>
              {/* Turbine Identifier Banner - only show when turbineId is selected */}
              {turbineId && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-primary text-xl">wind_power</span>
                  <div>
                    <p className="text-white font-bold text-sm">Turbine-Specific Deep Dive</p>
                    <p className="text-primary text-xs font-semibold">Showing detailed data for {turbineId}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-surface-dark border border-border-dark rounded-lg">
                    <span className="text-slate-400 text-xs font-medium">Asset:</span>
                    <select 
                      value={turbineId || (turbineList.length > 0 ? turbineList[0].turbine_id : '')}
                      onChange={(e) => navigate(`/ops-health?turbine=${e.target.value}${jobId ? `&job=${jobId}` : ''}&tab=turbine-deep-dive`)}
                      className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
                    >
                      {turbineList.map((turbine) => (
                        <option key={turbine.turbine_id} value={turbine.turbine_id} className="bg-surface-dark text-white">
                          {turbine.turbine_id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              {/* Asset Header */}
              <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black text-white tracking-tight">
                  Turbine {turbineData?.name || turbineId}
                </h2>
                {turbineData?.status === 'warning' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber text-[10px] font-bold uppercase tracking-wider border border-accent-amber/30 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span> Warning
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm font-medium">
                Model: <span className="text-slate-200">{turbineData?.model || 'Loading...'}</span> • Location: <span className="text-slate-200">
                  {typeof turbineData?.location === 'object' 
                    ? `${turbineData.location.latitude?.toFixed(2)}°, ${turbineData.location.longitude?.toFixed(2)}°` 
                    : turbineData?.location || 'Loading...'}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors text-white">
                Export Logs
              </button>
              <button className="px-4 py-2 bg-primary text-background-dark rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
                Schedule Service
              </button>
            </div>
          </div>
          
          {/* Live Telemetry Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-card border border-white/5 p-5 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Power Output</span>
                <span className="material-symbols-outlined text-primary text-sm">bolt</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  {turbineData.telemetry?.power_output || 0}
                </span>
                <span className="text-slate-400 font-medium">MW</span>
              </div>
            </div>
            
            <div className="bg-slate-card border border-white/5 p-5 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Wind Speed</span>
                <span className="material-symbols-outlined text-sky-400 text-sm">air</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  {turbineData.telemetry?.wind_speed || 0}
                </span>
                <span className="text-slate-400 font-medium">m/s</span>
              </div>
              <div className="mt-3 text-slate-500 text-[10px] font-medium uppercase tracking-tight">Optimal Range</div>
            </div>
            
            <div className="bg-slate-card border border-white/5 p-5 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Rotor RPM</span>
                <span className="material-symbols-outlined text-purple-400 text-sm">autorenew</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  {turbineData.telemetry?.rotor_rpm || 0}
                </span>
                <span className="text-slate-400 font-medium">RPM</span>
              </div>
              <div className="mt-3 text-slate-500 text-[10px] font-medium uppercase tracking-tight">Synchronized</div>
            </div>
            
            <div className="bg-slate-card border border-white/5 p-5 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pitch Angle</span>
                <span className="material-symbols-outlined text-indigo-400 text-sm">text_rotation_angleup</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  {turbineData.telemetry?.pitch_angle || 0}
                </span>
                <span className="text-slate-400 font-medium">°</span>
              </div>
              <div className="mt-3 text-slate-500 text-[10px] font-medium uppercase tracking-tight">Active Regulation</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Performance Chart (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">
              {(() => {
                // Calculate statistics from telemetryHistory
                const calculateStats = () => {
                  if (!telemetryHistory || telemetryHistory.length === 0) {
                    return {
                      avgWind: 0, maxWind: 0,
                      avgPower: 0, maxPower: 0
                    }
                  }
                  
                  const winds = telemetryHistory.map(p => parseFloat(p.windSpeed) || 0)
                  const powers = telemetryHistory.map(p => parseFloat(p.power) || 0)
                  
                  return {
                    avgWind: (winds.reduce((a, b) => a + b, 0) / winds.length).toFixed(1),
                    maxWind: Math.max(...winds).toFixed(1),
                    avgPower: (powers.reduce((a, b) => a + b, 0) / powers.length).toFixed(0),
                    maxPower: Math.max(...powers).toFixed(0)
                  }
                }
                
                const stats = calculateStats()
                
                const toggleSeries = (seriesName) => {
                  setVisibleSeries(prev => ({
                    ...prev,
                    [seriesName]: !prev[seriesName]
                  }))
                }
                
                const seriesConfig = [
                  { key: 'windSpeed', label: 'Wind Speed', color: '#10b981', icon: 'air' },
                  { key: 'power', label: 'Power', color: '#10b77f', icon: 'bolt' },
                  { key: 'temperature', label: 'Temperature', color: '#f97316', icon: 'thermostat' },
                  { key: 'windDirection', label: 'Direction', color: '#8b5cf6', icon: 'explore' },
                  { key: 'pitchAngle', label: 'Pitch', color: '#ec4899', icon: 'text_rotation_angleup' },
                  { key: 'yawError', label: 'Yaw Error', color: '#eab308', icon: 'sync_problem' },
                ]
                
                return (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <h3 className="text-lg font-bold text-white">Wind Speed & Power Over Time</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {seriesConfig.map((series) => (
                          <button
                            key={series.key}
                            onClick={() => toggleSeries(series.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              visibleSeries[series.key]
                                ? 'bg-white/10 border border-white/20 text-white shadow-sm'
                                : 'bg-transparent border border-white/5 text-slate-500 hover:bg-white/5'
                            }`}
                            style={visibleSeries[series.key] ? { borderColor: series.color + '40', backgroundColor: series.color + '15' } : {}}
                          >
                            <span className="material-symbols-outlined text-sm" style={{ color: visibleSeries[series.key] ? series.color : '' }}>
                              {series.icon}
                            </span>
                            <span>{series.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {visibleSeries.windSpeed && (
                        <>
                          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Avg Wind</div>
                            <div className="text-xl font-black text-white">{stats.avgWind} <span className="text-sm font-medium text-slate-400">m/s</span></div>
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Max Wind</div>
                            <div className="text-xl font-black text-white">{stats.maxWind} <span className="text-sm font-medium text-slate-400">m/s</span></div>
                          </div>
                        </>
                      )}
                      {visibleSeries.power && (
                        <>
                          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Avg Power</div>
                            <div className="text-xl font-black text-white">{stats.avgPower} <span className="text-sm font-medium text-slate-400">kW</span></div>
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Max Power</div>
                            <div className="text-xl font-black text-white">{stats.maxPower} <span className="text-sm font-medium text-slate-400">kW</span></div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="bg-slate-card border border-white/5 rounded-xl p-6 h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={telemetryHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                          <XAxis 
                            dataKey="time" 
                            stroke="#9ca3af" 
                            style={{ fontSize: '11px' }}
                            interval="preserveStartEnd"
                          />
                          <YAxis 
                            yAxisId="left"
                            stroke="#9ca3af" 
                            style={{ fontSize: '11px' }}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke="#9ca3af" 
                            style={{ fontSize: '11px' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1e293b', 
                              border: '1px solid #334155', 
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '12px' }}
                            iconType="line"
                          />
                          {visibleSeries.windSpeed && (
                            <Line 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="windSpeed" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              dot={false}
                              name="Wind Speed (m/s)"
                            />
                          )}
                          {visibleSeries.power && (
                            <Line 
                              yAxisId="left"
                              type="monotone" 
                              dataKey={(data) => (data.power / 100).toFixed(1)} 
                              stroke="#10b77f" 
                              strokeWidth={2}
                              dot={false}
                              name="Power (kW/100)"
                            />
                          )}
                          {visibleSeries.temperature && (
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="temperature" 
                              stroke="#f97316" 
                              strokeWidth={2}
                              dot={false}
                              name="Temperature (°C)"
                            />
                          )}
                          {visibleSeries.windDirection && (
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="windDirection" 
                              stroke="#8b5cf6" 
                              strokeWidth={2}
                              dot={false}
                              name="Direction (°)"
                            />
                          )}
                          {visibleSeries.pitchAngle && (
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="pitchAngle" 
                              stroke="#ec4899" 
                              strokeWidth={2}
                              dot={false}
                              name="Pitch (°)"
                            />
                          )}
                          {visibleSeries.yawError && (
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="yawError" 
                              stroke="#eab308" 
                              strokeWidth={2}
                              dot={false}
                              name="Yaw Error (°)"
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )
              })()}
            </div>
            
            {/* Component Health (1/3 width) */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Sub-System Health</h3>
              <div className="bg-slate-card border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                {(turbineData.subsystems || []).map((subsystem, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors group ${
                      subsystem.status === 'WARNING' ? 'bg-accent-red/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${
                        subsystem.status === 'WARNING' ? 'text-accent-red' : 'text-slate-500 group-hover:text-primary'
                      } transition-colors`}>
                        {subsystem.icon}
                      </span>
                      <span className={`text-sm font-semibold ${
                        subsystem.status === 'WARNING' ? 'text-white' : 'text-slate-300'
                      }`}>
                        {subsystem.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        subsystem.status === 'WARNING'
                          ? 'text-accent-red bg-accent-red/10'
                          : 'text-primary bg-primary/10'
                      }`}>
                        {subsystem.status}
                      </span>
                      {subsystem.detail && (
                        <p className="text-[9px] text-accent-red/70 mt-1 uppercase font-bold tracking-tighter">
                          {subsystem.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Service History Table */}
          <div className="space-y-4 pb-12">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Service History</h3>
              <button className="text-xs font-bold text-primary hover:underline">View All Records</button>
            </div>
            <div className="bg-slate-card border border-white/5 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5 text-[11px] uppercase tracking-widest font-bold text-slate-500">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Task / Description</th>
                    <th className="px-6 py-3">Technician</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                  {serviceHistory.map((record, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className={`px-6 py-4 ${record.highlight ? 'text-accent-amber' : ''}`}>
                        {record.date}
                      </td>
                      <td className="px-6 py-4">{record.task}</td>
                      <td className="px-6 py-4">{record.technician}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-xs font-bold ${record.statusColor}`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
