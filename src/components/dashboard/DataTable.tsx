import { useState, useMemo } from 'react';
import type { DistrictPop, Facility } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps {
  districts: DistrictPop[];
  facilities: Facility[];
  onFacilityClick?: (f: Facility) => void;
}

const PAGE_SIZE = 15;

function exportCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  const csv = [
    keys.join(','),
    ...data.map((row) =>
      keys.map((k) => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatCell(value: any, key: string): string {
  if (value == null || value === '') return '-';
  if (typeof value !== 'number') return String(value);
  if (!Number.isFinite(value)) return '-';

  const isPerCapita =
    key === 'facilitiesPer100k' ||
    key === 'populationPerFacility' ||
    key === 'householdsPerFacility' ||
    key.toLowerCase().includes('per100k') ||
    key.toLowerCase().includes('perfacility');

  if (isPerCapita) return value.toFixed(2);
  if (value >= 1000) return value.toLocaleString();
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function DataTable({ districts, facilities, onFacilityClick }: DataTableProps) {
  const [tab, setTab] = useState<'facilities' | 'districts'>('facilities');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filteredFacilities = useMemo(() => {
    let list = facilities;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.facility_name.toLowerCase().includes(q) ||
          f.DIS_NAME?.toLowerCase().includes(q)
      );
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = (a as any)[sortKey] ?? '';
        const bv = (b as any)[sortKey] ?? '';
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [facilities, search, sortKey, sortDir]);

  const filteredDistricts = useMemo(() => {
    let list = districts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.DIS_NAME?.toLowerCase().includes(q));
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = (a as any)[sortKey] ?? '';
        const bv = (b as any)[sortKey] ?? '';
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [districts, search, sortKey, sortDir]);

  const currentData = tab === 'facilities' ? filteredFacilities : filteredDistricts;
  const totalPages = Math.max(1, Math.ceil(currentData.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = currentData.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const facCols = [
    { key: 'facility_name', label: 'Name' },
    { key: 'DIS_NAME', label: 'District' },
    { key: 'facility_type', label: 'Type' },
    { key: 'services_provided', label: 'Services' },
    { key: 'ownership', label: 'Ownership' },
    { key: 'cost', label: 'Cost' },
    { key: 'appointment_required', label: 'Appt.' },
    { key: 'category_adult_child_both', label: 'Category' },
  ];

  const distCols = [
    { key: 'DIS_NAME', label: 'District' },
    { key: 'Population', label: 'Population' },
    { key: 'total_facilities', label: 'Facilities' },
    { key: 'Poverty Index', label: 'Poverty' },
    { key: 'Literacy_rate', label: 'Literacy %' },
    { key: 'Urban_percent', label: 'Urban %' },
    { key: 'Total_households', label: 'Households' },
    { key: 'facilitiesPer100k', label: 'Per 100K' },
    { key: 'populationPerFacility', label: 'Pop/Facility' },
  ];

  const cols = tab === 'facilities' ? facCols : distCols;

  return (
    <div className="dashboard-panel animate-fade-in">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => {
              setTab('facilities');
              setPage(0);
              setSortKey('');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab === 'facilities' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Facilities ({facilities.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('districts');
              setPage(0);
              setSortKey('');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab === 'districts' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            District Summary ({districts.length})
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="h-8 pl-8 text-xs bg-secondary border-0"
            aria-label="Search table"
          />
        </div>
        {tab === 'facilities' ? (
          <Button variant="outline" size="sm" className="h-8 text-xs"
            disabled={filteredFacilities.length === 0}
            onClick={() => exportCSV(filteredFacilities as any[], 'facilities.csv')}
            aria-label="Export Facilities CSV">
            <Download className="h-3 w-3 mr-1" /> Export Facilities CSV
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-8 text-xs"
            disabled={filteredDistricts.length === 0}
            onClick={() => exportCSV(filteredDistricts as any[], 'districts.csv')}
            aria-label="Export Districts CSV">
            <Download className="h-3 w-3 mr-1" /> Export Districts CSV
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              {cols.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  onClick={() => handleSort(col.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort(col.key);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-sort={
                    sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className="px-3 py-2.5 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap focus:outline-none focus-visible:text-foreground"
                >
                  {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td colSpan={cols.length} className="px-3 py-10 text-center text-muted-foreground">
                  No results match the current filters.
                </td>
              </tr>
            )}
            {pageData.map((row: any, i: number) => (
              <tr
                key={i}
                onClick={() => tab === 'facilities' && onFacilityClick?.(row)}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                {cols.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate"
                    title={String(row[col.key] ?? '')}
                  >
                    {formatCell(row[col.key], col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {currentData.length === 0
            ? '0 results'
            : `Showing ${safePage * PAGE_SIZE + 1}–${Math.min(
                (safePage + 1) * PAGE_SIZE,
                currentData.length
              )} of ${currentData.length}`}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage === 0}
            onClick={() => setPage((p) => p - 1)}
            className="h-7 w-7 p-0"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="h-7 w-7 p-0"
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
