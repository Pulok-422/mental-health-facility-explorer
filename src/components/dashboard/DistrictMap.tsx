import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import type { DistrictPop, Facility, Filters, ChoroplethMetric, BubbleMetric } from '@/types/dashboard';
import DistrictInfoCard from './DistrictInfoCard';
import MapControls, { getMetricPalette } from './MapControls';

const BANGLADESH_CENTER: [number, number] = [23.7, 90.35];
const BANGLADESH_ZOOM = 8.5;
const BANGLADESH_BOUNDS: L.LatLngBoundsExpression = [[20.5, 88.0], [26.7, 92.7]];
const NO_DATA_FILL = '#9ca3af';

const TILE_LAYERS: Record<'light' | 'street' | 'satellite', string> = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

function getMetricValue(district: DistrictPop, metric: ChoroplethMetric | BubbleMetric): number {
  switch (metric) {
    case 'facilities':
      return district.total_facilities;
    case 'population':
      return district.Population;
    case 'facilitiesPer100k':
      return district.facilitiesPer100k || 0;
    case 'populationPerFacility':
      return district.populationPerFacility || 0;
    case 'povertyIndex':
      return district['Poverty Index'];
    case 'literacyRate':
      return district.Literacy_rate;
    case 'urbanPercent':
      return district.Urban_percent;
    default:
      return district.total_facilities;
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
    case 'facilities':
      return 'Total Facilities';
    case 'population':
      return 'Population';
    case 'facilitiesPer100k':
      return 'Facilities per 100K';
    case 'povertyIndex':
      return 'Poverty Index';
    case 'literacyRate':
      return 'Literacy Rate';
    case 'urbanPercent':
      return 'Urban Percent';
    default:
      return 'Metric';
  }
}

function formatRangeValue(value: number, metric: ChoroplethMetric) {
  if (!Number.isFinite(value)) return '0';

  if (metric === 'population') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toFixed(0);
  }

  if (metric === 'literacyRate' || metric === 'urbanPercent') {
    return `${value.toFixed(1)}%`;
  }

  return value.toFixed(2).replace(/\.00$/, '');
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
  geojson,
  districts,
  facilities,
  filters,
  updateFilter,
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

  const [basemap, setBasemap] = useState<'light' | 'street' | 'satellite'>('light');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const districtMap = useMemo(() => {
    const map = new Map<string, DistrictPop>();
    districts.forEach((d) => map.set(d.DIS_CODE, d));
    return map;
  }, [districts]);

  const metricValues = useMemo(
    () => districts.map((d) => getMetricValue(d, filters.choroplethMetric)),
    [districts, filters.choroplethMetric]
  );

  const metricRange = useMemo(
    () => ({
      min: metricValues.length ? Math.min(...metricValues) : 0,
      max: metricValues.length ? Math.max(...metricValues) : 0,
    }),
    [metricValues]
  );

  const breaks = useMemo(() => quantileBreaks(metricValues, 5), [metricValues]);

  const palette = useMemo(
    () => getMetricPalette(filters.choroplethMetric),
    [filters.choroplethMetric]
  );

  const selectedDistrictData = useMemo(() => {
    if (!selectedDistrict) return null;
    return districtMap.get(selectedDistrict) || null;
  }, [selectedDistrict, districtMap]);

  const fillOpacity =
    filters.showChoropleth && filters.showMarkers ? 0.35 : filters.showChoropleth ? 0.55 : 0;

  useEffect(() => {
    const styleId = 'district-map-custom-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes userPulse {
        0% {
          transform: scale(0.8);
          opacity: 0.9;
        }
        70% {
          transform: scale(2.4);
          opacity: 0;
        }
        100% {
          transform: scale(2.4);
          opacity: 0;
        }
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .leaflet-popup.user-location-leaflet-popup .leaflet-popup-content-wrapper {
        padding: 0;
        border-radius: 12px;
        background: transparent;
        box-shadow: none;
      }

      .leaflet-popup.user-location-leaflet-popup .leaflet-popup-content {
        margin: 0;
      }

      .leaflet-popup.user-location-leaflet-popup .leaflet-popup-tip {
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
      }

      .leaflet-popup.user-location-leaflet-popup .leaflet-popup-close-button {
        display: none;
      }

      .user-location-popup {
        min-width: 150px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(229, 231, 235, 0.95);
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(8px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
        animation: fadeInUp 0.22s ease;
      }

      .user-location-popup-title {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
        font-size: 13px;
        font-weight: 700;
        color: #111827;
        line-height: 1.2;
      }

      .user-location-popup-dot {
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        background: #dc2626;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.16);
        flex: 0 0 auto;
      }

      .user-location-popup-subtitle {
        font-size: 11px;
        color: #6b7280;
        line-height: 1.35;
      }

      .mental-health-facility-marker-wrapper {
        background: transparent;
        border: 0;
      }

      .mental-health-facility-marker {
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.22));
        transition: transform 0.15s ease;
      }

      .mental-health-facility-marker:hover {
        transform: scale(1.12);
      }

      @media (max-width: 768px) {
        .map-controls-panel {
          width: min(290px, calc(100vw - 24px));
        }

        .map-basemap-panel {
          max-width: calc(100vw - 24px);
          flex-wrap: wrap;
        }

        .map-legend-floating {
          max-width: calc(100vw - 24px);
          min-width: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, []);

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

  useEffect(() => {
    if (!mapRef.current) return;
    if (tileRef.current) mapRef.current.removeLayer(tileRef.current);

    tileRef.current = L.tileLayer(TILE_LAYERS[basemap], {
      attribution: basemap === 'satellite' ? '© Esri' : '© OpenStreetMap',
    }).addTo(mapRef.current);
  }, [basemap]);

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
        const value = hasData ? getMetricValue(d, filters.choroplethMetric) : 0;

        return {
          fillColor: filters.showChoropleth
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
      onEachFeature: (feature, layer) => {
        const code = feature.properties.DIS_CODE;
        const name = feature.properties.DIS_NAME;
        const d = districtMap.get(code);

        if (d) {
          layer.bindTooltip(
            `
            <div class="district-name">${name}</div>
            <div class="tooltip-row"><span>Facilities</span><span class="value">${d.total_facilities}</span></div>
            <div class="tooltip-row"><span>Population</span><span class="value">${(d.Population / 1e6).toFixed(2)}M</span></div>
            <div class="tooltip-row"><span>Poverty Index</span><span class="value">${d['Poverty Index']}</span></div>
            <div class="tooltip-row"><span>Literacy</span><span class="value">${d.Literacy_rate}%</span></div>
            <div class="tooltip-row"><span>Per 100K</span><span class="value">${(d.facilitiesPer100k || 0).toFixed(2)}</span></div>
          `,
            { className: 'district-tooltip', sticky: true }
          );
        } else {
          layer.bindTooltip(
            `
            <div class="district-name">${name}</div>
            <div class="tooltip-row"><span>Status</span><span class="value">No data</span></div>
          `,
            { className: 'district-tooltip', sticky: true }
          );
        }

        layer.on('mouseover', () => {
          (layer as any).setStyle({
            weight: 2.5,
            color: '#000000',
            fillOpacity: Math.min(fillOpacity + 0.15, 0.8),
          });
        });

        layer.on('mouseout', () => {
          geoLayerRef.current?.resetStyle(layer as any);
        });

        layer.on('click', () => onDistrictClick(selectedDistrict === code ? null : code));
      },
    }).addTo(map);

    geoLayerRef.current = layer;
  }, [
    geojson,
    districtMap,
    filters.showChoropleth,
    filters.choroplethMetric,
    breaks,
    palette,
    fillOpacity,
    selectedDistrict,
    onDistrictClick,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;

    if (!selectedDistrict) {
      map.fitBounds(BANGLADESH_BOUNDS, { padding: [10, 10] });
      map.setZoom(BANGLADESH_ZOOM);
      return;
    }

    const feat = geojson.features.find((f: any) => f.properties.DIS_CODE === selectedDistrict);
    if (feat) {
      map.fitBounds(L.geoJSON(feat).getBounds(), { padding: [40, 40] });
    }
  }, [selectedDistrict, geojson]);

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

    facilities.forEach((f) => {
      if (f.latitude && f.longitude) {
        const marker = L.marker([f.latitude, f.longitude], {
          icon: getMentalHealthFacilityIcon(),
        });

        marker.bindPopup(
          `
          <div class="facility-popup">
            <h3>${f.facility_name}</h3>
            <div class="popup-grid">
              <span class="popup-label">Type</span><span class="popup-value">${f.facility_type || '-'}</span>
              <span class="popup-label">District</span><span class="popup-value">${f.DIS_NAME || '-'}</span>
              <span class="popup-label">Services</span><span class="popup-value">${f.services_provided || '-'}</span>
              <span class="popup-label">Cost</span><span class="popup-value">${f.cost || '-'}</span>
              <span class="popup-label">Ownership</span><span class="popup-value">${f.ownership || '-'}</span>
              ${
                f.mobile_contact_number
                  ? `<span class="popup-label">Phone</span><span class="popup-value">${f.mobile_contact_number}</span>`
                  : ''
              }
            </div>
          </div>
        `,
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
  }, [facilities, filters.showMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }

    if (!filters.showHeatmap) return;

    const points: [number, number, number][] = facilities
      .filter((f) => f.latitude && f.longitude)
      .map((f) => [f.latitude, f.longitude, 0.6]);

    if (points.length > 0) {
      heatRef.current = (L as any).heatLayer(points, {
        radius: 20,
        blur: 15,
        maxZoom: 12,
        gradient: {
          0.2: '#ffffb2',
          0.4: '#fecc5c',
          0.6: '#fd8d3c',
          0.8: '#f03b20',
          1: '#bd0026',
        },
      }).addTo(map);
    }

    return () => {
      if (heatRef.current) map.removeLayer(heatRef.current);
    };
  }, [facilities, filters.showHeatmap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;

    if (bubbleRef.current) {
      map.removeLayer(bubbleRef.current);
      bubbleRef.current = null;
    }

    if (!filters.showBubbles) return;

    const group = L.layerGroup();
    const values = districts.map((d) => getMetricValue(d, filters.bubbleMetric));
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
  }, [geojson, districts, districtMap, filters.showBubbles, filters.bubbleMetric]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;

    if (labelRef.current) {
      map.removeLayer(labelRef.current);
      labelRef.current = null;
    }

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

  const handleFitBangladesh = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.fitBounds(BANGLADESH_BOUNDS, { padding: [10, 10] });
    mapRef.current.setZoom(BANGLADESH_ZOOM);
  }, []);

  const handleFitSelected = useCallback(() => {
    if (!selectedDistrict || !geojson || !mapRef.current) return;
    const feat = geojson.features.find((f: any) => f.properties.DIS_CODE === selectedDistrict);
    if (feat) {
      mapRef.current.fitBounds(L.geoJSON(feat).getBounds(), { padding: [40, 40] });
    }
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

        if (userMarkerRef.current) {
          map.removeLayer(userMarkerRef.current);
        }

        let nearest: { name: string; dist: number } | null = null;
        facilities.forEach((f) => {
          if (!f.latitude || !f.longitude) return;
          const d = map.distance([latitude, longitude], [f.latitude, f.longitude]) / 1000;
          if (!nearest || d < nearest.dist) {
            nearest = { name: f.facility_name, dist: d };
          }
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
            html: `
              <div style="position: relative; width: 18px; height: 18px;">
                <span style="position:absolute;inset:0;border-radius:9999px;background:rgba(220,38,38,0.35);animation:userPulse 1.8s ease-out infinite"></span>
                <span style="position:absolute;inset:3px;border-radius:9999px;background:#dc2626;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></span>
              </div>
            `,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(map);

        userMarkerRef.current.bindPopup(
          `<div class="user-location-popup">
            <div class="user-location-popup-title">
              <span class="user-location-popup-dot"></span>
              <span>Your Location</span>
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
      <div className="map-basemap-panel absolute top-3 left-3 z-[1000] rounded-2xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur-md flex gap-2">
        {(['light', 'street', 'satellite'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setBasemap(mode)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              basemap === mode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            {mode === 'light' ? 'Light' : mode === 'street' ? 'Street' : 'Satellite'}
          </button>
        ))}
      </div>

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

      {filters.showChoropleth && breaks.length > 0 && (
        <div className="map-legend-floating absolute left-3 bottom-3 z-[1000] min-w-[220px] rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
            Legend
          </div>

          <div className="mb-2 text-sm font-medium text-foreground">
            {metricLabel(filters.choroplethMetric)}
          </div>

          <div className="space-y-2">
            <>
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
                      {formatRangeValue(lo, filters.choroplethMetric)} to{' '}
                      {formatRangeValue(hi, filters.choroplethMetric)}
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
            </>
          </div>
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
