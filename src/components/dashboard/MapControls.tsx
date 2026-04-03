import { useState } from 'react';
import type { Filters, ChoroplethMetric } from '@/types/dashboard';
import { Layers3, ChevronDown, LocateFixed, Expand, Minimize } from 'lucide-react';

interface MapControlsProps {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  basemap: 'light' | 'street' | 'satellite';
  setBasemap: (value: 'light' | 'street' | 'satellite') => void;
  onResetView: () => void;
  onFitBangladesh: () => void;
  onFitSelected: () => void;
  onLocateUser: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  hasSelection: boolean;
  metricRange: { min: number; max: number };
  getQuantileBreaks: () => number[];
}

export function getMetricPalette(metric: ChoroplethMetric): string[] {
  switch (metric) {
    case 'povertyIndex':
      return ['#ecfdf5', '#bbf7d0', '#86efac', '#4ade80', '#16a34a'];
    case 'literacyRate':
      return ['#eff6ff', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb'];
    case 'urbanPercent':
      return ['#f5f3ff', '#ddd6fe', '#c4b5fd', '#8b5cf6', '#6d28d9'];
    case 'population':
      return ['#fff7ed', '#fed7aa', '#fdba74', '#fb923c', '#ea580c'];
    case 'facilitiesPer100k':
      return ['#eff6ff', '#bfdbfe', '#93c5fd', '#60a5fa', '#1d4ed8'];
    case 'facilities':
    default:
      return ['#eff6ff', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb'];
  }
}

export default function MapControls({
  filters,
  updateFilter,
  onLocateUser,
  onToggleFullscreen,
  isFullscreen,
}: MapControlsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="h-11 w-11 rounded-xl border border-border bg-card/95 text-foreground shadow-lg backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors"
          title="Map settings"
        >
          <Layers3 className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onLocateUser}
          className="h-11 w-11 rounded-xl border border-border bg-card/95 text-foreground shadow-lg backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors"
          title="Locate me"
        >
          <LocateFixed className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          className="h-11 w-11 rounded-xl border border-border bg-card/95 text-foreground shadow-lg backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors"
          title="Fullscreen"
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="w-[290px] rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-md overflow-hidden map-controls-panel">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Map Settings
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
                Map Layers
              </div>

              <div className="space-y-3">
                <ToggleRow
                  label="Choropleth"
                  checked={filters.showChoropleth}
                  onChange={(v) => updateFilter('showChoropleth', v)}
                />
                <ToggleRow
                  label="Facility Markers"
                  checked={filters.showMarkers}
                  onChange={(v) => updateFilter('showMarkers', v)}
                />
                <ToggleRow
                  label="Heatmap"
                  checked={filters.showHeatmap}
                  onChange={(v) => updateFilter('showHeatmap', v)}
                />
                <ToggleRow
                  label="Bubble Overlay"
                  checked={filters.showBubbles}
                  onChange={(v) => updateFilter('showBubbles', v)}
                />
                <ToggleRow
                  label="District Labels"
                  checked={filters.showLabels}
                  onChange={(v) => updateFilter('showLabels', v)}
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
                Choropleth Metric
              </div>

              <div className="space-y-2">
                <RadioRow
                  label="Total Facilities"
                  checked={filters.choroplethMetric === 'facilities'}
                  onChange={() => updateFilter('choroplethMetric', 'facilities')}
                />
                <RadioRow
                  label="Population"
                  checked={filters.choroplethMetric === 'population'}
                  onChange={() => updateFilter('choroplethMetric', 'population')}
                />
                <RadioRow
                  label="Facilities per 100K"
                  checked={filters.choroplethMetric === 'facilitiesPer100k'}
                  onChange={() => updateFilter('choroplethMetric', 'facilitiesPer100k')}
                />
                <RadioRow
                  label="Poverty Index"
                  checked={filters.choroplethMetric === 'povertyIndex'}
                  onChange={() => updateFilter('choroplethMetric', 'povertyIndex')}
                />
                <RadioRow
                  label="Literacy Rate"
                  checked={filters.choroplethMetric === 'literacyRate'}
                  onChange={() => updateFilter('choroplethMetric', 'literacyRate')}
                />
                <RadioRow
                  label="Urban Percent"
                  checked={filters.choroplethMetric === 'urbanPercent'}
                  onChange={() => updateFilter('choroplethMetric', 'urbanPercent')}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-11 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

function RadioRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-primary"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
