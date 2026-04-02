import { useMemo } from 'react';
import type { DistrictPop } from '@/types/dashboard';
import { TrendingUp, TrendingDown, Users, Building2, BookOpen, MapPin } from 'lucide-react';

interface Props {
  districts: DistrictPop[];
}

export default function DistrictSummaryCards({ districts }: Props) {
  const summaries = useMemo(() => {
    if (districts.length === 0) return [];
    const sorted = (key: keyof DistrictPop, desc = true) => {
      return [...districts].sort((a, b) => {
        const av = Number(a[key]) || 0;
        const bv = Number(b[key]) || 0;
        return desc ? bv - av : av - bv;
      })[0];
    };

    const highPop = sorted('Population');
    const highPoverty = sorted('Poverty Index');
    const lowCoverage = [...districts].sort((a, b) => (a.facilitiesPer100k || 0) - (b.facilitiesPer100k || 0))[0];
    const bestServed = [...districts].sort((a, b) => (b.facilitiesPer100k || 0) - (a.facilitiesPer100k || 0))[0];
    const mostUrban = sorted('Urban_percent');
    const lowLiteracy = sorted('Literacy_rate', false);

    return [
      { label: 'Highest Population', district: highPop?.DIS_NAME, value: `${(highPop?.Population / 1000000).toFixed(1)}M`, icon: Users, color: 'text-primary' },
      { label: 'Highest Poverty', district: highPoverty?.DIS_NAME, value: highPoverty?.["Poverty Index"], icon: TrendingUp, color: 'text-destructive' },
      { label: 'Lowest Coverage', district: lowCoverage?.DIS_NAME, value: `${(lowCoverage?.facilitiesPer100k || 0).toFixed(2)}/100K`, icon: TrendingDown, color: 'text-destructive' },
      { label: 'Best Served', district: bestServed?.DIS_NAME, value: `${(bestServed?.facilitiesPer100k || 0).toFixed(2)}/100K`, icon: MapPin, color: 'text-accent' },
      { label: 'Most Urbanized', district: mostUrban?.DIS_NAME, value: `${mostUrban?.Urban_percent}%`, icon: Building2, color: 'text-primary' },
      { label: 'Lowest Literacy', district: lowLiteracy?.DIS_NAME, value: `${lowLiteracy?.Literacy_rate}%`, icon: BookOpen, color: 'text-destructive' },
    ];
  }, [districts]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {summaries.map((s, i) => (
        <div key={i} className="kpi-card animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex items-center gap-1.5 mb-1">
            <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
          </div>
          <div className="text-sm font-bold text-foreground">{s.district}</div>
          <div className="text-xs text-primary font-semibold">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
