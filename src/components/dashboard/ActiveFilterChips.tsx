import type { Filters } from '@/types/dashboard';
import { X, Filter } from 'lucide-react';

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

export default function ActiveFilterChips({
  filters,
  selectedDistrict,
  districtNameLookup,
  updateFilter,
  setSelectedDistrict,
  resetFilters,
}: Props) {
  const chips: Chip[] = [];

  if (selectedDistrict) {
    chips.push({
      id: 'sel',
      label: `Map: ${districtNameLookup[selectedDistrict] || selectedDistrict}`,
      onRemove: () => setSelectedDistrict(null),
    });
  }

  filters.districts.forEach((code) => {
    chips.push({
      id: `d-${code}`,
      label: districtNameLookup[code] || code,
      onRemove: () => updateFilter('districts', filters.districts.filter((c) => c !== code)),
    });
  });

  const arrayFilters: Array<[keyof Filters, string]> = [
    ['facilityTypes', 'Type'],
    ['ownership', 'Ownership'],
    ['origin', 'Origin'],
    ['category', 'Category'],
    ['appointmentRequired', 'Appt'],
    ['cost', 'Cost'],
  ];

  arrayFilters.forEach(([key, prefix]) => {
    const arr = filters[key] as string[];
    arr.forEach((val) => {
      chips.push({
        id: `${String(key)}-${val}`,
        label: `${prefix}: ${val}`,
        onRemove: () => updateFilter(key, arr.filter((v) => v !== val) as any),
      });
    });
  });

  if (filters.searchQuery) {
    chips.push({
      id: 'q',
      label: `"${filters.searchQuery}"`,
      onRemove: () => updateFilter('searchQuery', ''),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-1.5 px-3 py-2 rounded-lg bg-muted/40 border border-border">
      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mr-1">
        Active ({chips.length})
      </span>
      {chips.slice(0, 12).map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={c.onRemove}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-card border border-border text-foreground hover:bg-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="max-w-[140px] truncate">{c.label}</span>
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      ))}
      {chips.length > 12 && (
        <span className="text-[11px] text-muted-foreground">+{chips.length - 12} more</span>
      )}
      <button
        type="button"
        onClick={resetFilters}
        className="ml-auto text-[11px] font-semibold text-primary hover:underline focus:outline-none"
      >
        Clear all
      </button>
    </div>
  );
}
