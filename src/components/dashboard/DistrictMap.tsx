import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import type { DistrictPop, Facility, Filters, ChoroplethMetric, BubbleMetric } from '@/types/dashboard';
import MapControls, { getMetricPalette } from './MapControls';
import DistrictInfoCard from './DistrictInfoCard';

const BANGLADESH_CENTER: [number, number] = [23.7, 90.35];
const BANGLADESH_ZOOM = 7.5;
const BANGLADESH_BOUNDS: L.LatLngBoundsExpression = [[20.5, 88.0], [26.7, 92.7]];

const TILE_LAYERS: Record<string, string> = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

function getMetricValue(district: DistrictPop, metric: ChoroplethMetric | BubbleMetric): number {
  switch (metric) {
    case 'facilities': return district.total_facilities;
    case 'population': return district.Population;
    case 'facilitiesPer100k': return district.facilitiesPer100k || 0;
    case 'populationPerFacility': return district.populationPerFacility || 0;
    case 'povertyIndex': return district["Poverty Index"];
    case 'literacyRate': return district.Literacy_rate;
    case 'urbanPercent': return district.Urban_percent;
    default: return district.total_facilities;
  }
}

function quantileBreaks(values: number[], n: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const breaks: number[] = [];
  for (let i = 1; i < n; i++) {
    const idx = Math.floor((i / n) * sorted.length);
    breaks.push(sorted[Math.min(idx, sorted.length - 1)]);
  }
  return breaks;
}

function getQuantileColor(value: number, breaks: number[], palette: string[]): string {
  for (let i = 0; i < breaks.length; i++) {
    if (value <= breaks[i]) return palette[i];
  }
  return palette[palette.length - 1];
}

interface DistrictMapProps {
  geojson: any;
  districts: DistrictPop[];
  facilities: Facility[];
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  selectedDistrict: string | null;
  onDistrictClick: (code: string | null) => void;
}

export default function DistrictMap({
  geojson, districts, facilities, filters, updateFilter, selectedDistrict, onDistrictClick,
}: DistrictMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatRef = useRef<any>(null);
  const bubbleRef = useRef<L.LayerGroup | null>(null);
  const labelRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const [basemap, setBasemap] = useState<'light' | 'street' | 'satellite'>('light');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const districtMap = useMemo(() => {
    const map = new Map<string, DistrictPop>();
    districts.forEach(d => map.set(d.DIS_CODE, d));
    return map;
  }, [districts]);

  const metricValues = useMemo(() =>
    districts.map(d => getMetricValue(d, filters.choroplethMetric)),
    [districts, filters.choroplethMetric]
  );

  const metricRange = useMemo(() => ({
    min: Math.min(...metricValues),
    max: Math.max(...metricValues),
  }), [metricValues]);

  const breaks = useMemo(() =>
    quantileBreaks(metricValues, 5),
    [metricValues]
  );

  const palette = useMemo(() =>
    getMetricPalette(filters.choroplethMetric),
    [filters.choroplethMetric]
  );

  const selectedDistrictData = useMemo(() => {
    if (!selectedDistrict) return null;
    return districtMap.get(selectedDistrict) || null;
  }, [selectedDistrict, districtMap]);

  // Determine fill opacity: lighten when both choropleth and markers active
  const fillOpacity = filters.showChoropleth && filters.showMarkers ? 0.35 : filters.showChoropleth ? 0.55 : 0;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: BANGLADESH_CENTER,
      zoom: BANGLADESH_ZOOM,
      zoomControl: false,
      maxBounds: [[18, 85], [29, 95]],
      minZoom: 6,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    tileRef.current = L.tileLayer(TILE_LAYERS.light, {
      attribution: '© OpenStreetMap © CARTO',
    }).addTo(map);
    map.fitBounds(BANGLADESH_BOUNDS, { padding: [10, 10] });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Basemap switch
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileRef.current) mapRef.current.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(TILE_LAYERS[basemap], {
      attribution: '© OpenStreetMap',
    }).addTo(mapRef.current);
  }, [basemap]);

  // GeoJSON choropleth layer
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
          fillColor: filters.showChoropleth ? getQuantileColor(value, breaks, palette) : 'transparent',
          fillOpacity: isSelected ? Math.min(fillOpacity + 0.2, 0.8) : fillOpacity,
          color: isSelected ? '#000000' : '#1a1a1a',
          weight: isSelected ? 3 : 1.4,
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
            <div class="tooltip-row"><span>Per 100K</span><span class="value">${(d.facilitiesPer100k || 0).toFixed(2)}</span></div>
          `, { className: 'district-tooltip', sticky: true });
        }

        // Hover effect
        layer.on('mouseover', () => {
          (layer as any).setStyle({ weight: 2.5, color: '#000000', fillOpacity: Math.min(fillOpacity + 0.15, 0.8) });
        });
        layer.on('mouseout', () => {
          geoLayerRef.current?.resetStyle(layer as any);
        });
        layer.on('click', () => onDistrictClick(selectedDistrict === code ? null : code));
      },
    }).addTo(map);

    geoLayerRef.current = layer;

    if (selectedDistrict && geojson) {
      const feat = geojson.features.find((f: any) => f.properties.DIS_CODE === selectedDistrict);
      if (feat) {
        map.fitBounds(L.geoJSON(feat).getBounds(), { padding: [40, 40] });
      }
    }
  }, [geojson, districtMap, filters.showChoropleth, filters.choroplethMetric, breaks, palette, fillOpacity, selectedDistrict, onDistrictClick]);

  // Facility markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clusterRef.current) map.removeLayer(clusterRef.current);
    if (!filters.showMarkers) return;

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 45,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        const size = count < 10 ? 28 : count < 50 ? 36 : 46;
        return L.divIcon({
          html: `<div class="custom-cluster-icon" style="width:${size}px;height:${size}px">${count}</div>`,
          className: '',
          iconSize: [size, size],
        });
      },
    });

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:8px;height:8px;background:hsl(210,80%,50%);border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
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
              <span class="popup-label">Cost</span><span class="popup-value">${f.cost || '-'}</span>
              <span class="popup-label">Ownership</span><span class="popup-value">${f.ownership || '-'}</span>
              ${f.mobile_contact_number ? `<span class="popup-label">Phone</span><span class="popup-value">${f.mobile_contact_number}</span>` : ''}
            </div>
          </div>
        `, { maxWidth: 300 });
        cluster.addLayer(marker);
      }
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;
    return () => { if (clusterRef.current) map.removeLayer(clusterRef.current); };
  }, [facilities, filters.showMarkers]);

  // Heatmap layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null; }
    if (!filters.showHeatmap) return;

    const points: [number, number, number][] = facilities
      .filter(f => f.latitude && f.longitude)
      .map(f => [f.latitude, f.longitude, 0.6]);

    if (points.length > 0) {
      heatRef.current = (L as any).heatLayer(points, {
        radius: 20,
        blur: 15,
        maxZoom: 12,
        gradient: { 0.2: '#ffffb2', 0.4: '#fecc5c', 0.6: '#fd8d3c', 0.8: '#f03b20', 1: '#bd0026' },
      }).addTo(map);
    }
    return () => { if (heatRef.current) map.removeLayer(heatRef.current); };
  }, [facilities, filters.showHeatmap]);

  // Bubble overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;
    if (bubbleRef.current) { map.removeLayer(bubbleRef.current); bubbleRef.current = null; }
    if (!filters.showBubbles) return;

    const group = L.layerGroup();
    const values = districts.map(d => getMetricValue(d, filters.bubbleMetric));
    const maxVal = Math.max(...values, 1);

    geojson.features.forEach((feat: any) => {
      const code = feat.properties.DIS_CODE;
      const d = districtMap.get(code);
      if (!d) return;
      const value = getMetricValue(d, filters.bubbleMetric);
      const radius = Math.max(4, Math.sqrt(value / maxVal) * 35);
      const center = L.geoJSON(feat).getBounds().getCenter();
      L.circleMarker(center, {
        radius,
        fillColor: 'hsl(210, 80%, 50%)',
        fillOpacity: 0.4,
        color: 'hsl(210, 80%, 40%)',
        weight: 1.5,
      })
        .bindTooltip(`<strong>${d.DIS_NAME}</strong><br/>${value.toLocaleString()}`, { className: 'district-tooltip' })
        .addTo(group);
    });

    group.addTo(map);
    bubbleRef.current = group;
    return () => { if (bubbleRef.current) map.removeLayer(bubbleRef.current); };
  }, [geojson, districts, districtMap, filters.showBubbles, filters.bubbleMetric]);

  // District labels
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;
    if (labelRef.current) { map.removeLayer(labelRef.current); labelRef.current = null; }
    if (!filters.showLabels) return;

    const group = L.layerGroup();
    geojson.features.forEach((feat: any) => {
      const name = feat.properties.DIS_NAME;
      if (!name) return;
      const center = L.geoJSON(feat).getBounds().getCenter();
      L.marker(center, {
        icon: L.divIcon({
          className: '',
          html: `<div style="font-size:9px;font-weight:600;color:#1a1a1a;text-shadow:0 0 3px white,0 0 3px white;white-space:nowrap;pointer-events:none">${name}</div>`,
          iconAnchor: [0, 0],
        }),
        interactive: false,
      }).addTo(group);
    });

    group.addTo(map);
    labelRef.current = group;

    // Show labels only at zoom >= 8
    const updateVisibility = () => {
      const zoom = map.getZoom();
      if (zoom >= 8) group.addTo(map);
      else map.removeLayer(group);
    };
    map.on('zoomend', updateVisibility);
    updateVisibility();

    return () => {
      map.off('zoomend', updateVisibility);
      if (labelRef.current) map.removeLayer(labelRef.current);
    };
  }, [geojson, filters.showLabels]);

  // Actions
  const handleFitBangladesh = useCallback(() => {
    mapRef.current?.fitBounds(BANGLADESH_BOUNDS, { padding: [10, 10] });
  }, []);

  const handleFitSelected = useCallback(() => {
    if (!selectedDistrict || !geojson || !mapRef.current) return;
    const feat = geojson.features.find((f: any) => f.properties.DIS_CODE === selectedDistrict);
    if (feat) mapRef.current.fitBounds(L.geoJSON(feat).getBounds(), { padding: [40, 40] });
  }, [selectedDistrict, geojson]);

  const handleResetView = useCallback(() => {
    mapRef.current?.setView(BANGLADESH_CENTER, BANGLADESH_ZOOM);
  }, []);

  const handleLocateUser = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setTimeout(() => setLocationError(null), 3000);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const map = mapRef.current;
        if (!map) return;
        if (userMarkerRef.current = L.marker([latitude, longitude], {
  icon: L.divIcon({
    className: '',
    html: `
      <div style="position: relative; width:18px; height:18px;">
        <span style="
          position:absolute;
          inset:0;
          border-radius:9999px;
          background:rgba(220, 38, 38, 0.35);
          animation:userPulse 1.8s ease-out infinite;
        "></span>
        <span style="
          position:absolute;
          inset:3px;
          border-radius:9999px;
          background:#dc2626;
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
        "></span>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  }),
}).addTo(map).bindPopup('You are here').openPopup();
        map.setView([latitude, longitude], 10);
      },
      () => {
        setLocationError('Location access denied');
        setTimeout(() => setLocationError(null), 3000);
      },
    );
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Invalidate map size on fullscreen change
  useEffect(() => {
    setTimeout(() => mapRef.current?.invalidateSize(), 200);
  }, [isFullscreen]);

  if (!geojson) return null;

  return (
    <div ref={wrapperRef} className="map-container relative" style={{ height: isFullscreen ? '100vh' : '560px' }}>
      <MapControls
        filters={filters}
        updateFilter={updateFilter}
        basemap={basemap}
        setBasemap={setBasemap}
        onResetView={handleResetView}
        onFitBangladesh={handleFitBangladesh}
        onFitSelected={handleFitSelected}
        onLocateUser={handleLocateUser}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        hasSelection={!!selectedDistrict}
        metricRange={metricRange}
        getQuantileBreaks={() => breaks}
      />

      {selectedDistrictData && (
        <DistrictInfoCard
          district={selectedDistrictData}
          onClose={() => onDistrictClick(null)}
        />
      )}

      {locationError && (
        <div className="absolute bottom-3 right-3 z-[1000] px-3 py-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-md text-xs text-muted-foreground">
          {locationError}
        </div>
      )}

      {facilities.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl px-6 py-4 shadow-lg text-center">
            <p className="text-sm text-muted-foreground">No facilities match current filters</p>
          </div>
        </div>
      )}

      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
