import type { Filters, DistrictPop, Facility } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Search, RotateCcw, MapPin, Layers, Eye } from 'lucide-react';
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

function MultiSelect({
  label, options, selected, onChange,
}: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="filter-section">
      <div className="filter-label">{label}</div>
      <div className="flex flex-wrap gap-1 mt-1.5 max-h-28 overflow-y-auto">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])}
            className={`px-2 py-0.5 text-xs rounded-full transition-colors border ${
              selected.includes(opt)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-secondary-foreground border-border hover:bg-muted'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FilterPanel({
  filters, updateFilter, resetFilters, filterOptions, selectedDistrict, setSelectedDistrict,
}: FilterPanelProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" /> Filters
        </h2>
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs text-muted-foreground">
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      {/* Search */}
      <div className="filter-section">
        <div className="filter-label">Search Facility</div>
        <div className="relative mt-1.5">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={filters.searchQuery}
            onChange={e => updateFilter('searchQuery', e.target.value)}
            className="h-8 pl-8 text-xs bg-secondary border-0"
          />
        </div>
      </div>

      {/* District */}
      <div className="filter-section">
        <div className="filter-label flex items-center gap-1"><MapPin className="h-3 w-3" /> District</div>
        <div className="flex flex-wrap gap-1 mt-1.5 max-h-32 overflow-y-auto">
          {selectedDistrict && (
            <button
              onClick={() => setSelectedDistrict(null)}
              className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground border border-primary flex items-center gap-1"
            >
              {filterOptions.districts.find(d => d.code === selectedDistrict)?.name} ×
            </button>
          )}
          {!selectedDistrict && filterOptions.districts.map(d => (
            <button
              key={d.code}
              onClick={() => {
                const newDists = filters.districts.includes(d.code)
                  ? filters.districts.filter(c => c !== d.code)
                  : [...filters.districts, d.code];
                updateFilter('districts', newDists);
              }}
              className={`px-2 py-0.5 text-xs rounded-full transition-colors border ${
                filters.districts.includes(d.code)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border hover:bg-muted'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <MultiSelect label="Facility Type" options={filterOptions.facilityTypes} selected={filters.facilityTypes} onChange={v => updateFilter('facilityTypes', v)} />
      <MultiSelect label="Ownership" options={filterOptions.ownership} selected={filters.ownership} onChange={v => updateFilter('ownership', v)} />
      <MultiSelect label="Origin" options={filterOptions.origin} selected={filters.origin} onChange={v => updateFilter('origin', v)} />
      <MultiSelect label="Category" options={filterOptions.category} selected={filters.category} onChange={v => updateFilter('category', v)} />
      <MultiSelect label="Appointment" options={filterOptions.appointmentRequired} selected={filters.appointmentRequired} onChange={v => updateFilter('appointmentRequired', v)} />
      <MultiSelect label="Cost" options={filterOptions.cost} selected={filters.cost} onChange={v => updateFilter('cost', v)} />

      {/* Map Toggles */}
      <div className="filter-section">
        <div className="filter-label flex items-center gap-1"><Eye className="h-3 w-3" /> Map Display</div>
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground">Choropleth</span>
            <Switch checked={filters.showChoropleth} onCheckedChange={v => updateFilter('showChoropleth', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground">Facility Markers</span>
            <Switch checked={filters.showMarkers} onCheckedChange={v => updateFilter('showMarkers', v)} />
          </div>
        </div>
      </div>

      {/* Choropleth metric */}
      {filters.showChoropleth && (
        <div className="filter-section">
          <div className="filter-label">Choropleth Metric</div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {[
              { key: 'facilities', label: 'Facilities' },
              { key: 'population', label: 'Population' },
              { key: 'facilitiesPer100k', label: 'Per 100K' },
              { key: 'povertyIndex', label: 'Poverty' },
              { key: 'literacyRate', label: 'Literacy' },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => updateFilter('choroplethMetric', m.key as any)}
                className={`px-2 py-0.5 text-xs rounded-full transition-colors border ${
                  filters.choroplethMetric === m.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary text-secondary-foreground border-border hover:bg-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
