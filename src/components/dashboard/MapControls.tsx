import { useState } from 'react';
import type { Filters, ChoroplethMetric, BubbleMetric } from '@/types/dashboard';
import { Switch } from '@/components/ui/switch';
import {
  Settings2, ChevronDown, ChevronUp, Crosshair,
  Maximize2, RotateCcw, Layers, MapPin,
} from 'lucide-react';

interface MapControlsProps {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  basemap: 'light' | 'street' | 'satellite';
  setBasemap: (v: 'light' | 'street' | 'satellite') => void;
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

const METRIC_OPTIONS: { key: ChoroplethMetric; label: string }[] = [
  { key: 'facilities', label: 'Total Facilities' },
  { key: 'population', label: 'Population' },
  { key: 'facilitiesPer100k', label: 'Facilities per 100K' },
  { key: 'povertyIndex', label: 'Poverty Index' },
  { key: 'literacyRate', label: 'Literacy Rate' },
  { key: 'urbanPercent', label: 'Urban Percent' },
];

const BUBBLE_OPTIONS: { key: BubbleMetric; label: string }[] = [
  { key: 'facilities', label: 'Total Facilities' },
  { key: 'population', label: 'Population' },
  { key: 'facilitiesPer100k', label: 'Per 100K' },
];

const PALETTES: Record<string, string[]> = {
  facilities: ['#deebf7', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
  population: ['#deebf7', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
  facilitiesPer100k: ['#deebf7', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
  populationPerFacility: ['#fff7bc', '#fee391', '#fec44f', '#fe9929', '#d95f0e'],
  povertyIndex: ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f'],
  literacyRate: ['#deebf7', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
  urbanPercent: ['#deebf7', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
};

export function getMetricPalette(metric: ChoroplethMetric): string[] {
  return PALETTES[metric] || PALETTES.facilities;
}

export default function MapControls({
  filters, updateFilter, basemap, setBasemap,
  onResetView, onFitBangladesh, onFitSelected, onLocateUser,
  onToggleFullscreen, isFullscreen, hasSelection,
  metricRange, getQuantileBreaks,
}: MapControlsProps) {
  const [open, setOpen] = useState(true);
  const palette = getMetricPalette(filters.choroplethMetric);
  const breaks = getQuantileBreaks();

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 items-end">
      {/* Quick action buttons row */}
      <div className="flex gap-1">
        <ActionBtn title="My Location" onClick={onLocateUser}><Crosshair className="h-3.5 w-3.5" /></ActionBtn>
        <ActionBtn title="Fit Bangladesh" onClick={onFitBangladesh}><MapPin className="h-3.5 w-3.5" /></ActionBtn>
        {hasSelection && (
          <ActionBtn title="Fit Selected" onClick={onFitSelected}><RotateCcw className="h-3.5 w-3.5" /></ActionBtn>
        )}
        <ActionBtn title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} onClick={onToggleFullscreen}>
          <Maximize2 className="h-3.5 w-3.5" />
        </ActionBtn>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-card/90 backdrop-blur-sm border border-border shadow-md hover:bg-card transition-colors text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Settings panel */}
      {open && (
        <div className="w-56 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-3 space-y-3 text-xs max-h-[70vh] overflow-y-auto">
          {/* Layers */}
          <Section title="Layers" icon={<Layers className="h-3 w-3" />}>
            <ToggleRow label="Choropleth" checked={filters.showChoropleth} onChange={v => updateFilter('showChoropleth', v)} />
            <ToggleRow label="Facility Markers" checked={filters.showMarkers} onChange={v => updateFilter('showMarkers', v)} />
            <ToggleRow label="Heatmap" checked={filters.showHeatmap} onChange={v => updateFilter('showHeatmap', v)} />
            <ToggleRow label="Bubble Overlay" checked={filters.showBubbles} onChange={v => updateFilter('showBubbles', v)} />
            <ToggleRow label="District Labels" checked={filters.showLabels} onChange={v => updateFilter('showLabels', v)} />
          </Section>

          {/* Choropleth metric */}
          {filters.showChoropleth && (
            <Section title="Choropleth Metric">
              {METRIC_OPTIONS.map(m => (
                <label key={m.key} className="flex items-center gap-2 py-0.5 cursor-pointer text-foreground">
                  <input
                    type="radio"
                    name="choro"
                    checked={filters.choroplethMetric === m.key}
                    onChange={() => updateFilter('choroplethMetric', m.key)}
                    className="h-3 w-3 accent-[hsl(210,80%,50%)]"
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </Section>
          )}

          {/* Bubble metric */}
          {filters.showBubbles && (
            <Section title="Bubble Metric">
              {BUBBLE_OPTIONS.map(m => (
                <label key={m.key} className="flex items-center gap-2 py-0.5 cursor-pointer text-foreground">
                  <input
                    type="radio"
                    name="bubble"
                    checked={filters.bubbleMetric === m.key}
                    onChange={() => updateFilter('bubbleMetric', m.key)}
                    className="h-3 w-3 accent-[hsl(210,80%,50%)]"
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </Section>
          )}

          {/* Basemap */}
          <Section title="Basemap">
            <div className="flex gap-1">
              {(['light', 'street', 'satellite'] as const).map(b => (
                <button
                  key={b}
                  onClick={() => setBasemap(b)}
                  className={`flex-1 px-2 py-1 rounded-md font-medium transition-colors ${
                    basemap === b ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {b.charAt(0).toUpperCase() + b.slice(1)}
                </button>
              ))}
            </div>
          </Section>

          {/* Legend */}
          {filters.showChoropleth && (
            <Section title="Legend">
              <div className="space-y-1">
                <div className="flex h-3 rounded overflow-hidden">
                  {palette.map((c, i) => (
                    <div key={i} className="flex-1" style={{ background: c }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Low ({metricRange.min.toLocaleString()})</span>
                  <span>High ({metricRange.max.toLocaleString()})</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Breaks: {breaks.map(b => b.toLocaleString()).join(' · ')}
                </div>
              </div>
            </Section>
          )}

          {/* Reset */}
          <button
            onClick={onResetView}
            className="w-full py-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-muted transition-colors font-medium"
          >
            Reset Map View
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
        {icon}{title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
    </div>
  );
}

function ActionBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-2 rounded-lg bg-card/90 backdrop-blur-sm border border-border shadow-md hover:bg-card transition-colors text-foreground"
    >
      {children}
    </button>
  );
}
