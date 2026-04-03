import { useMemo } from 'react';
import type { DistrictPop } from '@/types/dashboard';
import { AlertTriangle } from 'lucide-react';

interface Props {
  districts: DistrictPop[];
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

export default function PriorityDistricts({ districts }: Props) {
  const priorityList = useMemo(() => {
    if (districts.length === 0) return [];

    const pops = districts.map(d => d.Population);
    const povs = districts.map(d => d['Poverty Index']);
    const covs = districts.map(d => d.facilitiesPer100k || 0);

    const popMin = Math.min(...pops), popMax = Math.max(...pops);
    const povMin = Math.min(...povs), povMax = Math.max(...povs);
    const covMin = Math.min(...covs), covMax = Math.max(...covs);

    return districts
      .map(d => {
        const popScore = normalize(d.Population, popMin, popMax);
        const povScore = normalize(d['Poverty Index'], povMin, povMax);
        const covScore = 1 - normalize(d.facilitiesPer100k || 0, covMin, covMax);
        const score = (popScore * 0.3 + povScore * 0.35 + covScore * 0.35);
        return { district: d, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [districts]);

  if (priorityList.length === 0) return null;

  const getLabel = (score: number) => {
    if (score >= 0.65) return { text: 'High Priority', color: 'bg-red-500', dot: '🔴' };
    if (score >= 0.4) return { text: 'Medium', color: 'bg-yellow-500', dot: '🟡' };
    return { text: 'Low', color: 'bg-green-500', dot: '🟢' };
  };

  return (
    <div className="dashboard-panel p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <h3 className="text-sm font-bold text-foreground">Priority Districts for Intervention</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {priorityList.map(({ district: d, score }, i) => {
          const label = getLabel(score);
          return (
            <div key={d.DIS_CODE} className="kpi-card relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-foreground">#{i + 1} {d.DIS_NAME}</span>
                <span className="text-[10px]">{label.dot}</span>
              </div>
              <div className="text-lg font-bold text-primary">{(score * 100).toFixed(0)}</div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label.text}</div>
              <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Pop</span>
                  <span className="font-semibold text-foreground">{(d.Population / 1e6).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between">
                  <span>Poverty</span>
                  <span className="font-semibold text-foreground">{d['Poverty Index']}</span>
                </div>
                <div className="flex justify-between">
                  <span>Per 100K</span>
                  <span className="font-semibold text-foreground">{(d.facilitiesPer100k || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
