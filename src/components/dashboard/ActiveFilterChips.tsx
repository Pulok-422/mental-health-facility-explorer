import type { Filters } from '@/types/dashboard';
import { X, Filter } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  filters: Filters;
  selectedDistrict: string | null;
  districtNameLookup: Record<string, string>;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  setSelectedDistrict: (code: string | null) => void;
  resetFilters: () => void;
  resultCount?: number;
}

interface Chip {
  id: string;
  label: string;
  onRemove: () => void;
}

type ArrayFilterKey =
  | 'facilityTypes'
  | 'ownership'
  | 'origin'
  | 'category'
  | 'appointmentRequired'
  | 'cost';

const FILTER_LABELS: Array<[ArrayFilterKey, string]> = [
  ['facilityTypes', 'Type'],
  ['ownership', 'Ownership'],
  ['origin', 'Origin'],
  ['category', 'Category'],
  ['appointmentRequired', 'Appointment'],
  ['cost', 'Cost'],
];

export default function ActiveFilterChips({
  filters,
  selectedDistrict,
  districtNameLookup,
  updateFilter,
  setSelectedDistrict,
  resetFilters,
  resultCount,
}: Props) {
  const chips = useMemo<Chip[]>((() => {
    const items: Chip[] = [];

    if (selectedDistrict) {
      items.push({
        id: 'selected-district',
        label: `Map: ${districtNameLookup[selectedDistrict] || selectedDistrict}`,
        onRemove: () => setSelectedDistrict(null),
      });
    }

    filters.districts.forEach((code) => {
      items.push({
        id: `district-${code}`,
        label: districtNameLookup[code] || code,
        onRemove: () =>
          updateFilter(
            'districts',
            filters.districts.filter((c) => c !== code)
          ),
      });
    });

    FILTER_LABELS.forEach(([key, prefix]) => {
      const values = filters[key] as string[];

      values.forEach((value) => {
        items.push({
          id: `${key}-${value}`,
          label: `${prefix}: ${value}`,
          onRemove: () =>
            updateFilter(
              key,
              values.filter((v) => v !== value) as Filters[typeof key]
            ),
        });
      });
    });

    if (filters.searchQuery) {
      items.push({
        id: 'search-query',
        label: `Search: ${filters.searchQuery}`,
        onRemove: () => updateFilter('searchQuery', ''),
      });
    }

    return items;
  }, [
    filters,
    selectedDistrict,
    districtNameLookup,
    updateFilter,
    setSelectedDistrict,
  ]);

  if (chips.length === 0 && resultCount === undefined) return null;

  return (
    <div className="rounded-xl border border-border bg-card/70 px-3 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Filter className="h-3.5 w-3.5 text-primary" />
          </span>

          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground">
              Active Filters
            </div>

            <div className="text-[11px] text-muted-foreground">
              {chips.length > 0
                ? `${chips.length} filter${chips.length > 1 ? 's' : ''} applied`
                : 'No filters applied'}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {resultCount !== undefined && (
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
              {resultCount.toLocaleString()} results
            </span>
          )}

          {chips.length > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-3 max-h-[116px] overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                title={`Remove ${chip.label}`}
                aria-label={`Remove filter ${chip.label}`}
                onClick={chip.onRemove}
                className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="max-w-[155px] truncate">{chip.label}</span>

                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <X className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
