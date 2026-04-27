import { useState, useMemo } from 'react';
import type { DistrictPop } from '@/types/dashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ArrowUp, ArrowDown, Minus, GitCompare } from 'lucide-react';

interface Props {
  districts: DistrictPop[];
}

export default function CompareTab({ districts }: Props) {
  const [distA, setDistA] = useState<string>('');
  const [distB, setDistB] = useState<string>('');

  const sorted = useMemo(
    () =>
      [...districts]
        .filter((d) => d.DIS_NAME)
        .sort((a, b) => (a.DIS_NAME || '').localeCompare(b.DIS_NAME || '')),
    [districts]
  );

  const national = useMemo(() => {
    if (districts.length === 0) return null;
    const totalPop = districts.reduce((s, d) => s + d.Population, 0);
    const totalFac = districts.reduce((s, d) => s + d.total_facilities, 0);
    return {
      DIS_NAME: 'National Average',
      DIS_CODE: 'national',
      Population: Math.round(totalPop / districts.length),
      total_facilities: Math.round(totalFac / districts.length),
      facilitiesPer100k: totalPop > 0 ? (totalFac / totalPop) * 100000 : 0,
      populationPerFacility: totalFac > 0 ? totalPop / totalFac : 0,
      'Poverty Index':
        districts.reduce((s, d) => s + d['Poverty Index'], 0) / districts.length,
      Literacy_rate: districts.reduce((s, d) => s + d.Literacy_rate, 0) / districts.length,
      Urban_percent: districts.reduce((s, d) => s + d.Urban_percent, 0) / districts.length,
      Total_households: Math.round(
        districts.reduce((s, d) => s + (d.Total_households || 0), 0) / districts.length
      ),
    } as DistrictPop;
  }, [districts]);

  const a = districts.find((d) => d.DIS_CODE === distA);
  const b = distB === 'national' ? national : districts.find((d) => d.DIS_CODE === distB);

  const compData = useMemo(() => {
    if (!a || !b) return [];
    return [
      { metric: 'Population (M)', A: +(a.Population / 1e6).toFixed(2), B: +(b.Population / 1e6).toFixed(2), unit: 'M', higherIsBetter: false },
      { metric: 'Facilities', A: a.total_facilities, B: b.total_facilities, unit: '', higherIsBetter: true },
      { metric: 'Per 100K', A: +(a.facilitiesPer100k || 0).toFixed(2), B: +(b.facilitiesPer100k || 0).toFixed(2), unit: '', higherIsBetter: true },
      { metric: 'Poverty Index', A: +a['Poverty Index'].toFixed(1), B: +b['Poverty Index'].toFixed(1), unit: '', higherIsBetter: false },
      { metric: 'Literacy %', A: +a.Literacy_rate.toFixed(1), B: +b.Literacy_rate.toFixed(1), unit: '%', higherIsBetter: true },
      { metric: 'Urban %', A: +a.Urban_percent.toFixed(1), B: +b.Urban_percent.toFixed(1), unit: '%', higherIsBetter: false },
    ];
  }, [a, b]);

  const getDiff = (valA: number, valB: number) => {
    if (valB === 0) return { pct: 0, direction: 'same' as const };
    const pct = ((valA - valB) / valB) * 100;
    return {
      pct: Math.abs(pct),
      direction: pct > 0 ? ('higher' as const) : pct < 0 ? ('lower' as const) : ('same' as const),
    };
  };

  const getColor = (direction: 'higher' | 'lower' | 'same', higherIsBetter: boolean) => {
    if (direction === 'same') return 'text-muted-foreground';
    if (higherIsBetter) return direction === 'higher' ? 'text-green-600' : 'text-red-500';
    return direction === 'higher' ? 'text-red-500' : 'text-green-600';
  };

  // Fix #20: friendly empty state when nothing is selected
  if (sorted.length === 0) {
    return (
      <div className="dashboard-panel p-10 text-center animate-fade-in">
        <GitCompare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No districts available with current filters. Adjust filters to compare districts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="dashboard-panel p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Compare Districts</h3>
        <div className="flex flex-wrap gap-3">
          <select
            value={distA}
            onChange={(e) => setDistA(e.target.value)}
            aria-label="District A"
            className="h-9 px-3 text-sm rounded-lg bg-secondary border border-border text-foreground"
          >
            <option value="">Select District A</option>
            {sorted.map((d) => (
              <option key={d.DIS_CODE} value={d.DIS_CODE}>
                {d.DIS_NAME}
              </option>
            ))}
          </select>
          <span className="self-center text-xs text-muted-foreground font-medium">vs</span>
          <select
            value={distB}
            onChange={(e) => setDistB(e.target.value)}
            aria-label="District B"
            className="h-9 px-3 text-sm rounded-lg bg-secondary border border-border text-foreground"
          >
            <option value="">Select District B</option>
            <option value="national">National Average</option>
            {sorted.map((d) => (
              <option key={d.DIS_CODE} value={d.DIS_CODE}>
                {d.DIS_NAME}
              </option>
            ))}
          </select>
        </div>
        {(!a || !b) && (
          <p className="mt-3 text-xs text-muted-foreground">
            Select two districts (or one district vs National Average) to see the comparison.
          </p>
        )}
      </div>

      {a && b && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {compData.map((item, i) => {
              const diff = getDiff(item.A, item.B);
              const colorA = getColor(diff.direction, item.higherIsBetter);
              return (
                <div key={i} className="kpi-card">
                  <div className="kpi-label">{item.metric}</div>
                  <div className="flex justify-between mt-1">
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground truncate">{a.DIS_NAME}</div>
                      <div className="text-lg font-bold text-primary">
                        {item.A}
                        {item.unit}
                      </div>
                    </div>
                    <div className="text-right min-w-0">
                      <div className="text-[10px] text-muted-foreground truncate">{b.DIS_NAME}</div>
                      <div className="text-lg font-bold text-accent">
                        {item.B}
                        {item.unit}
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${colorA}`}>
                    {diff.direction === 'higher' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : diff.direction === 'lower' ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    <span>
                      {diff.direction === 'same'
                        ? 'Equal'
                        : `${a.DIS_NAME} is ${diff.pct.toFixed(0)}% ${diff.direction} than ${b.DIS_NAME}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dashboard-panel p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Side-by-Side Comparison</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={compData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="A" name={a.DIS_NAME} fill="#2196F3" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="B" name={b.DIS_NAME} fill="#26A69A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
