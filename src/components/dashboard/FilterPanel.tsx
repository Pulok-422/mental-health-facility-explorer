import { useState } from 'react';
import type { Filters, ChoroplethMetric } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Search, RotateCcw, MapPin, Layers, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilterPanelProps {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  filterOptions: {
    districts: { code: string; name: string }[];
    facilityTypes: string[];
    ownership: string[];
    origin: string[];
    services: string[];
    category: string[];
    appointmentRequired: string[];
    cost: string[];
  };
  selectedDistrict: string | null;
  setSelectedDistrict: (code: string | null) => void;
}

function CollapsibleSection({
  title, icon, children, defaultOpen = false,
}: { title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-2 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">{icon}{title}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">{children}</div>}
    </div>
  );
}

function CheckboxFilter({
  options, selected, onChange,
}: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <>
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer text-xs text-foreground">
          <Checkbox
            checked={selected.includes(opt)}
            onCheckedChange={(checked) => {
              onChange(checked ? [...selected, opt] : selected.filter(s => s !== opt));
            }}
            className="h-3.5 w-3.5"
          />
          <span className="truncate">{opt}</span>
        </label>
      ))}
    </>
  );
}

export default function FilterPanel({
  filters, updateFilter, resetFilters, filterOptions, selectedDistrict, setSelectedDistrict,
}: FilterPanelProps) {
  const [districtSearch, setDistrictSearch] = useState('');

  const filteredDistricts = filterOptions.districts.filter(d =>
    d.name.toLowerCase().includes(districtSearch.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto p-4 space-y-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" /> Data Filters
        </h2>
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs text-muted-foreground">
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      {/* Search */}
      <div className="border-b border-border pb-2 mb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search facility name..."
            value={filters.searchQuery}
            onChange={e => updateFilter('searchQuery', e.target.value)}
            className="h-8 pl-8 text-xs bg-secondary border-0"
          />
        </div>
      </div>

      {/* Selected district badge */}
      {selectedDistrict && (
        <div className="border-b border-border pb-2 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Selected District</span>
            <button
              onClick={() => setSelectedDistrict(null)}
              className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground flex items-center gap-1"
            >
              {filterOptions.districts.find(d => d.code === selectedDistrict)?.name} ×
            </button>
          </div>
        </div>
      )}

      {/* District */}
      <CollapsibleSection title="District" icon={<MapPin className="h-3 w-3" />}>
        <Input
          placeholder="Filter districts..."
          value={districtSearch}
          onChange={e => setDistrictSearch(e.target.value)}
          className="h-7 text-xs bg-secondary border-0 mb-1.5"
        />
        {filteredDistricts.map(d => (
          <label key={d.code} className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer text-xs text-foreground">
            <Checkbox
              checked={filters.districts.includes(d.code)}
              onCheckedChange={(checked) => {
                const newDists = checked
                  ? [...filters.districts, d.code]
                  : filters.districts.filter(c => c !== d.code);
                updateFilter('districts', newDists);
              }}
              className="h-3.5 w-3.5"
            />
            <span className="truncate">{d.name}</span>
          </label>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Facility Type">
        <CheckboxFilter options={filterOptions.facilityTypes} selected={filters.facilityTypes} onChange={v => updateFilter('facilityTypes', v)} />
      </CollapsibleSection>

      <CollapsibleSection title="Ownership">
        <CheckboxFilter options={filterOptions.ownership} selected={filters.ownership} onChange={v => updateFilter('ownership', v)} />
      </CollapsibleSection>

      <CollapsibleSection title="Origin">
        <CheckboxFilter options={filterOptions.origin} selected={filters.origin} onChange={v => updateFilter('origin', v)} />
      </CollapsibleSection>

      <CollapsibleSection title="Category">
        <CheckboxFilter options={filterOptions.category} selected={filters.category} onChange={v => updateFilter('category', v)} />
      </CollapsibleSection>

      <CollapsibleSection title="Appointment">
        <CheckboxFilter options={filterOptions.appointmentRequired} selected={filters.appointmentRequired} onChange={v => updateFilter('appointmentRequired', v)} />
      </CollapsibleSection>

      <CollapsibleSection title="Cost">
        <CheckboxFilter options={filterOptions.cost} selected={filters.cost} onChange={v => updateFilter('cost', v)} />
      </CollapsibleSection>

      {/* Map Display Layers */}
      <CollapsibleSection title="Map Layers" icon={<Eye className="h-3 w-3" />} defaultOpen>
        <ToggleRow label="Choropleth" checked={filters.showChoropleth} onChange={v => updateFilter('showChoropleth', v)} />
        <ToggleRow label="Facility Markers" checked={filters.showMarkers} onChange={v => updateFilter('showMarkers', v)} />
        <ToggleRow label="Heatmap" checked={filters.showHeatmap} onChange={v => updateFilter('showHeatmap', v)} />
        <ToggleRow label="Bubble Overlay" checked={filters.showBubbles} onChange={v => updateFilter('showBubbles', v)} />
        <ToggleRow label="District Labels" checked={filters.showLabels} onChange={v => updateFilter('showLabels', v)} />
      </CollapsibleSection>

      {/* Choropleth Metric */}
      {filters.showChoropleth && (
        <CollapsibleSection title="Choropleth Metric" defaultOpen>
          {CHOROPLETH_OPTIONS.map(m => (
            <label key={m.key} className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer text-xs text-foreground">
              <input
                type="radio"
                name="choro-sidebar"
                checked={filters.choroplethMetric === m.key}
                onChange={() => updateFilter('choroplethMetric', m.key)}
                className="h-3 w-3 accent-primary"
              />
              <span>{m.label}</span>
            </label>
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}

const CHOROPLETH_OPTIONS: { key: ChoroplethMetric; label: string }[] = [
  { key: 'facilities', label: 'Total Facilities' },
  { key: 'population', label: 'Population' },
  { key: 'facilitiesPer100k', label: 'Facilities per 100K' },
  { key: 'povertyIndex', label: 'Poverty Index' },
  { key: 'literacyRate', label: 'Literacy Rate' },
  { key: 'urbanPercent', label: 'Urban Percent' },
];

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-0.5 px-1">
      <span className="text-xs text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
    </div>
  );
}
