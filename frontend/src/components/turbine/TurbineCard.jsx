/**
 * Turbine Card Component - Display turbine summary
 */
import { useNavigate } from 'react-router-dom'
import TurbineStatus from './TurbineStatus'

export default function TurbineCard({ turbine }) {
  const navigate = useNavigate()
  
  return (
    <button
      onClick={() => navigate(`/turbine/${turbine.turbine_id}`)}
      className="glass-panel p-4 rounded-lg hover:bg-white/10 transition-colors text-left w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-white">{turbine.turbine_name || turbine.turbine_id}</span>
        <TurbineStatus status={turbine.status} size="sm" />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Power Output</span>
          <span className="text-white font-medium">
            {turbine.power_output ? `${turbine.power_output.toFixed(1)} kW` : '--'}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Wind Speed</span>
          <span className="text-white font-medium">
            {turbine.wind_speed ? `${turbine.wind_speed.toFixed(1)} m/s` : '--'}
          </span>
        </div>
        
        {turbine.availability && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Availability</span>
            <span className="text-primary font-medium">
              {(turbine.availability * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
