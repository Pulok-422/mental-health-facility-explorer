import { useMemo, useState } from 'react';
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dashboard-panel p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div style={{ height: 250 }}>{children}</div>
    </div>
  );
}

function countBy<T>(arr: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  arr.forEach(item => { const k = key(item) || 'Unknown'; map[k] = (map[k] || 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export default function InsightsTab({ districts, facilities }: InsightsProps) {
  const districtBars = useMemo(() =>
    [...districts].sort((a, b) => b.total_facilities - a.total_facilities).slice(0, 15).map(d => ({
      name: d.DIS_NAME, facilities: d.total_facilities,
      pop: +(d.Population / 1000000).toFixed(2),
      per100k: +(d.facilitiesPer100k || 0).toFixed(2),
      poverty: d["Poverty Index"],
      literacy: d.Literacy_rate,
      urban: d.Urban_percent,
    }))
  , [districts]);

  const underserved = useMemo(() =>
    [...districts].filter(d => d.facilitiesPer100k !== undefined)
      .sort((a, b) => (a.facilitiesPer100k || 0) - (b.facilitiesPer100k || 0))
      .slice(0, 10).map(d => ({ name: d.DIS_NAME, value: +(d.facilitiesPer100k || 0).toFixed(2) }))
  , [districts]);

  const scatterData = useMemo(() =>
    districts.map(d => ({
      name: d.DIS_NAME,
      poverty: d["Poverty Index"],
      literacy: d.Literacy_rate,
      urban: d.Urban_percent,
      per100k: +(d.facilitiesPer100k || 0).toFixed(2),
      facilities: d.total_facilities,
    }))
  , [districts]);

  const facilityTypeDist = useMemo(() => countBy(facilities, f => f.facility_type), [facilities]);
  const ownershipDist = useMemo(() => countBy(facilities, f => f.ownership), [facilities]);
  const costDist = useMemo(() => countBy(facilities, f => f.cost), [facilities]);
  const categoryDist = useMemo(() => countBy(facilities, f => f.category_adult_child_both), [facilities]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
      <ChartCard title="Facilities by District (Top 15)">
        <ResponsiveContainer>
          <BarChart data={districtBars} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="facilities" fill="#2196F3" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top 10 Underserved Districts (Per 100K)">
        <ResponsiveContainer>
          <BarChart data={underserved} layout="vertical" margin={{ left: 80, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={75} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="#ef5350" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Facility Type Distribution">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={facilityTypeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
              {facilityTypeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Ownership Distribution">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={ownershipDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
              {ownershipDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cost Distribution">
        <ResponsiveContainer>
          <BarChart data={costDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="#26A69A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Category Distribution">
        <ResponsiveContainer>
          <BarChart data={categoryDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" fill="#42A5F5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Poverty Index vs Facilities Per 100K">
        <ResponsiveContainer>
          <ScatterChart margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="poverty" name="Poverty Index" tick={{ fontSize: 10 }} />
            <YAxis dataKey="per100k" name="Per 100K" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={scatterData} fill="#1565C0" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Literacy Rate vs Facilities Per 100K">
        <ResponsiveContainer>
          <ScatterChart margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="literacy" name="Literacy Rate" tick={{ fontSize: 10 }} />
            <YAxis dataKey="per100k" name="Per 100K" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Scatter data={scatterData} fill="#00897B" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Urban % vs Total Facilities">
        <ResponsiveContainer>
          <ScatterChart margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="urban" name="Urban %" tick={{ fontSize: 10 }} />
            <YAxis dataKey="facilities" name="Facilities" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Scatter data={scatterData} fill="#4FC3F7" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
