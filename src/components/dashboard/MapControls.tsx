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
          className="h-10 w-10 rounded-xl border border-border bg-card/95 text-foreground shadow-lg backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors"
          title="Map settings"
        >
          <Layers3 className="h-4.5 w-4.5" />
        </button>

        <button
          type="button"
          onClick={onLocateUser}
          className="h-10 w-10 rounded-xl border border-border bg-card/95 text-foreground shadow-lg backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors"
          title="Locate me"
        >
          <LocateFixed className="h-4.5 w-4.5" />
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          className="h-10 w-10 rounded-xl border border-border bg-card/95 text-foreground shadow-lg backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors"
          title="Fullscreen"
        >
          {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Expand className="h-4.5 w-4.5" />}
        </button>
      </div>

      {open && (
        <div className="w-[248px] rounded-xl border border-border bg-card/95 shadow-xl backdrop-blur-md overflow-hidden map-controls-panel">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
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

          <div className="p-3 space-y-3">
            <div>
              <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                Map Layers
              </div>

              <div className="space-y-2">
                <CompactToggle
                  label="Choropleth"
                  checked={filters.showChoropleth}
                  onChange={(v) => updateFilter('showChoropleth', v)}
                />
                <CompactToggle
                  label="Facility Markers"
                  checked={filters.showMarkers}
                  onChange={(v) => updateFilter('showMarkers', v)}
                />
                <CompactToggle
                  label="Heatmap"
                  checked={filters.showHeatmap}
                  onChange={(v) => updateFilter('showHeatmap', v)}
                />
                <CompactToggle
                  label="Bubble Overlay"
                  checked={filters.showBubbles}
                  onChange={(v) => updateFilter('showBubbles', v)}
                />
                <CompactToggle
                  label="District Labels"
                  checked={filters.showLabels}
                  onChange={(v) => updateFilter('showLabels', v)}
                />
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                Choropleth Metric
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                <CompactRadioRow
                  label="Total Facilities"
                  checked={filters.choroplethMetric === 'facilities'}
                  onChange={() => updateFilter('choroplethMetric', 'facilities')}
                />
                <CompactRadioRow
                  label="Population"
                  checked={filters.choroplethMetric === 'population'}
                  onChange={() => updateFilter('choroplethMetric', 'population')}
                />
                <CompactRadioRow
                  label="Facilities per 100K"
                  checked={filters.choroplethMetric === 'facilitiesPer100k'}
                  onChange={() => updateFilter('choroplethMetric', 'facilitiesPer100k')}
                />
                <CompactRadioRow
                  label="Poverty Index"
                  checked={filters.choroplethMetric === 'povertyIndex'}
                  onChange={() => updateFilter('choroplethMetric', 'povertyIndex')}
                />
                <CompactRadioRow
                  label="Literacy Rate"
                  checked={filters.choroplethMetric === 'literacyRate'}
                  onChange={() => updateFilter('choroplethMetric', 'literacyRate')}
                />
                <CompactRadioRow
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

function CompactToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer">
      <span className="text-[13px] text-foreground leading-none">{label}</span>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

function CompactRadioRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer min-w-0">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="mt-[2px] h-3.5 w-3.5 accent-primary shrink-0"
      />
      <span className="text-[12px] text-foreground leading-[1.15] break-words">
        {label}
      </span>
    </label>
  );
}
