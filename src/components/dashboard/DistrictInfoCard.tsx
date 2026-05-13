import type { DistrictPop, Facility } from '@/types/dashboard';
import { X } from 'lucide-react';
import { avgCompleteness, completenessClasses, COMPLETENESS_TOTAL } from '@/lib/dataCompleteness';

interface DistrictInfoCardProps {
  district: DistrictPop;
  facilities?: Facility[];
  onClose: () => void;
}

function generateInsight(d: DistrictPop): string {
  const coverage = d.facilitiesPer100k || 0;
  const pop = d.Population || 0;
  const poverty = d['Poverty Index'] || 0;

  if (coverage < 0.1 && pop > 2000000) {
    return `${d.DIS_NAME} has very low facility coverage (${coverage.toFixed(2)}/100K) despite a large population of ${(pop / 1e6).toFixed(1)}M, indicating a critically underserved area.`;
  }
  if (coverage < 0.2 && poverty > 30) {
    return `${d.DIS_NAME} has low coverage (${coverage.toFixed(2)}/100K) combined with high poverty (${poverty.toFixed(1)}), suggesting compounded vulnerability.`;
  }
  if (coverage > 1) {
    return `${d.DIS_NAME} has relatively good coverage (${coverage.toFixed(2)}/100K) and may serve as a model for neighboring districts.`;
  }
  if (poverty > 30) {
    return `${d.DIS_NAME} has elevated poverty (${poverty.toFixed(1)}) which may limit access to existing facilities.`;
  }
  return `${d.DIS_NAME} has ${d.total_facilities} facilities serving ${(pop / 1e6).toFixed(1)}M people (${coverage.toFixed(2)} per 100K).`;
}

const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export default function DistrictInfoCard({ district, facilities = [], onClose }: DistrictInfoCardProps) {
  const { avg, n } = avgCompleteness(facilities);
  const avgRounded = Math.round(avg);
  const completenessClass = completenessClasses(avgRounded);
  const rows = [
    { label: 'Population', value: num(district.Population).toLocaleString() },
    { label: 'Facilities', value: num(district.total_facilities) },
    { label: 'Per 100K', value: num(district.facilitiesPer100k).toFixed(2) },
    {
      label: 'Pop/Facility',
      value: district.populationPerFacility
        ? Math.round(district.populationPerFacility).toLocaleString()
        : '—',
    },
    { label: 'Poverty Index', value: num(district['Poverty Index']) },
    { label: 'Literacy Rate', value: `${num(district.Literacy_rate)}%` },
    { label: 'Urban', value: `${num(district.Urban_percent)}%` },
    {
      label: 'Households',
      value: district.Total_households != null ? num(district.Total_households).toLocaleString() : '—',
    },
  ];

  const insight = generateInsight(district);

  return (
    <div className="absolute bottom-3 left-3 z-[1000] w-64 max-w-[calc(100%-1.5rem)] bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm text-foreground truncate pr-2">{district.DIS_NAME}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close district info"
          className="p-0.5 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="space-y-1 mb-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-semibold text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-2 mt-2">
        <p className="text-[10px] leading-relaxed text-muted-foreground italic">💡 {insight}</p>
      </div>
      {n > 0 && (
        <div className="mt-2">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${completenessClass}`}>
            Avg. data completeness: {avg.toFixed(1)}/{COMPLETENESS_TOTAL} fields across {n} facilities
          </span>
        </div>
      )}
    </div>
  );
}
