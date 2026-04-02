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
  const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
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
      list = list.filter(f => f.facility_name.toLowerCase().includes(q) || f.DIS_NAME?.toLowerCase().includes(q));
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = (a as any)[sortKey] ?? '';
        const bv = (b as any)[sortKey] ?? '';
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [facilities, search, sortKey, sortDir]);

  const filteredDistricts = useMemo(() => {
    let list = districts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d => d.DIS_NAME?.toLowerCase().includes(q));
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = (a as any)[sortKey] ?? '';
        const bv = (b as any)[sortKey] ?? '';
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [districts, search, sortKey, sortDir]);

  const currentData = tab === 'facilities' ? filteredFacilities : filteredDistricts;
  const totalPages = Math.ceil(currentData.length / PAGE_SIZE);
  const pageData = currentData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
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
          <button onClick={() => { setTab('facilities'); setPage(0); setSortKey(''); }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'facilities' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
            Facilities ({facilities.length})
          </button>
          <button onClick={() => { setTab('districts'); setPage(0); setSortKey(''); }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'districts' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
            District Summary ({districts.length})
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="h-8 pl-8 text-xs bg-secondary border-0"
          />
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportCSV(currentData as any[], `${tab}.csv`)}>
          <Download className="h-3 w-3 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-2.5 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {col.label} {sortKey === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row: any, i: number) => (
              <tr
                key={i}
                onClick={() => tab === 'facilities' && onFacilityClick?.(row)}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                {cols.map(col => (
                  <td key={col.key} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                    {typeof row[col.key] === 'number'
                      ? row[col.key] > 1000
                        ? row[col.key].toLocaleString()
                        : typeof row[col.key] === 'number' && col.key.includes('Per') || col.key.includes('per')
                          ? row[col.key].toFixed(2)
                          : row[col.key]
                      : row[col.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, currentData.length)} of {currentData.length}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 w-7 p-0">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 w-7 p-0">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
