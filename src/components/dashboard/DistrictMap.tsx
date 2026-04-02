import { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { DistrictPop, Facility, Filters, ChoroplethMetric } from '@/types/dashboard';

const BANGLADESH_CENTER: [number, number] = [23.8, 90.4];
const BANGLADESH_ZOOM = 7;

const TILE_LAYERS: Record<string, string> = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

function getColor(value: number, min: number, max: number): string {
  const ratio = max > min ? (value - min) / (max - min) : 0;
  const colors = ['#E3F2FD', '#90CAF9', '#42A5F5', '#1E88E5', '#1565C0', '#0D47A1'];
  return colors[Math.min(Math.floor(ratio * colors.length), colors.length - 1)];
}

function getMetricValue(district: DistrictPop, metric: ChoroplethMetric): number {
  switch (metric) {
    case 'facilities': return district.total_facilities;
    case 'population': return district.Population;
    case 'facilitiesPer100k': return district.facilitiesPer100k || 0;
    case 'populationPerFacility': return district.populationPerFacility || 0;
    case 'povertyIndex': return district["Poverty Index"];
    case 'literacyRate': return district.Literacy_rate;
    default: return district.total_facilities;
  }
}

interface DistrictMapProps {
  geojson: any;
  districts: DistrictPop[];
  facilities: Facility[];
  filters: Filters;
  selectedDistrict: string | null;
  onDistrictClick: (code: string | null) => void;
}

export default function DistrictMap({
  geojson, districts, facilities, filters, selectedDistrict, onDistrictClick,
}: DistrictMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const [basemap, setBasemap] = useState<'light' | 'street' | 'satellite'>('light');

  const districtMap = useMemo(() => {
    const map = new Map<string, DistrictPop>();
    districts.forEach(d => map.set(d.DIS_CODE, d));
    return map;
  }, [districts]);

  const metricRange = useMemo(() => {
    const values = districts.map(d => getMetricValue(d, filters.choroplethMetric));
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [districts, filters.choroplethMetric]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: BANGLADESH_CENTER, zoom: BANGLADESH_ZOOM, zoomControl: true });
    tileRef.current = L.tileLayer(TILE_LAYERS.light, { attribution: '© OpenStreetMap' }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Basemap switch
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileRef.current) mapRef.current.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(TILE_LAYERS[basemap], { attribution: '© OpenStreetMap' }).addTo(mapRef.current);
  }, [basemap]);

  // GeoJSON layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;

    if (geoLayerRef.current) map.removeLayer(geoLayerRef.current);

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        const code = feature?.properties?.DIS_CODE;
        const d = districtMap.get(code);
        const isSelected = selectedDistrict === code;
        const value = d ? getMetricValue(d, filters.choroplethMetric) : 0;
        return {
          fillColor: filters.showChoropleth ? getColor(value, metricRange.min, metricRange.max) : 'transparent',
          fillOpacity: filters.showChoropleth ? (isSelected ? 0.8 : 0.5) : 0,
          color: isSelected ? 'hsl(210,80%,50%)' : '#94a3b8',
          weight: isSelected ? 3 : 1,
          opacity: 1,
        };
      },
      onEachFeature: (feature, layer) => {
        const code = feature.properties.DIS_CODE;
        const name = feature.properties.DIS_NAME;
        const d = districtMap.get(code);

        if (d) {
          layer.bindTooltip(`
            <div class="district-name">${name}</div>
            <div class="tooltip-row"><span>Facilities</span><span class="value">${d.total_facilities}</span></div>
            <div class="tooltip-row"><span>Population</span><span class="value">${(d.Population / 1e6).toFixed(2)}M</span></div>
            <div class="tooltip-row"><span>Poverty Index</span><span class="value">${d["Poverty Index"]}</span></div>
            <div class="tooltip-row"><span>Literacy</span><span class="value">${d.Literacy_rate}%</span></div>
            <div class="tooltip-row"><span>Urban</span><span class="value">${d.Urban_percent}%</span></div>
            <div class="tooltip-row"><span>Households</span><span class="value">${d.Total_households.toLocaleString()}</span></div>
            <div class="tooltip-row"><span>Per 100K</span><span class="value">${(d.facilitiesPer100k || 0).toFixed(2)}</span></div>
            <div class="tooltip-row"><span>Pop/Facility</span><span class="value">${(d.populationPerFacility || 0).toLocaleString()}</span></div>
          `, { className: 'district-tooltip', sticky: true });
        }

        layer.on('click', () => onDistrictClick(selectedDistrict === code ? null : code));
      },
    }).addTo(map);

    geoLayerRef.current = layer;

    // Fit bounds
    if (selectedDistrict && geojson) {
      const feat = geojson.features.find((f: any) => f.properties.DIS_CODE === selectedDistrict);
      if (feat) {
        const sl = L.geoJSON(feat);
        map.fitBounds(sl.getBounds(), { padding: [40, 40] });
      }
    } else {
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    }
  }, [geojson, districtMap, filters.showChoropleth, filters.choroplethMetric, metricRange, selectedDistrict, onDistrictClick]);

  // Facility markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clusterRef.current) map.removeLayer(clusterRef.current);

    if (!filters.showMarkers) return;

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        const size = count < 10 ? 30 : count < 50 ? 40 : 50;
        return L.divIcon({
          html: `<div class="custom-cluster-icon" style="width:${size}px;height:${size}px">${count}</div>`,
          className: '',
          iconSize: [size, size],
        });
      },
    });

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:10px;height:10px;background:hsl(210,80%,50%);border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    facilities.forEach(f => {
      if (f.latitude && f.longitude) {
        const marker = L.marker([f.latitude, f.longitude], { icon });
        marker.bindPopup(`
          <div class="facility-popup">
            <h3>${f.facility_name}</h3>
            <div class="popup-grid">
              <span class="popup-label">Type</span><span class="popup-value">${f.facility_type || '-'}</span>
              <span class="popup-label">District</span><span class="popup-value">${f.DIS_NAME || '-'}</span>
              <span class="popup-label">Services</span><span class="popup-value">${f.services_provided || '-'}</span>
              <span class="popup-label">Category</span><span class="popup-value">${f.category_adult_child_both || '-'}</span>
              <span class="popup-label">Cost</span><span class="popup-value">${f.cost || '-'}</span>
              <span class="popup-label">Appointment</span><span class="popup-value">${f.appointment_required || '-'}</span>
              <span class="popup-label">Days</span><span class="popup-value">${f.service_days || '-'}</span>
              <span class="popup-label">Hours</span><span class="popup-value">${f.visiting_hours || '-'}</span>
              <span class="popup-label">Ownership</span><span class="popup-value">${f.ownership || '-'}</span>
              <span class="popup-label">Origin</span><span class="popup-value">${f.origin || '-'}</span>
              <span class="popup-label">Address</span><span class="popup-value">${f.address || '-'}</span>
              ${f.website ? `<span class="popup-label">Website</span><span class="popup-value"><a href="${f.website}" target="_blank" style="color:hsl(210,80%,50%)">Visit</a></span>` : ''}
              ${f.mobile_contact_number ? `<span class="popup-label">Phone</span><span class="popup-value">${f.mobile_contact_number}</span>` : ''}
              ${f.email_address ? `<span class="popup-label">Email</span><span class="popup-value">${f.email_address}</span>` : ''}
            </div>
          </div>
        `, { maxWidth: 320 });
        cluster.addLayer(marker);
      }
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    return () => {
      if (clusterRef.current) map.removeLayer(clusterRef.current);
    };
  }, [facilities, filters.showMarkers]);

  if (!geojson) return null;

  return (
    <div className="map-container relative" style={{ height: '500px' }}>
      <div className="absolute top-3 right-3 z-[1000] flex gap-1 bg-card/90 backdrop-blur-sm rounded-lg p-1 border border-border shadow-sm">
        {(['light', 'street', 'satellite'] as const).map(b => (
          <button
            key={b}
            onClick={() => setBasemap(b)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              basemap === b ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            {b.charAt(0).toUpperCase() + b.slice(1)}
          </button>
        ))}
      </div>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
