import type { DistrictPop } from '@/types/dashboard';
import { X } from 'lucide-react';

interface DistrictInfoCardProps {
  district: DistrictPop;
  onClose: () => void;
}

export default function DistrictInfoCard({ district, onClose }: DistrictInfoCardProps) {
  const rows = [
    { label: 'Population', value: district.Population.toLocaleString() },
    { label: 'Facilities', value: district.total_facilities },
    { label: 'Per 100K', value: (district.facilitiesPer100k || 0).toFixed(2) },
    { label: 'Pop/Facility', value: (district.populationPerFacility || 0).toLocaleString() },
    { label: 'Poverty Index', value: district["Poverty Index"] },
    { label: 'Literacy Rate', value: district.Literacy_rate + '%' },
    { label: 'Urban', value: district.Urban_percent + '%' },
    { label: 'Households', value: district.Total_households.toLocaleString() },
  ];

  return (
    <div className="absolute bottom-3 left-3 z-[1000] w-56 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm text-foreground">{district.DIS_NAME}</h3>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="space-y-1">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-semibold text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
