import type { DistrictPop } from '@/types/dashboard';
import { X } from 'lucide-react';

interface DistrictInfoCardProps {
  district: DistrictPop;
  onClose: () => void;
}

function generateInsight(d: DistrictPop): string {
  const coverage = d.facilitiesPer100k || 0;
  const pop = d.Population;
  const poverty = d['Poverty Index'];

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

export default function DistrictInfoCard({ district, onClose }: DistrictInfoCardProps) {
  const rows = [
    { label: 'Population', value: district.Population.toLocaleString() },
    { label: 'Facilities', value: district.total_facilities },
    { label: 'Per 100K', value: (district.facilitiesPer100k || 0).toFixed(2) },
    { label: 'Pop/Facility', value: district.populationPerFacility ? Math.round(district.populationPerFacility).toLocaleString() : '-' },
    { label: 'Poverty Index', value: district['Poverty Index'] },
    { label: 'Literacy Rate', value: district.Literacy_rate + '%' },
    { label: 'Urban', value: district.Urban_percent + '%' },
    { label: 'Households', value: district.Total_households.toLocaleString() },
  ];

  const insight = generateInsight(district);

  return (
    <div className="absolute bottom-3 left-3 z-[1000] w-64 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm text-foreground">{district.DIS_NAME}</h3>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="space-y-1 mb-2">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-semibold text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-2 mt-2">
        <p className="text-[10px] leading-relaxed text-muted-foreground italic">💡 {insight}</p>
      </div>
    </div>
  );
}
