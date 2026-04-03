import { useMemo } from 'react';
import type { DistrictPop, Facility } from '@/types/dashboard';
import { Activity, Users, MapPin, TrendingDown, BookOpen, Building2, Heart, Shield } from 'lucide-react';

interface KPICardsProps {
  districts: DistrictPop[];
  facilities: Facility[];
}

export default function KPICards({ districts, facilities }: KPICardsProps) {
  const kpis = useMemo(() => {
    const totalFacilities = facilities.length;
    const districtsCovered = new Set(facilities.map(f => f.DIS_CODE)).size;
    const totalPop = districts.reduce((s, d) => s + d.Population, 0);
    const avgPoverty = districts.length > 0 ? districts.reduce((s, d) => s + d['Poverty Index'], 0) / districts.length : 0;
    const avgLiteracy = districts.length > 0 ? districts.reduce((s, d) => s + d.Literacy_rate, 0) / districts.length : 0;
    const avgUrban = districts.length > 0 ? districts.reduce((s, d) => s + d.Urban_percent, 0) / districts.length : 0;
    const facPer100k = totalPop > 0 ? (totalFacilities / totalPop) * 100000 : 0;
    const freeFac = facilities.filter(f => f.cost?.toLowerCase() === 'free').length;

    return [
      { label: 'Total Facilities', value: totalFacilities.toLocaleString(), icon: Activity, color: 'text-primary' },
      { label: 'Districts Covered', value: districtsCovered, icon: MapPin, color: 'text-accent' },
      { label: 'Total Population', value: (totalPop / 1000000).toFixed(1) + 'M', icon: Users, color: 'text-primary' },
      { label: 'Avg Poverty Index', value: avgPoverty.toFixed(1), icon: TrendingDown, color: 'text-destructive' },
      { label: 'Avg Literacy Rate', value: avgLiteracy.toFixed(1) + '%', icon: BookOpen, color: 'text-accent' },
      { label: 'Facilities per 100K Population', value: facPer100k.toFixed(2), icon: Heart, color: 'text-accent' },
      { label: 'Facilities with Free Service', value: freeFac, icon: Shield, color: 'text-primary' },
    ];
  }, [districts, facilities]);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
