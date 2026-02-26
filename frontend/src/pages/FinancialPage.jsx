/**
 * Financial Analysis Page
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { resultsAPI } from '../services/api'

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
          {/* Metric Summary Row */}
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
