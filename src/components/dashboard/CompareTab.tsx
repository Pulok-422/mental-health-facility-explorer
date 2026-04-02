import { useState, useMemo } from 'react';
import type { DistrictPop } from '@/types/dashboard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface Props {
  districts: DistrictPop[];
}

export default function CompareTab({ districts }: Props) {
  const [distA, setDistA] = useState<string>('');
  const [distB, setDistB] = useState<string>('');

  const sorted = useMemo(() => [...districts].filter(d => d.DIS_NAME).sort((a, b) => (a.DIS_NAME || '').localeCompare(b.DIS_NAME || '')), [districts]);

  const national = useMemo(() => {
    if (districts.length === 0) return null;
    const totalPop = districts.reduce((s, d) => s + d.Population, 0);
    const totalFac = districts.reduce((s, d) => s + d.total_facilities, 0);
    return {
      DIS_NAME: 'National Average',
      Population: Math.round(totalPop / districts.length),
      total_facilities: Math.round(totalFac / districts.length),
      facilitiesPer100k: (totalFac / totalPop) * 100000,
      populationPerFacility: totalPop / totalFac,
      "Poverty Index": districts.reduce((s, d) => s + d["Poverty Index"], 0) / districts.length,
      Literacy_rate: districts.reduce((s, d) => s + d.Literacy_rate, 0) / districts.length,
      Urban_percent: districts.reduce((s, d) => s + d.Urban_percent, 0) / districts.length,
      Total_households: Math.round(districts.reduce((s, d) => s + d.Total_households, 0) / districts.length),
    } as DistrictPop;
  }, [districts]);

  const a = districts.find(d => d.DIS_CODE === distA);
  const b = distB === 'national' ? national : districts.find(d => d.DIS_CODE === distB);

  const compData = useMemo(() => {
    if (!a || !b) return [];
    return [
      { metric: 'Population (M)', A: +(a.Population / 1e6).toFixed(2), B: +(b.Population / 1e6).toFixed(2) },
      { metric: 'Facilities', A: a.total_facilities, B: b.total_facilities },
      { metric: 'Per 100K', A: +(a.facilitiesPer100k || 0).toFixed(2), B: +(b.facilitiesPer100k || 0).toFixed(2) },
      { metric: 'Poverty Index', A: a["Poverty Index"], B: b["Poverty Index"] },
      { metric: 'Literacy %', A: a.Literacy_rate, B: b.Literacy_rate },
      { metric: 'Urban %', A: a.Urban_percent, B: b.Urban_percent },
    ];
  }, [a, b]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="dashboard-panel p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Compare Districts</h3>
        <div className="flex flex-wrap gap-3">
          <select
            value={distA}
            onChange={e => setDistA(e.target.value)}
            className="h-9 px-3 text-sm rounded-lg bg-secondary border border-border text-foreground"
          >
            <option value="">Select District A</option>
            {sorted.map(d => <option key={d.DIS_CODE} value={d.DIS_CODE}>{d.DIS_NAME}</option>)}
          </select>
          <span className="self-center text-xs text-muted-foreground font-medium">vs</span>
          <select
            value={distB}
            onChange={e => setDistB(e.target.value)}
            className="h-9 px-3 text-sm rounded-lg bg-secondary border border-border text-foreground"
          >
            <option value="">Select District B</option>
            <option value="national">National Average</option>
            {sorted.map(d => <option key={d.DIS_CODE} value={d.DIS_CODE}>{d.DIS_NAME}</option>)}
          </select>
        </div>
      </div>

      {a && b && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {compData.map((item, i) => (
              <div key={i} className="kpi-card">
                <div className="kpi-label">{item.metric}</div>
                <div className="flex justify-between mt-1">
                  <div>
                    <div className="text-xs text-muted-foreground">{a.DIS_NAME}</div>
                    <div className="text-lg font-bold text-primary">{item.A}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{b.DIS_NAME}</div>
                    <div className="text-lg font-bold text-accent">{item.B}</div>
                  </div>
                </div>
              </div>
            ))}
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
