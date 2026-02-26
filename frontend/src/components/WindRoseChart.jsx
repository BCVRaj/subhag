import React from 'react';
import { PolarGrid, PolarRadiusAxis, PolarAngleAxis, Radar, RadarChart, Tooltip } from 'recharts';

/**
 * Wind Rose Chart Component
 * Displays directional wind frequency and average speed data
 * 
 * @param {Array} windData - Array of objects with direction, frequency, avg_speed
 * @param {String} dataSource - Data source (NREL, Synthetic, etc)
 */
const WindRoseChart = ({ windData = [], dataSource = 'Loading...' }) => {
  if (!windData || windData.length === 0) {
    return (
      <div className="w-64 h-64 flex items-center justify-center bg-dark-bg-secondary/50 rounded-full border border-primary/30">
        <div className="text-center">
          <div className="animate-spin text-primary mb-2">
            <span className="material-symbols-outlined text-4xl">progress_activity</span>
          </div>
          <p className="text-sm text-text-secondary">Loading wind data...</p>
        </div>
      </div>
    );
  }

  // Ensure data is in correct order (N, NE, E, SE, S, SW, W, NW)
  const directionOrder = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const orderedData = directionOrder.map(dir => {
    const found = windData.find(d => d.direction === dir);
    return found || { direction: dir, frequency: 0, avg_speed: 0 };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-bg-secondary/95 backdrop-blur-sm border border-primary/30 rounded-lg p-3 shadow-xl">
          <p className="text-primary font-semibold mb-1">{data.direction}</p>
          <p className="text-sm text-text-primary">
            Frequency: <span className="text-primary font-medium">{data.frequency.toFixed(1)}%</span>
          </p>
          <p className="text-sm text-text-primary">
            Avg Speed: <span className="text-blue-400 font-medium">{data.avg_speed.toFixed(1)} m/s</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      {/* Chart Container */}
      <div style={{ width: 256, height: 256 }}>
        <RadarChart width={256} height={256} data={orderedData}>
          <PolarGrid 
            stroke="rgba(16, 183, 127, 0.2)" 
            strokeWidth={1}
          />
          <PolarAngleAxis 
            dataKey="direction"
            tick={{ fill: '#10b77f', fontSize: 13, fontWeight: 600 }}
            tickSize={10}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 'auto']}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
          />
          
          {/* Frequency bars (primary) */}
          <Radar
            name="Frequency"
            dataKey="frequency"
            stroke="#10b77f"
            fill="#10b77f"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          
          {/* Average speed overlay (secondary) */}
          <Radar
            name="Avg Speed"
            dataKey="avg_speed"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.2}
            strokeWidth={1.5}
            dot={{ fill: '#3b82f6', r: 3 }}
          />
          
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </div>

      {/* Data Source Label */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-dark-bg-secondary/90 backdrop-blur-sm px-3 py-1 rounded-full border border-primary/30 text-xs text-text-secondary">
        <span className="text-primary font-medium">{dataSource}</span> Wind Data
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary/60"></div>
          <span className="text-text-secondary">Frequency (%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500/60"></div>
          <span className="text-text-secondary">Speed (m/s)</span>
        </div>
      </div>
    </div>
  );
};

export default WindRoseChart;
