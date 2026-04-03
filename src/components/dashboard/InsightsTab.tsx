import { useMemo } from 'react';
import type { DistrictPop, Facility } from '@/types/dashboard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';

const COLORS = ['#2196F3', '#26A69A', '#42A5F5', '#1565C0', '#0D47A1', '#00897B', '#4FC3F7', '#0288D1'];

interface InsightsProps {
  districts: DistrictPop[];
  facilities: Facility[];
}

function ChartCard({ title, insight, children }: { title: string; insight?: string; children: React.ReactNode }) {
  return (
    <div className="dashboard-panel p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div style={{ height: 250 }}>{children}</div>
      {insight && <p className="mt-2 text-[11px] text-muted-foreground italic">{insight}</p>}
    </div>
  );
}

function countBy<T>(arr: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  arr.forEach(item => { const k = key(item) || 'Unknown'; map[k] = (map[k] || 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function RankingList({ title, data, unit, color }: { title: string; data: { name: string; value: number }[]; unit: string; color: string }) {
  if (data.length === 0) return null;
  return (
    <div className="dashboard-panel p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: color }}>
                {i + 1}
              </span>
              <span className="text-foreground font-medium">{d.name}</span>
            </span>
            <span className="font-semibold text-muted-foreground">{d.value.toFixed(2)} {unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsTab({ districts, facilities }: InsightsProps) {
  const districtBars = useMemo(() =>
    [...districts].sort((a, b) => b.total_facilities - a.total_facilities).slice(0, 15).map(d => ({
      name: d.DIS_NAME, facilities: d.total_facilities,
      per100k: +(d.facilitiesPer100k || 0).toFixed(2),
    }))
  , [districts]);

  const underserved = useMemo(() =>
    [...districts].filter(d => d.facilitiesPer100k !== undefined)
      .sort((a, b) => (a.facilitiesPer100k || 0) - (b.facilitiesPer100k || 0))
      .slice(0, 10).map(d => ({ name: d.DIS_NAME || 'Unknown', value: +(d.facilitiesPer100k || 0).toFixed(2) }))
  , [districts]);

  const bestServed = useMemo(() =>
    [...districts].filter(d => d.facilitiesPer100k !== undefined)
      .sort((a, b) => (b.facilitiesPer100k || 0) - (a.facilitiesPer100k || 0))
      .slice(0, 10).map(d => ({ name: d.DIS_NAME || 'Unknown', value: +(d.facilitiesPer100k || 0).toFixed(2) }))
  , [districts]);

  const facilityVsNeed = useMemo(() =>
    districts.map(d => ({
      name: d.DIS_NAME,
      population: +(d.Population / 1e6).toFixed(2),
      per100k: +(d.facilitiesPer100k || 0).toFixed(2),
    }))
  , [districts]);

  const scatterData = useMemo(() =>
    districts.map(d => ({
      name: d.DIS_NAME,
      poverty: d['Poverty Index'],
      per100k: +(d.facilitiesPer100k || 0).toFixed(2),
      facilities: d.total_facilities,
    }))
  , [districts]);

  const facilityTypeDist = useMemo(() => countBy(facilities, f => f.facility_type), [facilities]);
  const ownershipDist = useMemo(() => countBy(facilities, f => f.ownership), [facilities]);
  const costDist = useMemo(() => countBy(facilities, f => f.cost), [facilities]);
  const categoryDist = useMemo(() => countBy(facilities, f => f.category_adult_child_both), [facilities]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankingList title="Top 10 Underserved Districts" data={underserved} unit="per 100K" color="#ef4444" />
        <RankingList title="Top 10 Best Served Districts" data={bestServed} unit="per 100K" color="#22c55e" />
      </div>

      {/* Facilities vs Need scatter */}
      <ChartCard
        title="Facilities vs Need (Population vs Coverage)"
        insight="Districts in the bottom-right quadrant have high population but low facility coverage, indicating underserved areas needing priority attention."
      >
        <ResponsiveContainer>
          <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="population" name="Population (M)" tick={{ fontSize: 10 }} label={{ value: 'Population (M)', position: 'bottom', fontSize: 10, offset: -5 }} />
            <YAxis dataKey="per100k" name="Facilities per 100K" tick={{ fontSize: 10 }} label={{ value: 'Facilities per 100K', angle: -90, position: 'insideLeft', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(value: number, name: string) => [value, name]}
              labelFormatter={() => ''}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-card border border-border rounded-lg p-2 shadow-md text-xs">
                    <div className="font-bold text-foreground">{d.name}</div>
                    <div className="text-muted-foreground">Population: {d.population}M</div>
                    <div className="text-muted-foreground">Per 100K: {d.per100k}</div>
                  </div>
                );
              }}
            />
            <Scatter data={facilityVsNeed} fill="#1565C0" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartCard title="Facilities by District (Top 15)" insight="Shows concentration of mental health facilities across districts.">
          <ResponsiveContainer>
            <BarChart data={districtBars} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="facilities" fill="#2196F3" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Facility Type Distribution" insight="Breakdown by type of mental health facility.">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={facilityTypeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                {facilityTypeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ownership Distribution" insight="Government vs private sector involvement in mental health services.">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={ownershipDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                {ownershipDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cost Distribution" insight="Distribution of free vs paid mental health services.">
          <ResponsiveContainer>
            <BarChart data={costDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#26A69A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Category Distribution" insight="Service categorization by patient demographics.">
          <ResponsiveContainer>
            <BarChart data={categoryDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#42A5F5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Poverty Index vs Facilities Per 100K" insight="Higher poverty districts often have fewer facilities per capita.">
          <ResponsiveContainer>
            <ScatterChart margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="poverty" name="Poverty Index" tick={{ fontSize: 10 }} label={{ value: 'Poverty Index', position: 'bottom', fontSize: 10, offset: -5 }} />
              <YAxis dataKey="per100k" name="Per 100K" tick={{ fontSize: 10 }} label={{ value: 'Per 100K', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Scatter data={scatterData} fill="#1565C0" />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
