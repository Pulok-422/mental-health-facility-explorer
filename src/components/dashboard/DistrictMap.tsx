import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import type {
  DistrictPop,
  Facility,
  MapDisplay,
  ChoroplethMetric,
  BubbleMetric,
} from '@/types/dashboard';
import DistrictInfoCard from './DistrictInfoCard';
import { LocateFixed, Expand, Minimize, Home, ChevronDown, ChevronUp, Layers } from 'lucide-react';

const BANGLADESH_CENTER: [number, number] = [23.7, 90.35];
const BANGLADESH_ZOOM = 9.5;
const BANGLADESH_BOUNDS: L.LatLngBoundsExpression = [
  [20.5, 88.0],
  [26.7, 92.7],
];
const NO_DATA_FILL = '#9ca3af';

const TILE_LAYERS: Record<'light' | 'street' | 'satellite', string> = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

function getMetricPalette(metric: ChoroplethMetric): string[] {
  switch (metric) {
    case 'facilities':
      return ['#EFF6FF', '#BFDBFE', '#60A5FA', '#2563EB', '#1E3A8A'];
    case 'population':
      return ['#F5F3FF', '#DDD6FE', '#A78BFA', '#7C3AED', '#4C1D95'];
    case 'facilitiesPer100k':
      return ['#ECFDF5', '#A7F3D0', '#34D399', '#059669', '#064E3B'];
    case 'povertyIndex':
      return ['#FEF2F2', '#FCA5A5', '#EF4444', '#B91C1C', '#7F1D1D'];
    case 'literacyRate':
      return ['#F0FDFA', '#99F6E4', '#2DD4BF', '#0D9488', '#134E4A'];
    case 'urbanPercent':
      return ['#FFF7ED', '#FED7AA', '#FB923C', '#EA580C', '#7C2D12'];
    default:
      return ['#EFF6FF', '#BFDBFE', '#60A5FA', '#2563EB', '#1E3A8A'];
  }
}

function getMetricValue(d: DistrictPop, metric: ChoroplethMetric | BubbleMetric): number {
  switch (metric) {
    case 'facilities':
      return d.total_facilities;
    case 'population':
      return d.Population;
    case 'facilitiesPer100k':
      return d.facilitiesPer100k || 0;
    case 'populationPerFacility':
      return d.populationPerFacility || 0;
    case 'povertyIndex':
      return d['Poverty Index'];
    case 'literacyRate':
      return d.Literacy_rate;
    case 'urbanPercent':
      return d.Urban_percent;
    default:
      return d.total_facilities;
  }
}

function quantileBreaks(values: number[], n: number): number[] {
  if (!values.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const breaks: number[] = [];
  for (let i = 1; i < n; i++) {
    const idx = Math.floor((i / n) * sorted.length);
    breaks.push(sorted[Math.min(idx, sorted.length - 1)]);
  }
  return breaks;
}

function getQuantileColor(value: number, breaks: number[], palette: string[]): string {
  if (!palette.length) return '#cbd5e1';
  for (let i = 0; i < breaks.length; i++) {
    if (value <= breaks[i]) return palette[i];
  }
  return palette[palette.length - 1];
}

// Fix #7: avoid spread on huge arrays
function safeMinMax(arr: number[]): { min: number; max: number } {
  if (!arr.length) return { min: 0, max: 0 };
  let min = arr[0];
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    const v = arr[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

function getMentalHealthFacilityIcon() {
  return L.divIcon({
    className: 'mental-health-facility-marker-wrapper',
    html: `
      <div class="mental-health-facility-marker">
        <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
          <rect x="12" y="22" width="40" height="30" rx="3" fill="#cbd5e1" stroke="#111827" stroke-width="2.2"/>
          <rect x="24" y="40" width="16" height="12" rx="1.5" fill="#60a5fa" stroke="#111827" stroke-width="2"/>
          <rect x="17" y="27" width="6" height="11" rx="1" fill="#60a5fa" stroke="#111827" stroke-width="1.6"/>
          <rect x="25" y="27" width="6" height="11" rx="1" fill="#60a5fa" stroke="#111827" stroke-width="1.6"/>
          <rect x="33" y="27" width="6" height="11" rx="1" fill="#60a5fa" stroke="#111827" stroke-width="1.6"/>
          <rect x="41" y="27" width="6" height="11" rx="1" fill="#60a5fa" stroke="#111827" stroke-width="1.6"/>
          <rect x="20" y="36" width="24" height="4" rx="1" fill="#f472b6" stroke="#111827" stroke-width="1.6"/>
          <rect x="12" y="18" width="40" height="4" fill="#7dd3fc" stroke="#111827" stroke-width="1.6"/>
          <path d="M32 8 C28 4,20 6,20 14 C20 20,32 28,32 28 C32 28,44 20,44 14 C44 6,36 4,32 8Z"
            fill="#fb7185" stroke="#111827" stroke-width="2"/>
          <rect x="30" y="11.5" width="4" height="9" rx="1" fill="#ffffff" stroke="#111827" stroke-width="1"/>
          <rect x="27.5" y="14" width="9" height="4" rx="1" fill="#ffffff" stroke="#111827" stroke-width="1"/>
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function metricLabel(metric: ChoroplethMetric) {
  switch (metric) {
    case 'facilities': return 'Total Facilities';
    case 'population': return 'Population';
    case 'facilitiesPer100k': return 'Facilities per 100K';
    case 'povertyIndex': return 'Poverty Index';
    case 'literacyRate': return 'Literacy Rate';
    case 'urbanPercent': return 'Urban Percent';
    default: return 'Metric';
  }
}

function formatRangeValue(value: number, metric: ChoroplethMetric) {
  if (!Number.isFinite(value)) return '0';
  if (metric === 'population') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toFixed(0);
  }
  if (metric === 'literacyRate' || metric === 'urbanPercent') return `${value.toFixed(1)}%`;
  return value.toFixed(2).replace(/\.00$/, '');
}

interface DistrictMapProps {
  geojson: any;
  districts: DistrictPop[];
  facilities: Facility[];
  mapDisplay: MapDisplay;
  updateMapDisplay: <K extends keyof MapDisplay>(key: K, value: MapDisplay[K]) => void;
  selectedDistrict: string | null;
  onDistrictClick: (code: string | null) => void;
}

export default function DistrictMap({
  geojson,
  districts,
  facilities,
  mapDisplay,
  updateMapDisplay,
  selectedDistrict,
  onDistrictClick,
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
  const lastSelectionRef = useRef<string | null>(null);

  const [basemap, setBasemap] = useState<'light' | 'street' | 'satellite'>('light');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);

  const districtMap = useMemo(() => {
    const m = new Map<string, DistrictPop>();
    districts.forEach((d) => m.set(d.DIS_CODE, d));
    return m;
  }, [districts]);

  // Fix #10: cache centroids per geojson
  const centroidMap = useMemo(() => {
    const m = new Map<string, L.LatLng>();
    if (!geojson) return m;
    geojson.features.forEach((feat: any) => {
      const code = feat?.properties?.DIS_CODE;
      if (!code) return;
      try {
        const center = L.geoJSON(feat).getBounds().getCenter();
        m.set(code, center);
      } catch {
        /* ignore */
      }
    });
    return m;
  }, [geojson]);

  const metricValues = useMemo(
    () => districts.map((d) => getMetricValue(d, mapDisplay.choroplethMetric)),
    [districts, mapDisplay.choroplethMetric]
  );

  const metricRange = useMemo(() => safeMinMax(metricValues), [metricValues]);
  const breaks = useMemo(() => quantileBreaks(metricValues, 5), [metricValues]);
  const palette = useMemo(() => getMetricPalette(mapDisplay.choroplethMetric), [mapDisplay.choroplethMetric]);

  const selectedDistrictData = useMemo(() => {
    if (!selectedDistrict) return null;
    return districtMap.get(selectedDistrict) || null;
  }, [selectedDistrict, districtMap]);

  const fillOpacity =
    mapDisplay.showChoropleth && mapDisplay.showMarkers
      ? 0.35
      : mapDisplay.showChoropleth
      ? 0.55
      : 0;

  // Inject styles once
  useEffect(() => {
    const styleId = 'district-map-custom-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes userPulse {
        0% { transform: scale(0.8); opacity: 0.9; }
        70% { transform: scale(2.4); opacity: 0; }
        100% { transform: scale(2.4); opacity: 0; }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .leaflet-popup.user-location-leaflet-popup .leaflet-popup-content-wrapper {
        padding: 0; border-radius: 12px; background: transparent; box-shadow: none;
      }
      .leaflet-popup.user-location-leaflet-popup .leaflet-popup-content { margin: 0; }
      .leaflet-popup.user-location-leaflet-popup .leaflet-popup-tip {
        background: rgba(255,255,255,0.96); box-shadow: 0 6px 16px rgba(0,0,0,0.12);
      }
      .leaflet-popup.user-location-leaflet-popup .leaflet-popup-close-button { display: none; }
      .user-location-popup {
        min-width: 150px; padding: 10px 12px; border-radius: 12px;
        border: 1px solid rgba(229,231,235,0.95); background: rgba(255,255,255,0.96);
        backdrop-filter: blur(8px); box-shadow: 0 8px 24px rgba(0,0,0,0.14);
        animation: fadeInUp 0.22s ease;
      }
      .user-location-popup-title {
        display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
        font-size: 13px; font-weight: 700; color: #111827; line-height: 1.2;
      }
      .user-location-popup-dot {
        width: 8px; height: 8px; border-radius: 9999px; background: #dc2626;
        box-shadow: 0 0 0 3px rgba(220,38,38,0.16); flex: 0 0 auto;
      }
      .user-location-popup-subtitle { font-size: 11px; color: #6b7280; line-height: 1.35; }
      .mental-health-facility-marker-wrapper { background: transparent; border: 0; }
      .mental-health-facility-marker {
        width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
        filter: drop-shadow(0 6px 12px rgba(0,0,0,0.22)); transition: transform 0.15s ease;
      }
      .mental-health-facility-marker:hover { transform: scale(1.12); }
      @media (max-width: 768px) {
        .map-basemap-panel { max-width: calc(100vw - 24px); flex-wrap: wrap; }
        .map-legend-floating { max-width: calc(100vw - 24px); min-width: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, []);

  // Init map once
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
    map.setZoom(BANGLADESH_ZOOM);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Basemap swap
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileRef.current) {
      mapRef.current.removeLayer(tileRef.current);
      tileRef.current = null;
    }
    tileRef.current = L.tileLayer(TILE_LAYERS[basemap], {
      attribution: basemap === 'satellite' ? '© Esri' : '© OpenStreetMap',
    }).addTo(mapRef.current);
  }, [basemap]);

  // Choropleth / GeoJSON
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;
    if (geoLayerRef.current) map.removeLayer(geoLayerRef.current);

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        const code = feature?.properties?.DIS_CODE;
        const d = districtMap.get(code);
        const isSelected = selectedDistrict === code;
        const hasData = !!d;
        const value = hasData ? getMetricValue(d, mapDisplay.choroplethMetric) : 0;
        return {
          fillColor: mapDisplay.showChoropleth
            ? hasData
              ? getQuantileColor(value, breaks, palette)
              : NO_DATA_FILL
            : 'transparent',
          fillOpacity: isSelected ? Math.min(fillOpacity + 0.2, 0.8) : fillOpacity,
          color: isSelected ? '#000000' : '#1a1a1a',
          weight: isSelected ? 3 : 1.4,
          opacity: 1,
        };
      },
      onEachFeature: (feature, lyr) => {
        const code = feature.properties.DIS_CODE;
        const name = feature.properties.DIS_NAME;
        const d = districtMap.get(code);
        if (d) {
          lyr.bindTooltip(
            `<div class="district-name">${name}</div>
             <div class="tooltip-row"><span>Facilities</span><span class="value">${d.total_facilities}</span></div>
             <div class="tooltip-row"><span>Population</span><span class="value">${(d.Population / 1e6).toFixed(2)}M</span></div>
             <div class="tooltip-row"><span>Poverty Index</span><span class="value">${d['Poverty Index']}</span></div>
             <div class="tooltip-row"><span>Literacy</span><span class="value">${d.Literacy_rate}%</span></div>
             <div class="tooltip-row"><span>Per 100K</span><span class="value">${(d.facilitiesPer100k || 0).toFixed(2)}</span></div>`,
            { className: 'district-tooltip', sticky: true }
          );
        } else {
          lyr.bindTooltip(
            `<div class="district-name">${name}</div>
             <div class="tooltip-row"><span>Status</span><span class="value">No data</span></div>`,
            { className: 'district-tooltip', sticky: true }
          );
        }
        lyr.on('mouseover', () => {
          (lyr as any).setStyle({
            weight: 2.5,
            color: '#000000',
            fillOpacity: Math.min(fillOpacity + 0.15, 0.8),
          });
        });
        lyr.on('mouseout', () => geoLayerRef.current?.resetStyle(lyr as any));
        lyr.on('click', () => onDistrictClick(selectedDistrict === code ? null : code));
      },
    }).addTo(map);

    geoLayerRef.current = layer;
  }, [
    geojson,
    districtMap,
    mapDisplay.showChoropleth,
    mapDisplay.choroplethMetric,
    breaks,
    palette,
    fillOpacity,
    selectedDistrict,
    onDistrictClick,
  ]);

  // Fix #6: only re-fit when selection actually changes (don't fight user pan/zoom)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;
    if (lastSelectionRef.current === selectedDistrict) return;
    lastSelectionRef.current = selectedDistrict;

    if (!selectedDistrict) {
      map.fitBounds(BANGLADESH_BOUNDS, { padding: [10, 10] });
      map.setZoom(BANGLADESH_ZOOM);
      return;
    }
    const feat = geojson.features.find((f: any) => f.properties.DIS_CODE === selectedDistrict);
    if (feat) map.fitBounds(L.geoJSON(feat).getBounds(), { padding: [40, 40] });
  }, [selectedDistrict, geojson]);

  // Markers (cluster) — Fix #22 smaller radius
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clusterRef.current) map.removeLayer(clusterRef.current);
    if (!mapDisplay.showMarkers) return;

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 30,
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

    facilities.forEach((f) => {
      if (f.latitude && f.longitude) {
        const marker = L.marker([f.latitude, f.longitude], { icon: getMentalHealthFacilityIcon() });
        marker.bindPopup(
          `<div class="facility-popup">
            <h3>${f.facility_name}</h3>
            <div class="popup-grid">
              <span class="popup-label">Type</span><span class="popup-value">${f.facility_type || '-'}</span>
              <span class="popup-label">District</span><span class="popup-value">${f.DIS_NAME || '-'}</span>
              <span class="popup-label">Services</span><span class="popup-value">${f.services_provided || '-'}</span>
              <span class="popup-label">Cost</span><span class="popup-value">${f.cost || '-'}</span>
              <span class="popup-label">Ownership</span><span class="popup-value">${f.ownership || '-'}</span>
              ${f.mobile_contact_number ? `<span class="popup-label">Phone</span><span class="popup-value">${f.mobile_contact_number}</span>` : ''}
            </div>
          </div>`,
          { maxWidth: 300 }
        );
        cluster.addLayer(marker);
      }
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    return () => {
      if (clusterRef.current) map.removeLayer(clusterRef.current);
    };
  }, [facilities, mapDisplay.showMarkers]);

  // Heatmap — Fix #11
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }
    if (!mapDisplay.showHeatmap) return;
    const points: [number, number, number][] = facilities
      .filter((f) => f.latitude && f.longitude)
      .map((f) => [f.latitude, f.longitude, 1]);
    if (points.length > 0) {
      heatRef.current = (L as any).heatLayer(points, {
        radius: 22,
        blur: 18,
        maxZoom: 12,
        gradient: { 0.2: '#ffffb2', 0.4: '#fecc5c', 0.6: '#fd8d3c', 0.8: '#f03b20', 1: '#bd0026' },
      }).addTo(map);
    }
    return () => {
      if (heatRef.current) map.removeLayer(heatRef.current);
    };
  }, [facilities, mapDisplay.showHeatmap]);

  // Bubble overlay — uses cached centroids
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;
    if (bubbleRef.current) {
      map.removeLayer(bubbleRef.current);
      bubbleRef.current = null;
    }
    if (!mapDisplay.showBubbles) return;

    const group = L.layerGroup();
    const values = districts.map((d) => getMetricValue(d, mapDisplay.bubbleMetric));
    const { max: maxVal } = safeMinMax(values);
    const denom = Math.max(maxVal, 1);

    districts.forEach((d) => {
      const center = centroidMap.get(d.DIS_CODE);
      if (!center) return;
      const value = getMetricValue(d, mapDisplay.bubbleMetric);
      const radius = Math.max(4, Math.sqrt(value / denom) * 35);
      L.circleMarker(center, {
        radius,
        fillColor: 'hsl(210, 80%, 50%)',
        fillOpacity: 0.4,
        color: 'hsl(210, 80%, 40%)',
        weight: 1.5,
      })
        .bindTooltip(`<strong>${d.DIS_NAME}</strong><br/>${value.toLocaleString()}`, {
          className: 'district-tooltip',
        })
        .addTo(group);
    });

    group.addTo(map);
    bubbleRef.current = group;
    return () => {
      if (bubbleRef.current) map.removeLayer(bubbleRef.current);
    };
  }, [geojson, districts, centroidMap, mapDisplay.showBubbles, mapDisplay.bubbleMetric]);

  // Labels — uses cached centroids
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;
    if (labelRef.current) {
      map.removeLayer(labelRef.current);
      labelRef.current = null;
    }
    if (!mapDisplay.showLabels) return;

    const group = L.layerGroup();
    geojson.features.forEach((feat: any) => {
      const code = feat?.properties?.DIS_CODE;
      const name = feat?.properties?.DIS_NAME;
      if (!name) return;
      const center = centroidMap.get(code);
      if (!center) return;
      L.marker(center, {
        icon: L.divIcon({
          className: '',
          html: `<div style="font-size:9px;font-weight:600;color:#1a1a1a;text-shadow:0 0 3px white,0 0 3px white;white-space:nowrap;pointer-events:none">${name}</div>`,
          iconAnchor: [0, 0],
        }),
        interactive: false,
      }).addTo(group);
    });

    const updateVisibility = () => {
      const zoom = map.getZoom();
      if (zoom >= 8) {
        if (!map.hasLayer(group)) group.addTo(map);
      } else {
        if (map.hasLayer(group)) map.removeLayer(group);
      }
    };

    labelRef.current = group;
    map.on('zoomend', updateVisibility);
    updateVisibility();

    return () => {
      map.off('zoomend', updateVisibility);
      if (labelRef.current) map.removeLayer(labelRef.current);
    };
  }, [geojson, centroidMap, mapDisplay.showLabels]);

  const handleResetView = useCallback(() => {
    mapRef.current?.fitBounds(BANGLADESH_BOUNDS, { padding: [10, 10] });
    mapRef.current?.setZoom(BANGLADESH_ZOOM);
    onDistrictClick(null);
  }, [onDistrictClick]);

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
        if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);

        let nearest: { name: string; dist: number } | null = null;
        facilities.forEach((f) => {
          if (!f.latitude || !f.longitude) return;
          const dist = map.distance([latitude, longitude], [f.latitude, f.longitude]) / 1000;
          if (!nearest || dist < nearest.dist) nearest = { name: f.facility_name, dist };
        });

        const nearestHtml = nearest
          ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e5e7eb;font-size:11px;color:#374151">
              <div style="font-weight:600;color:#1d4ed8">Nearest Facility</div>
              <div>${nearest.name}</div>
              <div style="color:#6b7280">${nearest.dist.toFixed(1)} km · ~${Math.round((nearest.dist / 0.8) * 2)} min</div>
            </div>`
          : '';

        userMarkerRef.current = L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: '',
            html: `<div style="position:relative;width:18px;height:18px;">
              <span style="position:absolute;inset:0;border-radius:9999px;background:rgba(220,38,38,0.35);animation:userPulse 1.8s ease-out infinite"></span>
              <span style="position:absolute;inset:3px;border-radius:9999px;background:#dc2626;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></span>
            </div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(map);

        userMarkerRef.current.bindPopup(
          `<div class="user-location-popup">
            <div class="user-location-popup-title">
              <span class="user-location-popup-dot"></span><span>Your Location</span>
            </div>
            <div class="user-location-popup-subtitle">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</div>
            ${nearestHtml}
          </div>`,
          { closeButton: false, offset: [0, -10], className: 'user-location-leaflet-popup' }
        );
        userMarkerRef.current.openPopup();
        map.setView([latitude, longitude], 10);
      },
      () => {
        setLocationError('Location access denied');
        setTimeout(() => setLocationError(null), 3000);
      }
    );
  }, [facilities]);

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

  useEffect(() => {
    setTimeout(() => mapRef.current?.invalidateSize(), 200);
  }, [isFullscreen]);

  if (!geojson) return null;

  return (
    <div
      ref={wrapperRef}
      className="map-container relative"
      style={{ height: isFullscreen ? '100vh' : '560px' }}
    >
      {/* Top-left horizontal basemap switcher */}
      <div className="absolute top-3 left-3 z-[1000] rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-md flex flex-row gap-1">
        {(['light', 'street', 'satellite'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setBasemap(mode)}
            title={mode}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              basemap === mode
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            {mode === 'light' ? 'Light' : mode === 'street' ? 'Street' : 'Satellite'}
          </button>
        ))}
      </div>

      {/* Top-right horizontal control row: Layers · Locate · Reset · Fullscreen */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-row gap-2 items-center">
        <button
          type="button"
          onClick={() => setLayersOpen((o) => !o)}
          aria-label="Map layers"
          aria-expanded={layersOpen}
          title="Map layers"
          className={`h-9 w-9 rounded-xl border shadow-lg backdrop-blur-sm flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            layersOpen
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card/95 text-foreground border-border hover:bg-muted'
          }`}
        >
          <Layers className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleLocateUser}
          aria-label="Locate me"
          title="Locate me"
          className="h-9 w-9 rounded-xl border border-border bg-card/95 text-foreground shadow-lg backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          aria-label="Reset view"
          title="Reset to Bangladesh"
          className="h-9 w-9 rounded-xl border border-border bg-card/95 text-foreground shadow-lg backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Home className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title="Fullscreen"
          className="h-9 w-9 rounded-xl border border-border bg-card/95 text-foreground shadow-lg backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
        </button>
      </div>

      {/* Map Layers popover — compact, drops below the top-right control row */}
      {layersOpen && (
        <div className="absolute top-14 right-3 z-[1001] w-[200px] rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-md p-2.5 animate-fade-in">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
              <Layers className="h-3 w-3 text-primary" />
              Map Layers
            </span>
            <button
              type="button"
              onClick={() => setLayersOpen(false)}
              className="text-[13px] leading-none text-muted-foreground hover:text-foreground"
              aria-label="Close map layers"
            >
              ×
            </button>
          </div>

          <div className="space-y-0.5">
            {[
              { key: 'showChoropleth' as const, label: 'Choropleth' },
              { key: 'showMarkers' as const, label: 'Facility Markers' },
              { key: 'showHeatmap' as const, label: 'Heatmap' },
              { key: 'showBubbles' as const, label: 'Bubble Overlay' },
              { key: 'showLabels' as const, label: 'District Labels' },
            ].map((row) => {
              const checked = mapDisplay[row.key] as boolean;
              return (
                <label
                  key={row.key}
                  className="flex items-center justify-between gap-2 cursor-pointer py-1 min-w-0"
                >
                  <span className="text-[11px] text-foreground leading-tight truncate min-w-0">{row.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={row.label}
                    onClick={() => updateMapDisplay(row.key, !checked)}
                    className={`relative h-4 w-7 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      checked ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                        checked ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              );
            })}
          </div>

          {mapDisplay.showChoropleth && (
            <div className="pt-2 mt-1.5 border-t border-border">
              <div className="text-[9px] font-semibold tracking-wide text-muted-foreground uppercase mb-1">
                Choropleth Metric
              </div>
              <div className="space-y-0.5">
                {([
                  { value: 'facilities', label: 'Total Facilities' },
                  { value: 'population', label: 'Population' },
                  { value: 'facilitiesPer100k', label: 'Facilities per 100K' },
                  { value: 'povertyIndex', label: 'Poverty Index' },
                  { value: 'literacyRate', label: 'Literacy Rate' },
                  { value: 'urbanPercent', label: 'Urban Percent' },
                ] as { value: ChoroplethMetric; label: string }[]).map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-1.5 cursor-pointer text-[11px] text-foreground py-0.5"
                  >
                    <input
                      type="radio"
                      name="map-choropleth-metric"
                      checked={mapDisplay.choroplethMetric === opt.value}
                      onChange={() => updateMapDisplay('choroplethMetric', opt.value)}
                      className="h-3 w-3 accent-primary shrink-0"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend — Fix #21 collapsible */}
      {mapDisplay.showChoropleth && breaks.length > 0 && (
        <div className="map-legend-floating absolute left-3 bottom-3 z-[1000] min-w-[220px] rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setLegendOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Legend
              </span>
              <span className="text-xs font-medium text-foreground">
                {metricLabel(mapDisplay.choroplethMetric)}
              </span>
            </div>
            {legendOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {legendOpen && (
            <div className="px-3 pb-3 space-y-2">
              {palette.map((color, idx) => {
                const lo = idx === 0 ? metricRange.min : breaks[idx - 1];
                const hi = idx < breaks.length ? breaks[idx] : metricRange.max;
                const labels = ['Low', 'Moderate-Low', 'Moderate', 'Moderate-High', 'High'];
                return (
                  <div key={idx} className="flex items-center gap-2 text-[11px]">
                    <div
                      className="w-4 h-3 rounded-sm border border-black/10 shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-foreground">{labels[idx]}</span>
                    <span className="ml-auto text-muted-foreground">
                      {formatRangeValue(lo, mapDisplay.choroplethMetric)} to{' '}
                      {formatRangeValue(hi, mapDisplay.choroplethMetric)}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 text-[11px]">
                <div
                  className="w-4 h-3 rounded-sm border border-black/10 shrink-0"
                  style={{ backgroundColor: NO_DATA_FILL }}
                />
                <span className="text-foreground">No data</span>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedDistrictData && (
        <DistrictInfoCard district={selectedDistrictData} onClose={() => onDistrictClick(null)} />
      )}

      {locationError && (
        <div className="absolute bottom-3 right-3 z-[1000] rounded-lg border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-md backdrop-blur-sm">
          {locationError}
        </div>
      )}

      {facilities.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
          <div className="rounded-xl border border-border bg-card/90 px-6 py-4 text-center shadow-lg backdrop-blur-sm">
            <p className="text-sm text-muted-foreground">No facilities match current filters</p>
          </div>
        </div>
      )}

      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
