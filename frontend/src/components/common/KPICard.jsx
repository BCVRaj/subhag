/**
 * KPI Card Component - Reusable metric display
 */
export default function KPICard({ label, value, icon, trend, trendUp, highlight = false }) {
  return (
    <div
      className={`glass-panel rounded-xl p-4 ${
        highlight ? 'border border-primary/30 bg-primary/5' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className={`size-10 rounded-lg flex items-center justify-center ${
            highlight ? 'bg-primary text-background-dark' : 'bg-primary/10 text-primary'
          }`}
        >
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {trend && (
          <span
            className={`text-xs font-bold px-2 py-1 rounded ${
              trendUp ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
