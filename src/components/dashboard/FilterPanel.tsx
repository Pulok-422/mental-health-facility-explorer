import { useState, useMemo, type ReactNode } from 'react';
import type { Filters, MapDisplay, Facility } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronRight } from 'lucide-react';
import FacilitySearch from './FacilitySearch';

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
  chipsSlot?: ReactNode;
  facilities: Facility[];
  districtNameLookup: Record<string, string>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      {children}
    </div>
  );
}

/** Find the option value that best matches a token (case-insensitive substring). */
function matchOption(options: string[], tokens: string[]): string | null {
  for (const t of tokens) {
    const found = options.find((o) => o.toLowerCase().includes(t.toLowerCase()));
    if (found) return found;
  }
  return null;
}

export default function FilterPanel({
  filters,
  updateFilter,
  resetFilters,
  filterOptions,
  selectedDistrict,
  setSelectedDistrict,
  chipsSlot,
  facilities,
  districtNameLookup,
}: FilterPanelProps) {
  const [districtOpen, setDistrictOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');

  const filteredDistricts = filterOptions.districts.filter((d) =>
    d.name.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const selectedDistrictCount = selectedDistrict ? 1 : filters.districts.length;
  const districtSubtitle =
    selectedDistrictCount === 0
      ? null
      : selectedDistrict
      ? filterOptions.districts.find((d) => d.code === selectedDistrict)?.name || '1 selected'
      : `${selectedDistrictCount} selected`;

  // Map spec ownership chips → real data values
  const ownershipChips = useMemo(
    () =>
      [
        { label: 'Government', match: ['government', 'govt', 'public'] },
        { label: 'Private', match: ['private'] },
        { label: 'NGO', match: ['ngo', 'non-government', 'non government'] },
      ]
        .map((c) => ({ label: c.label, value: matchOption(filterOptions.ownership, c.match) }))
        .filter((c) => c.value),
    [filterOptions.ownership]
  );

  // Facility type select
  const typeSelectValue =
    filters.facilityTypes.length === 1 ? filters.facilityTypes[0] : 'all';

  // ACCESS derived helpers
  const freeOption = useMemo(
    () => matchOption(filterOptions.cost, ['free']),
    [filterOptions.cost]
  );
  const apptYesOption = useMemo(
    () => matchOption(filterOptions.appointmentRequired, ['yes', 'required']),
    [filterOptions.appointmentRequired]
  );
  const apptNoOption = useMemo(
    () => matchOption(filterOptions.appointmentRequired, ['no', 'walk', 'not']),
    [filterOptions.appointmentRequired]
  );

  const freeChecked = !!freeOption && filters.cost.includes(freeOption);
  const apptChecked = !!apptYesOption && filters.appointmentRequired.includes(apptYesOption);
  const walkInChecked = !!apptNoOption && filters.appointmentRequired.includes(apptNoOption);

  const toggleArrayValue = (
    key: 'cost' | 'appointmentRequired' | 'ownership' | 'facilityTypes',
    value: string,
    on: boolean
  ) => {
    const cur = filters[key] as string[];
    const next = on ? [...new Set([...cur, value])] : cur.filter((v) => v !== value);
    updateFilter(key, next as any);
  };



  return (
    <div className="h-full flex flex-col min-h-0 bg-background">
      <div className="flex-1 min-h-0 overflow-y-auto px-3.5 pt-3.5 pb-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-foreground">Filters</span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[12px] text-primary hover:underline focus:outline-none focus-visible:underline"
          >
            Reset all
          </button>
        </div>

        {/* Search input with suggestions */}
        <div className="mb-1">
          <FacilitySearch
            value={filters.searchQuery}
            onChange={(v) => updateFilter('searchQuery', v)}
            facilities={facilities}
            districtNameLookup={districtNameLookup}
            onSelectFacility={(f) => {
              updateFilter('searchQuery', f.facility_name);
              if (f.DIS_CODE) setSelectedDistrict(f.DIS_CODE);
            }}
          />
        </div>

        {/* DISTRICT */}
        <SectionLabel>District</SectionLabel>
        <button
          type="button"
          onClick={() => setDistrictOpen((o) => !o)}
          aria-expanded={districtOpen}
          className="w-full flex items-center justify-between py-2 px-2.5 rounded-[10px] bg-card border border-border hover:bg-muted/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex flex-col items-start min-w-0">
            <span className="text-[12px] font-medium text-foreground">District</span>
            {districtSubtitle && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                {districtSubtitle}
              </span>
            )}
          </div>
          {districtOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
        {districtOpen && (
          <div className="mt-1.5 p-2 rounded-[10px] bg-card border border-border">
            <Input
              placeholder="Filter districts…"
              value={districtSearch}
              onChange={(e) => setDistrictSearch(e.target.value)}
              className="h-7 text-[11px] bg-secondary border-0 mb-1.5"
            />
            <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
              {filteredDistricts.map((d) => (
                <label
                  key={d.code}
                  className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer text-[12px] text-foreground"
                >
                  <Checkbox
                    checked={filters.districts.includes(d.code)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...filters.districts, d.code]
                        : filters.districts.filter((c) => c !== d.code);
                      updateFilter('districts', next);
                      if (!checked && selectedDistrict === d.code) setSelectedDistrict(null);
                    }}
                    className="h-3.5 w-3.5"
                  />
                  <span className="truncate">{d.name}</span>
                </label>
              ))}
              {filteredDistricts.length === 0 && (
                <div className="text-[11px] text-muted-foreground py-2 text-center">
                  No districts found
                </div>
              )}
            </div>
          </div>
        )}

        {/* FACILITY */}
        <SectionLabel>Facility</SectionLabel>

        {/* Ownership chip group */}
        {ownershipChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {ownershipChips.map((chip) => {
              const active = chip.value ? filters.ownership.includes(chip.value) : false;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() =>
                    chip.value && toggleArrayValue('ownership', chip.value, !active)
                  }
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    active
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border text-foreground hover:bg-muted/50'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Type select */}
        <Select
          value={typeSelectValue}
          onValueChange={(v) => {
            if (v === 'all') updateFilter('facilityTypes', []);
            else updateFilter('facilityTypes', [v]);
          }}
        >
          <SelectTrigger className="h-9 text-[12px] bg-card border-border rounded-[10px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[12px]">All types</SelectItem>
            {filterOptions.facilityTypes.map((t) => (
              <SelectItem key={t} value={t} className="text-[12px]">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ACCESS */}
        <SectionLabel>Access</SectionLabel>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/40 cursor-pointer text-[12px] text-foreground">
            <Checkbox
              checked={freeChecked}
              disabled={!freeOption}
              onCheckedChange={(c) => freeOption && toggleArrayValue('cost', freeOption, !!c)}
              className="h-4 w-4"
            />
            <span>Free services only</span>
          </label>
          <label className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/40 cursor-pointer text-[12px] text-foreground">
            <Checkbox
              checked={apptChecked}
              disabled={!apptYesOption}
              onCheckedChange={(c) =>
                apptYesOption && toggleArrayValue('appointmentRequired', apptYesOption, !!c)
              }
              className="h-4 w-4"
            />
            <span>Appointment required</span>
          </label>
          <label className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/40 cursor-pointer text-[12px] text-foreground">
            <Checkbox
              checked={walkInChecked}
              disabled={!apptNoOption}
              onCheckedChange={(c) =>
                apptNoOption && toggleArrayValue('appointmentRequired', apptNoOption, !!c)
              }
              className="h-4 w-4"
            />
            <span>Walk-in available</span>
          </label>
        </div>

      </div>

      {/* Footer */}
      <div className="px-3.5 pt-2 pb-3 border-t border-border space-y-2.5">
        {chipsSlot}
        <div className="text-center">
          <a
            href="https://hasibulahmedpulok.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[11px] font-medium text-foreground hover:text-primary transition-colors"
          >
            Developed by Hasibul Ahmed Pulok
          </a>
        </div>
      </div>
    </div>
  );
}
