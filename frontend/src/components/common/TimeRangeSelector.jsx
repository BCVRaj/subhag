/**
 * Time Range Selector Component
 */
export default function TimeRangeSelector({ selected, onChange, ranges = ['1d', '1w', '1m', '3m', '1y'] }) {
  return (
    <div className="flex items-center gap-2">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selected === range
              ? 'bg-primary text-background-dark'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  )
}
