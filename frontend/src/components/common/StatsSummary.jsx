/**
 * Statistics Summary Component
 */
export default function StatsSummary({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className="glass-panel rounded-lg p-4">
          <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
          <div className="text-xs text-gray-400">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
