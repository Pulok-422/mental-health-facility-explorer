import { useState } from 'react';
import type { Filters, MapDisplay, ChoroplethMetric } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, RotateCcw, MapPin, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilterPanelProps {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  mapDisplay: MapDisplay;
  updateMapDisplay: <K extends keyof MapDisplay>(key: K, value: MapDisplay[K]) => void;
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
  title,
  icon,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-2 mb-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors focus:outline-none focus-visible:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          {icon}
          {title}
          {count && count > 0 ? (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {count}
            </span>
          ) : null}
        </span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">{children}</div>}
    </div>
  );
}

function CheckboxFilter({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <>
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer text-xs text-foreground"
        >
          <Checkbox
            checked={selected.includes(opt)}
            onCheckedChange={(checked) => {
              onChange(checked ? [...selected, opt] : selected.filter((s) => s !== opt));
            }}
            className="h-3.5 w-3.5"
          />
          <span className="truncate">{opt}</span>
        </label>
      ))}
    </>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer py-1">
      <span className="text-[12px] text-foreground leading-none">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

const CHOROPLETH_OPTIONS: { value: ChoroplethMetric; label: string }[] = [
  { value: 'facilities', label: 'Total Facilities' },
  { value: 'population', label: 'Population' },
  { value: 'facilitiesPer100k', label: 'Facilities per 100K' },
  { value: 'povertyIndex', label: 'Poverty Index' },
  { value: 'literacyRate', label: 'Literacy Rate' },
  { value: 'urbanPercent', label: 'Urban Percent' },
];

export default function FilterPanel({
  filters,
  updateFilter,
  mapDisplay,
  updateMapDisplay,
  resetFilters,
  filterOptions,
  selectedDistrict,
  setSelectedDistrict,
}: FilterPanelProps) {
  const [districtSearch, setDistrictSearch] = useState('');

  const filteredDistricts = filterOptions.districts.filter((d) =>
    d.name.toLowerCase().includes(districtSearch.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col min-h-0 bg-background">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Data Filters
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 text-xs text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>

        <div className="border-b border-border pb-2 mb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search facility name..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="h-8 pl-8 text-xs bg-secondary border-0"
              aria-label="Search facility name"
            />
          </div>
        </div>

        {selectedDistrict && (
          <div className="border-b border-border pb-2 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Selected District</span>
              <button
                type="button"
                onClick={() => setSelectedDistrict(null)}
                className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {filterOptions.districts.find((d) => d.code === selectedDistrict)?.name} ×
              </button>
            </div>
          </div>
        )}

        <CollapsibleSection
          title="District"
          icon={<MapPin className="h-3 w-3" />}
          count={filters.districts.length}
        >
          <Input
            placeholder="Filter districts..."
            value={districtSearch}
            onChange={(e) => setDistrictSearch(e.target.value)}
            className="h-7 text-xs bg-secondary border-0 mb-1.5"
          />
          {filteredDistricts.map((d) => (
            <label
              key={d.code}
              className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer text-xs text-foreground"
            >
              <Checkbox
                checked={filters.districts.includes(d.code)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...filters.districts, d.code]
                    : filters.districts.filter((c) => c !== d.code);
                  updateFilter('districts', next);
                }}
                className="h-3.5 w-3.5"
              />
              <span className="truncate">{d.name}</span>
            </label>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Facility Type" count={filters.facilityTypes.length}>
          <CheckboxFilter
            options={filterOptions.facilityTypes}
            selected={filters.facilityTypes}
            onChange={(v) => updateFilter('facilityTypes', v)}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Ownership" count={filters.ownership.length}>
          <CheckboxFilter
            options={filterOptions.ownership}
            selected={filters.ownership}
            onChange={(v) => updateFilter('ownership', v)}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Origin" count={filters.origin.length}>
          <CheckboxFilter
            options={filterOptions.origin}
            selected={filters.origin}
            onChange={(v) => updateFilter('origin', v)}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Category" count={filters.category.length}>
          <CheckboxFilter
            options={filterOptions.category}
            selected={filters.category}
            onChange={(v) => updateFilter('category', v)}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Appointment" count={filters.appointmentRequired.length}>
          <CheckboxFilter
            options={filterOptions.appointmentRequired}
            selected={filters.appointmentRequired}
            onChange={(v) => updateFilter('appointmentRequired', v)}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Cost" count={filters.cost.length}>
          <CheckboxFilter
            options={filterOptions.cost}
            selected={filters.cost}
            onChange={(v) => updateFilter('cost', v)}
          />
        </CollapsibleSection>
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="border-t border-border/60 pt-3 text-center">
          <a
            href="https://hasibulahmedpulok.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[10px] text-muted-foreground/75 hover:text-primary transition-colors"
          >
            Developed by Hasibul Ahmed Pulok
          </a>
        </div>
      </div>
    </div>
  );
}
