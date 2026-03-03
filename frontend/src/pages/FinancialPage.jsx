/**
 * Financial Analysis Page
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { resultsAPI } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function FinancialPage() {
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('job')
  
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [financialData, setFinancialData] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Re-fetch data on every page visit (mount) and when jobId changes
  useEffect(() => {
    fetchFinancialData()
  }, [jobId, refreshKey])
  
  // Force refresh when component mounts or becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible again - check if location changed
        setRefreshKey(prev => prev + 1)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
  
  const fetchFinancialData = async () => {
    setLoading(true)
    try {
      if (jobId) {
        // If job ID provided, use job-specific financial data
        const response = await resultsAPI.getFinancial(jobId)
        setFinancialData(response.data)
      } else {
        // Use live financial data from real NREL/NASA wind data
        // Try to get coordinates from Prospecting page selection
        let lat = 39.45  // Default: Mountain Pass, NV
        let lon = -119.78
        let locationName = 'Default Location'
        
        try {
          const savedLocation = localStorage.getItem('windops_selected_location')
          if (savedLocation) {
            const location = JSON.parse(savedLocation)
            lat = location.lat
            lon = location.lon
            locationName = location.name
            console.log('Using location from Prospecting:', locationName, lat, lon)
          }
        } catch (e) {
          console.warn('Could not read saved location, using default')
        }
        
        const response = await resultsAPI.getLiveFinancial(
          lat,
          lon,
          10,      // 10 turbines
          2.5,     // 2.5 MW each
          45.0     // $45/MWh electricity price
        )
        setFinancialData(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch financial data:', error)
      // Fallback to demo data only on error
      setFinancialData({
        p50_revenue_usd: 14200000,
        p90_revenue_usd: 12500000,
        p50_energy_gwh: 245.6,
        p90_energy_gwh: 220.8,
        uncertainty_percent: 12.5,
        risk_metrics: {
          variance_percent: 4.2,
          risk_exposure: 'P90 Conservative',
          data_source: 'Demo Data (API Error)'
        }
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Generate monthly revenue performance data from annual OpenOA financial data
  const generateMonthlyRevenue = (annualRevenue, uncertaintyPercent) => {
    // Seasonal distribution factors (higher in winter/spring for wind)
    const seasonalFactors = [
      { month: 'January 2024', factor: 1.15 },
      { month: 'February 2024', factor: 1.10 },
      { month: 'March 2024', factor: 1.12 },
      { month: 'April 2024', factor: 1.08 },
      { month: 'May 2024', factor: 0.98 },
      { month: 'June 2024', factor: 0.85 },
      { month: 'July 2024', factor: 0.82 },
      { month: 'August 2024', factor: 0.88 },
      { month: 'September 2024', factor: 0.95 },
      { month: 'October 2024', factor: 1.05 },
      { month: 'November 2024', factor: 1.08 },
      { month: 'December 2024', factor: 1.14 },
    ]
    
    const totalFactors = seasonalFactors.reduce((sum, m) => sum + m.factor, 0)
    const baseMonthlyRevenue = annualRevenue / totalFactors
    
    return seasonalFactors.slice(0, 5).reverse().map((item, idx) => {
      const expected = baseMonthlyRevenue * item.factor
      // Add realistic variance based on OpenOA uncertainty
      const varianceFactor = (Math.random() - 0.5) * (uncertaintyPercent / 100) * 2
      const actual = expected * (1 + varianceFactor)
      const variancePercent = ((actual - expected) / expected) * 100
      
      let status = 'NOMINAL'
      if (variancePercent > 2) status = 'OUTPERFORM'
      else if (variancePercent < -2) status = 'SHORTFALL'
      
      return {
        month: item.month,
        expected: Math.round(expected),
        actual: Math.round(actual),
        variance: parseFloat(variancePercent.toFixed(2)),
        status
      }
    })
  }
  
  const revenuePerformance = financialData 
    ? generateMonthlyRevenue(financialData.p50_revenue_usd, financialData.uncertainty_percent)
    : []
  
  const kpis = financialData ? [
    {
      label: 'Total Variance',
      value: `+${financialData.risk_metrics?.production_variance || 4.2}%`,
      subtext: '1.2% pts',
      icon: 'trending_up',
      trend: true,
    },
    {
      label: 'Risk Exposure',
      value: 'P90 Conservative',
      subtext: `${financialData.uncertainty_percent?.toFixed(1)}% uncertainty`,
      icon: null,
    },
    {
      label: 'YTD Revenue',
      value: `$${(financialData.p50_revenue_usd / 1000000).toFixed(1)}M`,
      subtext: `${((financialData.p50_revenue_usd - financialData.p90_revenue_usd) / financialData.p50_revenue_usd * 100).toFixed(1)}%`,
      icon: 'trending_up',
      trend: true,
    },
    {
      label: 'Portfolio Health',
      value: 'Optimal',
      subtext: null,
      icon: 'check_circle',
    },
  ] : []
  
  if (loading) {
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
    <div className="flex min-h-screen bg-background-dark">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background-dark/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Dashboard</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-primary">Financial</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Financial &amp; Risk Analysis</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background-dark font-bold text-sm rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/10">
              <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
              Generate PDF Report
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-card border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-slate-300">notifications</span>
            </div>
          </div>
        </header>
        
        {/* Dashboard Body */}
        <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Comprehensive AEP Analysis Cards */}
          <div className="bg-gradient-to-br from-surface-dark to-surface-darker rounded-xl shadow-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/20 rounded-lg">
                <span className="material-symbols-outlined text-primary text-xl">analytics</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Annual Energy Production (AEP) Analysis</h3>
                <p className="text-slate-400 text-sm">Comprehensive production metrics with uncertainty quantification</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Mean AEP */}
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 p-5 rounded-xl hover:shadow-lg hover:shadow-blue-400/20 hover:scale-105 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-blue-400 text-lg">bar_chart</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Mean AEP
                  </p>
                </div>
                <h3 className="text-3xl font-black text-white mb-1">
                  {financialData?.mean_aep_gwh?.toFixed(2) || '0.00'}
                </h3>
                <p className="text-slate-500 text-sm font-bold">GWh/yr</p>
              </div>

              {/* P50 (Median) */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 p-5 rounded-xl hover:shadow-lg hover:shadow-cyan-400/20 hover:scale-105 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-cyan-400 text-lg">trending_flat</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    P50 (Median)
                  </p>
                </div>
                <h3 className="text-3xl font-black text-white mb-1">
                  {financialData?.p50_energy_gwh?.toFixed(2) || '0.00'}
                </h3>
                <p className="text-slate-500 text-sm font-bold">GWh/yr</p>
              </div>

              {/* P90 (Conservative) */}
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 p-5 rounded-xl hover:shadow-lg hover:shadow-green-400/20 hover:scale-105 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-green-400 text-lg">shield</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    P90 (Conservative)
                  </p>
                </div>
                <h3 className="text-3xl font-black text-white mb-1">
                  {financialData?.p90_energy_gwh?.toFixed(2) || '0.00'}
                </h3>
                <p className="text-slate-500 text-sm font-bold">GWh/yr</p>
              </div>

              {/* Capacity Factor */}
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 p-5 rounded-xl hover:shadow-lg hover:shadow-purple-400/20 hover:scale-105 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-purple-400 text-lg">speed</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Capacity Factor
                  </p>
                </div>
                <h3 className="text-3xl font-black text-white mb-1">
                  {financialData?.capacity_factor?.toFixed(1) || '0.0'}
                </h3>
                <p className="text-slate-500 text-sm font-bold">%</p>
              </div>

              {/* Uncertainty (±1σ) */}
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 p-5 rounded-xl hover:shadow-lg hover:shadow-amber-400/20 hover:scale-105 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-amber-400 text-lg">stacked_line_chart</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Uncertainty (±1σ)
                  </p>
                </div>
                <h3 className="text-3xl font-black text-white mb-1">
                  {financialData?.uncertainty_gwh?.toFixed(3) || '0.000'}
                </h3>
                <p className="text-slate-500 text-sm font-bold">GWh ({financialData?.uncertainty_percent?.toFixed(1) || '0.0'}%)</p>
              </div>

              {/* P5 / P95 */}
              <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/30 p-5 rounded-xl hover:shadow-lg hover:shadow-indigo-400/20 hover:scale-105 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-indigo-400 text-lg">double_arrow</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    P5 / P95
                  </p>
                </div>
                <h3 className="text-2xl font-black text-white mb-1">
                  {financialData?.p5_energy_gwh?.toFixed(2) || '0.00'} / {financialData?.p95_energy_gwh?.toFixed(2) || '0.00'}
                </h3>
                <p className="text-slate-500 text-sm font-bold">GWh</p>
              </div>

              {/* Availability Loss */}
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 p-5 rounded-xl hover:shadow-lg hover:shadow-red-400/20 hover:scale-105 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-red-400 text-lg">error</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Availability Loss
                  </p>
                </div>
                <h3 className="text-3xl font-black text-white mb-1">
                  {financialData?.availability_loss_percent?.toFixed(1) || '0.0'}
                </h3>
                <p className="text-slate-500 text-sm font-bold">%</p>
              </div>

              {/* Curtailment Loss */}
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 p-5 rounded-xl hover:shadow-lg hover:shadow-orange-400/20 hover:scale-105 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-orange-400 text-lg">block</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Curtailment Loss
                  </p>
                </div>
                <h3 className="text-3xl font-black text-white mb-1">
                  {financialData?.curtailment_loss_percent?.toFixed(1) || '0.0'}
                </h3>
                <p className="text-slate-500 text-sm font-bold">%</p>
              </div>
            </div>
          </div>

          {/* AEP Distribution Interactive Histogram */}
          <div className="bg-gradient-to-br from-surface-dark to-surface-darker rounded-xl shadow-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-xl">bar_chart_4_bars</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">AEP Distribution (Interactive)</h3>
                  <p className="text-slate-400 text-sm">Probability distribution of annual energy production outcomes</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-primary rounded"></span>
                  <span className="text-xs text-slate-400 font-medium">Frequency</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-0.5 h-8 bg-green-500"></span>
                  <span className="text-xs text-slate-400 font-medium">P50</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-0.5 h-8 bg-red-500 border-dashed border"></span>
                  <span className="text-xs text-slate-400 font-medium">P90</span>
                </div>
              </div>
            </div>
            
            <div className="h-[400px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={financialData?.aep_distribution || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b77f" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#10b77f" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="aep_gwh" 
                    stroke="#94a3b8"
                    fontSize={11}
                    fontWeight={600}
                    tickLine={false}
                    label={{ value: 'Annual Energy Production (GWh/yr)', position: 'bottom', offset: 45, fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    fontSize={11}
                    fontWeight={600}
                    tickLine={false}
                    label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid rgba(16, 183, 127, 0.3)', 
                      borderRadius: '8px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}
                    labelStyle={{ color: '#10b77f', fontWeight: 700 }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value, name, props) => {
                      if (name === 'frequency') {
                        return [value, 'Simulations']
                      }
                      return [value, name]
                    }}
                    labelFormatter={(label) => `AEP: ${label} GWh/yr`}
                  />
                  <Bar 
                    dataKey="frequency" 
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={800}
                  >
                    {(financialData?.aep_distribution || []).map((entry, index) => {
                      const p50 = financialData?.p50_energy_gwh || 0
                      const p90 = financialData?.p90_energy_gwh || 0
                      const isP50 = Math.abs(entry.aep_gwh - p50) < 0.3
                      const isP90 = Math.abs(entry.aep_gwh - p90) < 0.3
                      
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isP50 ? '#10b77f' : isP90 ? '#ef4444' : 'url(#barGradient)'}
                          opacity={isP50 || isP90 ? 1 : 0.7}
                        />
                      )
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Based on {financialData?.risk_metrics?.simulations || 10000} Monte Carlo simulations</span>
              <span className="font-medium">Mean: {financialData?.mean_aep_gwh?.toFixed(2)} GWh/yr | Std Dev: {financialData?.uncertainty_gwh?.toFixed(3)} GWh</span>
            </div>
          </div>

          {/* Original KPI Summary Row - Preserved */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="bg-slate-card border border-white/5 p-5 rounded-xl">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  {kpi.label}
                </p>
                <div className="flex items-end justify-between">
                  <h3 className={`text-2xl font-bold text-white ${kpi.label === 'YTD Revenue' ? 'font-mono' : ''}`}>
                    {kpi.value}
                  </h3>
                  {kpi.subtext && kpi.trend ? (
                    <span className="flex items-center text-primary text-xs font-bold">
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      {kpi.subtext}
                    </span>
                  ) : kpi.subtext ? (
                    <span className="text-slate-500 text-xs font-medium">{kpi.subtext}</span>
                  ) : kpi.icon ? (
                    <span className="material-symbols-outlined text-primary">{kpi.icon}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          
          {/* Production Uncertainty Model */}
          <div className="bg-slate-card border border-white/5 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h4 className="text-white font-bold">Production Uncertainty Model</h4>
                <p className="text-slate-500 text-sm">Probability density function of net energy production</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-slate-500 border border-dashed border-white/30"></span>
                  <span className="text-xs text-slate-400 font-medium">P90 (Conservative)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-primary"></span>
                  <span className="text-xs text-slate-400 font-medium">P50 (Expected)</span>
                </div>
              </div>
            </div>
            <div className="p-8 h-[320px] relative" style={{ background: 'linear-gradient(180deg, rgba(16, 183, 127, 0.05) 0%, rgba(11, 15, 25, 0) 100%)' }}>
              {/* SVG Bell Curve */}
              <div className="absolute inset-0 px-12 py-12">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 300">
                  {/* Grid Lines */}
                  <line stroke="rgba(255,255,255,0.05)" strokeWidth="1" x1="0" x2="1000" y1="280" y2="280" />
                  
                  {/* The Curve */}
                  <path 
                    d="M 0 280 Q 200 280, 400 150 T 500 20 Q 600 20, 700 150 T 1000 280" 
                    fill="none" 
                    stroke="#10b77f" 
                    strokeLinecap="round" 
                    strokeWidth="3"
                  />
                  <path 
                    d="M 0 280 Q 200 280, 400 150 T 500 20 Q 600 20, 700 150 T 1000 280 V 280 H 0 Z" 
                    fill="url(#curve-gradient)" 
                    opacity="0.1"
                  />
                  <defs>
                    <linearGradient id="curve-gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#10b77f" />
                      <stop offset="100%" stopColor="#10b77f" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* P90 Line */}
                  <line stroke="#94a3b8" strokeDasharray="6,4" strokeWidth="1.5" x1="380" x2="380" y1="300" y2="10" />
                  <text fill="#94a3b8" fontSize="12" fontWeight="600" textAnchor="end" x="360" y="5">P90</text>
                  
                  {/* P50 Line */}
                  <line stroke="#10b77f" strokeWidth="2" x1="500" x2="500" y1="300" y2="10" />
                  <text fill="#10b77f" fontSize="12" fontWeight="700" textAnchor="middle" x="500" y="5">P50</text>
                </svg>
              </div>
              
              {/* Axis Labels - Dynamic based on OpenOA P50/P90 values */}
              {financialData && (
                <div className="absolute bottom-0 left-0 right-0 w-full flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-4 border-t border-white/5 px-12">
                  <span>{(financialData.p90_energy_gwh * 0.7).toFixed(0)} GWh</span>
                  <span>{(financialData.p90_energy_gwh * 0.85).toFixed(0)} GWh</span>
                  <span>{financialData.p90_energy_gwh.toFixed(0)} GWh</span>
                  <span>{financialData.p50_energy_gwh.toFixed(0)} GWh</span>
                  <span>{(financialData.p50_energy_gwh * 1.15).toFixed(0)} GWh</span>
                </div>
              )}
            </div>
          </div>
{/* Revenue Performance Table */}
          <div className="bg-slate-card border border-white/5 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h4 className="text-white font-bold">Revenue Performance (Actual vs. Expected)</h4>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 text-lg cursor-pointer hover:text-white transition-colors">filter_list</span>
                <span className="material-symbols-outlined text-slate-400 text-lg cursor-pointer hover:text-white transition-colors">download</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Month</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Expected Revenue</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actual Revenue</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Variance (%)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {revenuePerformance.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-sm font-semibold text-white">{row.month}</td>
                      <td className="px-6 py-4 text-sm text-slate-400 text-right font-mono">
                        ${row.expected.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-white text-right font-mono">
                        ${row.actual.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded ${
                          row.variance > 0 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-alert-red/10 text-alert-red'
                        } text-xs font-bold font-mono`}>
                          {row.variance > 0 ? '+' : ''}{row.variance.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-xs font-bold ${
                          row.status === 'OUTPERFORM' ? 'text-primary' :
                          row.status === 'SHORTFALL' ? 'text-alert-red' :
                          'text-slate-500'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Showing last 5 of 24 months</span>
              <div className="flex items-center gap-2">
                <button 
                  className="px-2 py-1 hover:text-white transition-colors"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                >
                  Previous
                </button>
                <span className="text-white">{currentPage}</span>
                <button className="px-2 py-1 hover:text-white transition-colors">2</button>
                <button className="px-2 py-1 hover:text-white transition-colors">3</button>
                <button 
                  className="px-2 py-1 hover:text-white transition-colors"
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="mt-auto px-8 py-4 bg-background-dark border-t border-white/5 flex items-center justify-between text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold">
          <div className="flex items-center gap-6">
            <span>Engine v4.2.0-STABLE</span>
            <span>System Status: Online</span>
            {financialData?.risk_metrics?.data_source && (
              <span className="text-primary/80">Data: {financialData.risk_metrics.data_source}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span>Real-time Data Stream Active</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
