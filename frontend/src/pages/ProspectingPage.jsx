/**
 * Prospecting Page - Map-based site assessment and wind resource analysis
 * 
 * PRODUCTION MAP INTEGRATION:
 * ===========================
 * For real interactive maps with worldwide coverage, integrate one of:
 * 
 * 1. LEAFLET (Recommended - Free & Open Source):
 *    npm install leaflet react-leaflet
 *    - OpenStreetMap tiles (free)
 *    - Full user interaction (pan, zoom, click anywhere)
 *    - Custom markers and overlays
 *    - Wind layer plugins available
 * 
 * 2. MAPBOX GL JS (Professional - Paid):
 *    npm install mapbox-gl react-map-gl
 *    - Satellite/terrain imagery
 *    - 3D terrain visualization
 *    - Excellent performance
 *    - Requires API key ($$$)
 * 
 * 3. GOOGLE MAPS (Enterprise - Paid):
 *    @react-google-maps/api
 *    - Familiar interface
 *    - Extensive worldwide coverage
 *    - Requires API key ($$$)
 * 
 * CURRENT IMPLEMENTATION:
 * - Simulated map with gradient background
 * - Pre-defined site locations
 * - Static wind rose visualization
 * - Click-to-drop pin capability
 * - Backend API ready for real coordinates
 * 
 * TO ENABLE REAL MAPS:
 * 1. Install map library (e.g., react-leaflet)
 * 2. Replace the gradient background with <Map> component
 * 3. Add tile layer (e.g., OpenStreetMap or satellite)
 * 4. Implement onClick handler to get real lat/long
 * 5. Query wind APIs (NREL, Global Wind Atlas) for location data
 * 6. Display wind rose based on fetched data
 */
import { useState, useEffect } from 'react'
import Sidebar from '../components/common/Sidebar'
import WindRoseChart from '../components/WindRoseChart'
import { prospectingAPI } from '../services/api'
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix Leaflet default icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Map click handler component
function MapClickHandler({ isDropPinMode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (isDropPinMode) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export default function ProspectingPage() {
  const [selectedSite, setSelectedSite] = useState('A-14')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropPinMode, setIsDropPinMode] = useState(false)
  const [sites, setSites] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [droppedPins, setDroppedPins] = useState(() => {
    // Initialize from localStorage on mount
    try {
      const saved = localStorage.getItem('windops_dropped_pins')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [mapCenter, setMapCenter] = useState([38.0, -97.0]) // Center of USA
  const [mapZoom, setMapZoom] = useState(5)
  const [windData, setWindData] = useState([])
  const [windDataSource, setWindDataSource] = useState('Loading...')
  const [loadingWindData, setLoadingWindData] = useState(false)
  const [showSimulationModal, setShowSimulationModal] = useState(false)
  const [simulationResults, setSimulationResults] = useState(null)
  
  // Fetch sites from API on mount
  useEffect(() => {
    fetchSites()
  }, [])
  
  // Persist dropped pins to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('windops_dropped_pins', JSON.stringify(droppedPins))
  }, [droppedPins])
  
  // Fetch wind data when selected site changes
  useEffect(() => {
    if (selectedSite) {
      fetchWindData(selectedSite)
      // Save selected site coordinates to localStorage for Financial page
      const site = sites[selectedSite]
      if (site?.lat && site?.lon) {
        localStorage.setItem('windops_selected_location', JSON.stringify({
          lat: site.lat,
          lon: site.lon,
          name: site.name || selectedSite,
          timestamp: Date.now()
        }))
      }
    }
  }, [selectedSite, sites])
  
  // Fetch sites data
  const fetchSites = async (search = null, viability = null) => {
    try {
      setLoading(true)
      const response = await prospectingAPI.getAllSites(search, viability)
      
      // Convert array to object keyed by site ID and transform to camelCase
      const sitesObj = {}
      response.data.sites.forEach(site => {
        sitesObj[site.id] = {
          id: site.id,
          name: site.name,
          sector: site.sector,
          viability: site.viability,
          viabilityColor: site.viability_color,
          coordinates: site.coordinates,
          aep: site.aep,
          aepChange: site.aep_change,
          capacityFactor: site.capacity_factor,
          avgWindSpeed: site.avg_wind_speed
        }
      })
      
      setSites(sitesObj)
      
      // Set first site as selected if none selected
      if (!selectedSite && response.data.sites.length > 0) {
        setSelectedSite(response.data.sites[0].id)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching sites:', err)
      setError('Failed to load prospecting sites')
      
      // Fallback to hardcoded data if API fails
      setSites({
        'A-14': {
          id: 'A-14',
          name: 'Plot A-14',
          sector: 'Desert Ridge Sector',
          viability: 'HIGH VIABILITY',
          viabilityColor: 'bg-primary/20 text-primary',
          coordinates: { lat: 34.05, long: -118.25 },
          aep: 450,
          aepChange: 12,
          capacityFactor: 42,
          avgWindSpeed: 7.5
        }
      })
      setSelectedSite('A-14')
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch real wind data from NREL
  const fetchWindData = async (siteId) => {
    try {
      setLoadingWindData(true)
      const response = await prospectingAPI.getWindData(siteId)
      
      setWindData(response.data.wind_data || [])
      setWindDataSource(response.data.data_source || 'Unknown')
      
      // Also update site with real calculated data if available
      if (sites[siteId] && response.data.site) {
        const updatedSite = {
          ...sites[siteId],
          aep: response.data.site.aep,
          capacityFactor: response.data.site.capacity_factor,
          avgWindSpeed: response.data.site.avg_wind_speed
        }
        setSites(prev => ({
          ...prev,
          [siteId]: updatedSite
        }))
      }
    } catch (err) {
      console.error('🔴 Error fetching wind data:', err)
      // Keep existing data on error
    } finally {
      setLoadingWindData(false)
    }
  }
  
  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      fetchSites(searchQuery)
    } else {
      fetchSites()
    }
  }
  
  // Handle drop pin - now receives real coordinates from map click
  const handleDropPin = async (lat, lng) => {
    if (!isDropPinMode) return
    
    try {
      // STEP 1: Assess the location with REAL wind data
      const assessmentResponse = await prospectingAPI.assessLocation(lat, lng)
      const assessment = assessmentResponse.data
      
      // STEP 2: Create a new site from the dropped pin assessment
      const pinSiteId = `PIN-${Date.now()}`
      const newPinSite = {
        id: pinSiteId,
        name: `Assessment Pin`,
        sector: `Custom Location (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
        viability: assessment.viability.viability,
        viabilityColor: assessment.viability.color,
        coordinates: { lat, long: lng },
        aep: Math.round(assessment.energy_production.aep_gwh_per_turbine * 10), // For 10 turbines
        aepChange: 0,
        capacityFactor: Math.round(assessment.energy_production.capacity_factor_percent),
        avgWindSpeed: assessment.wind_resource.avg_wind_speed_ms
      }
      
      // STEP 3: Update sites with the new pin location
      setSites(prev => ({
        ...prev,
        [pinSiteId]: newPinSite
      }))
      
      // STEP 4: Update wind rose data
      setWindData(assessment.wind_rose || [])
      setWindDataSource(assessment.wind_resource.data_source || 'Synthetic')
      
      // STEP 5: Make this the active selected site
      setSelectedSite(pinSiteId)
      
      // STEP 6: Save pin to backend with the ID we're using
      await prospectingAPI.savePin({ lat, long: lng }, `Assessment: ${assessment.viability.viability}`, pinSiteId)
      
      // STEP 7: Add pin to map (will auto-save to localStorage via useEffect)
      setDroppedPins(prev => [...prev, { lat, lng, id: pinSiteId }])
      
      // STEP 7b: Save dropped pin coordinates to localStorage for Financial page
      localStorage.setItem('windops_selected_location', JSON.stringify({
        lat,
        lon: lng,
        name: `Dropped Pin (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
        timestamp: Date.now()
      }))
      
      // STEP 8: Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-6 py-3 rounded-lg shadow-2xl font-semibold animate-bounce'
      notification.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined">check_circle</span>
          <span>Location assessed: ${assessment.energy_production.capacity_factor_percent.toFixed(1)}% CF • ${assessment.wind_resource.avg_wind_speed_ms.toFixed(1)} m/s</span>
        </div>
      `
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 4000)
      
      setIsDropPinMode(false)
    } catch (err) {
      console.error('🔴 Error assessing location:', err)
      
      // Show error notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-2xl font-semibold'
      notification.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined">error</span>
          <span>Failed to assess location - Check backend connection</span>
        </div>
      `
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 4000)
      
      setIsDropPinMode(false)
    }
  }
  
  // Handle run simulation
  const handleRunSimulation = async () => {
    try {
      const response = await prospectingAPI.runSimulation(selectedSite, 10)
      console.log('Simulation results:', response.data)
      
      setSimulationResults(response.data)
      setShowSimulationModal(true)
    } catch (err) {
      console.error('Error running simulation:', err)
      alert('Failed to run simulation')
    }
  }

  // Handle export simulation results to PDF
  const handleExportResults = async () => {
    if (!simulationResults) return

    try {
      // Try to use jsPDF if available
      const { jsPDF } = await import('jspdf').catch(() => null)
      
      if (jsPDF) {
        // Create PDF using jsPDF
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        let yPos = 20

        // Title
        doc.setFontSize(20)
        doc.setTextColor(31, 206, 151) // Primary color
        doc.text('WindOps Pro - Simulation Results', pageWidth / 2, yPos, { align: 'center' })
        yPos += 15

        // Site Information
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.text(`Site: ${simulationResults.site_name || simulationResults.site_id}`, 20, yPos)
        yPos += 8
        doc.text(`Data Source: ${simulationResults.data_source || 'NREL'}`, 20, yPos)
        yPos += 8
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos)
        yPos += 15

        // Key Results Header
        doc.setFontSize(14)
        doc.setTextColor(31, 206, 151)
        doc.text('Key Results', 20, yPos)
        yPos += 10

        // Key Results
        doc.setFontSize(11)
        doc.setTextColor(0, 0, 0)
        doc.text(`Net AEP: ${simulationResults.results.net_aep_gwh} GWh/year`, 20, yPos)
        yPos += 8
        doc.text(`LCOE: $${simulationResults.results.lcoe_usd_per_mwh} USD/MWh`, 20, yPos)
        yPos += 8
        doc.text(`Payback Period: ${simulationResults.results.payback_years} years`, 20, yPos)
        yPos += 15

        // Detailed Metrics Header
        doc.setFontSize(14)
        doc.setTextColor(31, 206, 151)
        doc.text('Detailed Metrics', 20, yPos)
        yPos += 10

        // Detailed Metrics
        doc.setFontSize(11)
        doc.setTextColor(0, 0, 0)
        doc.text(`Gross AEP: ${simulationResults.results.gross_aep_gwh} GWh`, 20, yPos)
        yPos += 8
        doc.text(`Wake Losses: ${simulationResults.results.wake_losses_percent}%`, 20, yPos)
        yPos += 8
        doc.text(`Capacity Factor: ${simulationResults.parameters.capacity_factor}%`, 20, yPos)
        yPos += 8
        doc.text(`Total Capacity: ${simulationResults.parameters.total_capacity_mw} MW`, 20, yPos)
        yPos += 8
        doc.text(`Annual Revenue: $${(simulationResults.results.annual_revenue_usd / 1000000).toFixed(2)}M USD`, 20, yPos)
        yPos += 8
        doc.text(`Project CAPEX: $${simulationResults.results.project_capex_usd_million}M USD`, 20, yPos)
        yPos += 15

        // Footer
        doc.setFontSize(9)
        doc.setTextColor(128, 128, 128)
        const footerY = doc.internal.pageSize.getHeight() - 15
        doc.text('Generated by WindOps Pro', pageWidth / 2, footerY, { align: 'center' })

        // Save PDF
        const filename = `WindOps_Simulation_${simulationResults.site_id || 'Results'}_${new Date().toISOString().split('T')[0]}.pdf`
        doc.save(filename)
      } else {
        // Fallback: Create downloadable HTML/text file
        const content = `
WindOps Pro - Simulation Results
================================

Site: ${simulationResults.site_name || simulationResults.site_id}
Data Source: ${simulationResults.data_source || 'NREL'}
Date: ${new Date().toLocaleDateString()}

KEY RESULTS
-----------
Net AEP: ${simulationResults.results.net_aep_gwh} GWh/year
LCOE: $${simulationResults.results.lcoe_usd_per_mwh} USD/MWh
Payback Period: ${simulationResults.results.payback_years} years

DETAILED METRICS
----------------
Gross AEP: ${simulationResults.results.gross_aep_gwh} GWh
Wake Losses: ${simulationResults.results.wake_losses_percent}%
Capacity Factor: ${simulationResults.parameters.capacity_factor}%
Total Capacity: ${simulationResults.parameters.total_capacity_mw} MW
Annual Revenue: $${(simulationResults.results.annual_revenue_usd / 1000000).toFixed(2)}M USD
Project CAPEX: $${simulationResults.results.project_capex_usd_million}M USD

Generated by WindOps Pro
        `
        
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `WindOps_Simulation_${simulationResults.site_id || 'Results'}_${new Date().toISOString().split('T')[0]}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting results:', error)
      alert('Failed to export results. Please try again.')
    }
  }
  
  const currentSite = sites[selectedSite] || {}
  
  if (loading) {
    return (
      <div className="flex h-screen bg-background-dark overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-xl">Loading prospecting sites...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background-dark overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 relative h-screen w-full overflow-hidden" style={{cursor: isDropPinMode ? 'crosshair' : 'default'}}>
        {/* Drop Pin Mode Overlay Indicator */}
        {isDropPinMode && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-primary/90 text-white px-6 py-3 rounded-full shadow-2xl border-2 border-white/30 font-bold animate-bounce pointer-events-none">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">touch_app</span>
              <span>Click anywhere on the map to place assessment pin</span>
            </div>
          </div>
        )}
        {/* Real Interactive Leaflet Map */}
        <div className="absolute inset-0 z-0">
          <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            {/* OpenStreetMap Base Layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Satellite Layer Option - Uncomment to use */}
            {/* <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            /> */}
            
            {/* Map click handler for drop pin mode */}
            <MapClickHandler isDropPinMode={isDropPinMode} onMapClick={handleDropPin} />
            
            {/* Render existing site markers */}
            {Object.values(sites).map((site) => (
              site.coordinates && (
                <Marker 
                  key={site.id} 
                  position={[site.coordinates.lat, site.coordinates.long]}
                  eventHandlers={{
                    click: () => setSelectedSite(site.id)
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{site.name}</strong><br/>
                      {site.sector}<br/>
                      <span className="text-primary font-semibold">{site.viability}</span>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
            
            {/* Render dropped pins */}
            {droppedPins.map((pin) => (
              <Marker 
                key={pin.id} 
                position={[pin.lat, pin.lng]}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>Assessment Pin</strong><br/>
                    Lat: {pin.lat.toFixed(4)}°<br/>
                    Lng: {pin.lng.toFixed(4)}°
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        
        {/* Map UI Layer */}
        <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between pointer-events-none">
          {/* Top Controls Row */}
          <div className="flex justify-between items-start pointer-events-auto w-full">
            {/* Search Bar */}
            <div className="glass-panel rounded-lg flex items-center p-1 w-[380px] shadow-lg">
              <div className="flex items-center justify-center w-10 h-10 text-gray-400">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input 
                className="bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 w-full text-sm font-medium outline-none" 
                placeholder="Search coordinates, site ID, or region..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                type="text"
              />
              <div className="flex border-l border-gray-700 pl-1">
                <button 
                  onClick={handleSearch}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  title="Search"
                >
                  <span className="material-symbols-outlined">tune</span>
                </button>
              </div>
            </div>
            
            {/* Right Side Map Tools */}
            <div className="flex flex-col gap-2">
              <div className="glass-panel rounded-lg flex flex-col shadow-lg overflow-hidden">
                <button className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 border-b border-white/10 active:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined">add</span>
                </button>
                <button className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 active:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined">remove</span>
                </button>
              </div>
              <button className="glass-panel rounded-lg w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 shadow-lg active:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined">my_location</span>
              </button>
              <button className="glass-panel rounded-lg w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 shadow-lg active:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined">layers</span>
              </button>
            </div>
          </div>
          
          {/* Middle Area - Wind Rose Overlay (Repositioned above Wind Speed Legend) */}
          <div className="absolute bottom-52 left-4 pointer-events-none">
            {/* Wind Rose Container with Blur Background */}
            <div className="glass-panel rounded-2xl p-4 backdrop-blur-md bg-background-darker/80 border border-primary/30 shadow-2xl">
              {/* Real Wind Rose Chart with NREL Data */}
              <WindRoseChart windData={windData} dataSource={windDataSource} />
            </div>
            
            {/* Enhanced Active Plot Label with Animation - Positioned below wind rose */}
            <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 glass-panel px-4 py-2 rounded-lg text-sm font-mono text-white whitespace-nowrap border-2 border-primary/50 flex items-center gap-3 shadow-xl">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span className="font-semibold">Active Plot: <span className="text-primary">{currentSite.id || 'Loading...'}</span></span>
              <span className="text-gray-400 text-xs">
                {currentSite.coordinates?.lat && currentSite.coordinates?.long 
                  ? `(${currentSite.coordinates.lat.toFixed(2)}°, ${currentSite.coordinates.long.toFixed(2)}°)` 
                  : '(---, ---)'}
              </span>
            </div>
          </div>
          
          {/* Bottom Area */}
          <div className="flex items-end justify-between w-full pointer-events-auto mt-auto">
            {/* Bottom Left: Wind Speed Legend */}
            <div className="glass-panel rounded-lg p-3 flex flex-col gap-2 min-w-[160px]">
              <div className="flex justify-between items-center text-xs text-gray-300 font-medium">
                <span>Wind Speed (m/s)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-green-400 to-red-500"></div>
              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                <span>0</span>
                <span>5</span>
                <span>10</span>
                <span>15+</span>
              </div>
            </div>
            
            {/* Bottom Center: Enhanced Drop Pin Button */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <button 
                onClick={() => setIsDropPinMode(!isDropPinMode)}
                className={`flex items-center gap-3 ${isDropPinMode ? 'bg-gradient-to-r from-primary to-primary-dark animate-pulse' : 'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary'} text-white text-base font-bold py-4 px-8 rounded-full shadow-[0_6px_30px_rgba(16,183,127,0.5)] transition-all transform hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(16,183,127,0.7)] border-2 border-primary/30`}
              >
                <span className="material-symbols-outlined text-2xl">{isDropPinMode ? 'pin_drop' : 'add_location_alt'}</span>
                <span className="tracking-wide">{isDropPinMode ? 'Click Map to Place Pin' : 'Drop Assessment Pin'}</span>
                {isDropPinMode && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                )}
              </button>
            </div>
            
            {/* Right Side: Site Potential Panel */}
            <div className="glass-panel rounded-xl w-[320px] flex flex-col shadow-2xl overflow-hidden border border-gray-700/50">
              {/* Panel Header */}
              <div className="p-4 border-b border-gray-700/50 bg-[#111816]/50">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-white font-semibold text-lg">Site Potential</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentSite.viabilityColor} uppercase tracking-wider`}>
                    {currentSite.viability}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="material-symbols-outlined text-[14px]">grid_3x3</span>
                  <span>{currentSite.name} • {currentSite.sector}</span>
                </div>
              </div>
              
              {/* Main Metric (AEP) */}
              <div className="p-5 flex flex-col gap-1 border-b border-gray-700/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-[64px] text-primary">energy_savings_leaf</span>
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Est. Annual Energy Production</span>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white font-mono">{currentSite.aep}</span>
                  <span className="text-lg font-medium text-primary mb-1 font-mono">GWh</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">trending_up</span>
                  <span className="text-xs font-medium text-primary">+{currentSite.aepChange}% vs regional avg</span>
                </div>
              </div>
              
              {/* Secondary Metrics Grid */}
              <div className="grid grid-cols-2 divide-x divide-gray-700/50 bg-[#111816]/30">
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Capacity Factor</span>
                  <span className="text-xl font-bold text-white font-mono">{currentSite.capacityFactor}%</span>
                  <div className="w-full bg-gray-700 h-1 rounded-full mt-1 overflow-hidden">
                    <div className="bg-primary h-full" style={{width: `${currentSite.capacityFactor}%`}}></div>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Avg Wind Speed</span>
                  <span className="text-xl font-bold text-white font-mono">{currentSite.avgWindSpeed} <span className="text-xs text-gray-500">m/s</span></span>
                  <div className="w-full bg-gray-700 h-1 rounded-full mt-1 overflow-hidden">
                    <div className="bg-blue-400 h-full" style={{width: `${(currentSite.avgWindSpeed / 10) * 100}%`}}></div>
                  </div>
                </div>
              </div>
              
              {/* Action Footer */}
              <div className="p-3 bg-[#111816]/80 flex gap-2">
                <button 
                  onClick={handleRunSimulation}
                  className="w-full py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-xs font-medium text-primary border border-primary/20 transition-colors"
                >
                  Run Simulation
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Site Selector (Top Right Corner of Panel) */}
        <div className="absolute top-6 right-6 z-20 pointer-events-auto">
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="glass-panel px-3 py-2 rounded-lg text-sm text-white bg-transparent border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            {Object.keys(sites).map((siteId) => (
              <option key={siteId} value={siteId} className="bg-surface-dark">
                {sites[siteId].name} - {sites[siteId].sector}
              </option>
            ))}
          </select>
        </div>

        {/* Simulation Results Modal */}
        {showSimulationModal && simulationResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-gradient-to-br from-background-dark to-surface-dark rounded-2xl shadow-2xl max-w-2xl w-full border-2 border-primary/30 overflow-hidden animate-slideUp">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-white">check_circle</span>
                  <h2 className="text-2xl font-bold text-white">Simulation Complete!</h2>
                </div>
                <button 
                  onClick={() => setShowSimulationModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-3xl">close</span>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Site Info */}
                <div className="glass-panel rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Site</p>
                      <p className="text-white font-semibold text-lg">{simulationResults.site_name || simulationResults.site_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">Data Source</p>
                      <p className="text-primary font-semibold">{simulationResults.data_source || 'NREL'}</p>
                    </div>
                  </div>
                </div>

                {/* Key Results Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-panel rounded-lg p-4 border border-primary/30 text-center">
                    <p className="text-gray-400 text-xs uppercase font-semibold mb-2">Net AEP</p>
                    <p className="text-3xl font-bold text-primary">{simulationResults.results.net_aep_gwh}</p>
                    <p className="text-gray-400 text-sm mt-1">GWh/year</p>
                  </div>
                  
                  <div className="glass-panel rounded-lg p-4 border border-blue-500/30 text-center">
                    <p className="text-gray-400 text-xs uppercase font-semibold mb-2">LCOE</p>
                    <p className="text-3xl font-bold text-blue-400">${simulationResults.results.lcoe_usd_per_mwh}</p>
                    <p className="text-gray-400 text-sm mt-1">USD/MWh</p>
                  </div>
                  
                  <div className="glass-panel rounded-lg p-4 border border-green-500/30 text-center">
                    <p className="text-gray-400 text-xs uppercase font-semibold mb-2">Payback</p>
                    <p className="text-3xl font-bold text-green-400">{simulationResults.results.payback_years}</p>
                    <p className="text-gray-400 text-sm mt-1">years</p>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="glass-panel rounded-lg p-4 border border-gray-700 space-y-3">
                  <h3 className="text-white font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">analytics</span>
                    Detailed Metrics
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                      <span className="text-gray-400 text-sm">Gross AEP</span>
                      <span className="text-white font-semibold">{simulationResults.results.gross_aep_gwh} GWh</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                      <span className="text-gray-400 text-sm">Wake Losses</span>
                      <span className="text-white font-semibold">{simulationResults.results.wake_losses_percent}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                      <span className="text-gray-400 text-sm">Capacity Factor</span>
                      <span className="text-white font-semibold">{simulationResults.parameters.capacity_factor}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                      <span className="text-gray-400 text-sm">Total Capacity</span>
                      <span className="text-white font-semibold">{simulationResults.parameters.total_capacity_mw} MW</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                      <span className="text-gray-400 text-sm">Annual Revenue</span>
                      <span className="text-white font-semibold">${(simulationResults.results.annual_revenue_usd / 1000000).toFixed(2)}M</span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                      <span className="text-gray-400 text-sm">Project CAPEX</span>
                      <span className="text-white font-semibold">${simulationResults.results.project_capex_usd_million}M</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSimulationModal(false)}
                    className="flex-1 bg-gradient-to-r from-primary to-primary-dark text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-primary/50 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleExportResults}
                    className="flex-1 glass-panel border border-primary/30 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">download</span>
                    Export Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
