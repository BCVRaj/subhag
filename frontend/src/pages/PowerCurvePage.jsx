/**
 * Power Curve Analysis Page
 */
import { useState, useEffect } from 'react'
import { ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import Sidebar from '../components/common/Sidebar'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { analysisAPI } from '../services/api'

export default function PowerCurvePage() {
  const [loading, setLoading] = useState(false)
  const [powerCurveData, setPowerCurveData] = useState(null)
  const [selectedTurbine, setSelectedTurbine] = useState('all')
  const [viewMode, setViewMode] = useState('scatter') // scatter | binned
  
  // Mock power curve data
  const observedData = Array.from({ length: 50 }, (_, i) => ({
    windSpeed: 3 + (i * 0.4),
    power: Math.min(2000, Math.max(0, (3 + i * 0.4 - 3) ** 3 * 50 + (Math.random() - 0.5) * 200)),
  }))
  
  const warranted = Array.from({ length: 30 }, (_, i) => ({
    windSpeed: 3 + i * 0.5,
    power: Math.min(2000, (3 + i * 0.5 - 3) ** 3 * 50),
  }))
  
  const binnedData = [
    { bin: '3-4', observed: 125, warranted: 130, count: 245 },
    { bin: '4-5', observed: 280, warranted: 290, count: 412 },
    { bin: '5-6', observed: 485, warranted: 500, count: 568 },
    { bin: '6-7', observed: 720, warranted: 750, count: 632 },
    { bin: '7-8', observed: 980, warranted: 1020, count: 589 },
    { bin: '8-9', observed: 1250, warranted: 1300, count: 534 },
    { bin: '9-10', observed: 1520, warranted: 1580, count: 478 },
    { bin: '10-11', observed: 1750, warranted: 1820, count: 412 },
    { bin: '11-12', observed: 1920, warranted: 1960, count: 356 },
    { bin: '12-13', observed: 1980, warranted: 2000, count: 289 },
  ]
  
  const performanceMetrics = [
    {
      label: 'Observed AEP',
      value: '238.4 GWh',
      icon: 'analytics',
    },
    {
      label: 'Warranted AEP',
      value: '245.6 GWh',
      icon: 'flag',
    },
    {
      label: 'Performance Ratio',
      value: '97.1%',
      icon: 'percent',
      highlight: true,
    },
    {
      label: 'Data Points',
      value: '4,515',
      icon: 'scatter_plot',
    },
  ]
  
  const handleRunAnalysis = async () => {
    setLoading(true)
    try {
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setPowerCurveData({ success: true })
    } catch (error) {
      console.error('Failed to run analysis:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="flex min-h-screen bg-background-dark">
      <Sidebar />
      
      <div className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">show_chart</span>
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Power Curve Analysis</h1>
                <p className="text-sm text-gray-400">Compare observed vs warranted performance</p>
              </div>
            </div>
            
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-background-dark font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Running...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">play_arrow</span>
                  Run Analysis
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="glass-panel rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Turbine Selection</label>
              <select
                value={selectedTurbine}
                onChange={(e) => setSelectedTurbine(e.target.value)}
                className="w-full px-3 py-2 bg-input-bg border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Turbines</option>
                <option value="T001">T001</option>
                <option value="T002">T002</option>
                <option value="T003">T003</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">View Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('scatter')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'scatter'
                      ? 'bg-primary text-background-dark'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Scatter
                </button>
                <button
                  onClick={() => setViewMode('binned')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'binned'
                      ? 'bg-primary text-background-dark'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Binned
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {performanceMetrics.map((metric, idx) => (
            <div
              key={idx}
              className={`glass-panel rounded-xl p-4 ${
                metric.highlight ? 'border border-primary/30 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className={`size-10 rounded-lg flex items-center justify-center ${
                    metric.highlight ? 'bg-primary text-background-dark' : 'bg-primary/10 text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined">{metric.icon}</span>
                </div>
              </div>
              <div className="text-2xl font-black text-white mb-1">{metric.value}</div>
              <div className="text-xs text-gray-400">{metric.label}</div>
            </div>
          ))}
        </div>
        
        {/* Power Curve Chart */}
        <div className="glass-panel rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">
            {viewMode === 'scatter' ? 'Power Curve - Scatter Plot' : 'Power Curve - Binned Data'}
          </h2>
          
          {viewMode === 'scatter' ? (
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  type="number"
                  dataKey="windSpeed"
                  name="Wind Speed"
                  unit=" m/s"
                  stroke="#9ca3af"
                  label={{ value: 'Wind Speed (m/s)', position: 'insideBottom', offset: -10, fill: '#9ca3af' }}
                />
                <YAxis
                  type="number"
                  dataKey="power"
                  name="Power"
                  unit=" kW"
                  stroke="#9ca3af"
                  label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  cursor={{ strokeDasharray: '3 3' }}
                />
                <Legend />
                <Scatter name="Observed" data={observedData} fill="#10b77f" opacity={0.6} />
                <Scatter name="Warranted" data={warranted} fill="#ef4444" shape="diamond" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={binnedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="bin"
                  stroke="#9ca3af"
                  label={{ value: 'Wind Speed Bin (m/s)', position: 'insideBottom', offset: -10, fill: '#9ca3af' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  label={{ value: 'Average Power (kW)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="observed" stroke="#10b77f" strokeWidth={2} name="Observed" />
                <Line type="monotone" dataKey="warranted" stroke="#ef4444" strokeWidth={2} name="Warranted" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Performance Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Wind Speed Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={binnedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="bin" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="count" stroke="#10b77f" strokeWidth={2} name="Data Points" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Performance Insights</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">check_circle</span>
                <div>
                  <h3 className="text-white font-medium mb-1">Overall Performance</h3>
                  <p className="text-sm text-gray-400">
                    Turbines are operating at 97.1% of warranted capacity, indicating good performance.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-yellow-400 mt-0.5">warning</span>
                <div>
                  <h3 className="text-white font-medium mb-1">Low Wind Speed Range</h3>
                  <p className="text-sm text-gray-400">
                    Performance below expected in 3-5 m/s range. May indicate blade soiling or pitch misalignment.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">insights</span>
                <div>
                  <h3 className="text-white font-medium mb-1">High Wind Performance</h3>
                  <p className="text-sm text-gray-400">
                    Excellent performance in 10-13 m/s range, matching warranted curve closely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
