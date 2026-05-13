import { useState, useMemo } from 'react';
import type { DistrictPop, Facility } from '@/types/dashboard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid, ReferenceLine, Cell,
  LabelList, PieChart, Pie, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  underserved: '#ef4444',
  served:      '#22c55e',
  neutral:     '#3b82f6',
  accent:      '#14b8a6',
  warning:     '#f59e0b',
  grid:        '#e5e7eb',
  line:        '#94a3b8',
  orange:      '#f97316',
  purple:      '#8b5cf6',
};

const DONUT_PALETTE  = ['#3b82f6','#14b8a6','#f59e0b','#8b5cf6','#ef4444','#22c55e','#f97316','#06b6d4'];
const DIV_PALETTE    = ['#3b82f6','#14b8a6','#f59e0b','#8b5cf6','#ef4444','#22c55e','#f97316','#06b6d4'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function truncateLabel(label: string, max = 14) {
  if (!label) return 'Unknown';
  return label.length > max ? `${label.slice(0, max)}…` : label;
}

function getSeverity(per100k: number) {
  if (per100k <= 0.08) return { label: 'Critical',  color: C.underserved };
  if (per100k <= 0.18) return { label: 'High',      color: C.orange };
  if (per100k <= 0.3)  return { label: 'Moderate',  color: C.warning };
  return                      { label: 'Better',    color: C.served };
}

function countBy<T>(arr: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  arr.forEach((item) => {
    const k = (key(item) || 'Unknown').trim() || 'Unknown';
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function parseCostBracket(cost: string): string {
  if (!cost) return 'Unknown';
  const lower = cost.toLowerCase();
  if (lower === 'free' || lower.includes('free')) return 'Free';
  const nums = cost.match(/\d+/g);
  if (!nums) return 'Unknown';
  const avg = nums.reduce((s, n) => s + parseInt(n), 0) / nums.length;
  if (avg < 100)  return '1–99 BDT';
  if (avg < 500)  return '100–499 BDT';
  if (avg < 1000) return '500–999 BDT';
  return '1000+ BDT';
}

// ── Shared sub-components ──────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="text-[11px] leading-4 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ChartCard({
  title, insight, children, height = 300, className = '',
}: {
  title: string; insight?: string; children: React.ReactNode; height?: number; className?: string;
}) {
  return (
    <div className={`dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4 ${className}`}>
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {insight && <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{insight}</p>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function RankingGrid({
  title, data, color,
}: {
  title: string;
  data: { name: string; value: number; populationM: number; severity: string; severityColor: string }[];
  color: string;
}) {
  if (!data.length) return null;
  const maxValue = Math.max(...data.map((d) => d.value), 0.01);
  return (
    <div className="dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="text-[10px] text-muted-foreground">facilities per 100K</div>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {data.map((d, i) => {
          const widthPct = (d.value / maxValue) * 100;
          return (
            <div key={d.name} className="rounded-lg border border-border bg-background px-2.5 py-2">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                      {i + 1}
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground">{d.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-7 text-[10px] text-muted-foreground">
                    <span className="rounded-md bg-muted px-1.5 py-0.5">Pop: {d.populationM.toFixed(2)}M</span>
                    <span className="rounded-md px-1.5 py-0.5 text-white" style={{ backgroundColor: d.severityColor }}>{d.severity}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-bold text-foreground">{d.value.toFixed(2)}</div>
                </div>
              </div>
              <div className="pl-7">
                <div className="h-1.5 w-full rounded-full bg-muted/80">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.max(widthPct, 10)}%`, backgroundColor: color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Lollipop chart ─────────────────────────────────────────────────────────────
function LollipopChart({ data }: { data: { name: string; shortName: string; facilities: number; per100k: number }[] }) {
  const max = Math.max(...data.map((d) => d.facilities), 1);
  return (
    <div className="flex h-full flex-col justify-between gap-1 overflow-hidden py-1">
      {data.map((d, i) => {
        const pct = (d.facilities / max) * 100;
        return (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-[10px] font-semibold text-muted-foreground">{i + 1}</span>
            <span className="w-[88px] shrink-0 truncate text-right text-[10px] text-foreground" title={d.name}>{d.shortName}</span>
            <div className="relative flex flex-1 items-center">
              <div className="h-[2px] w-full rounded-full bg-muted/60" />
              <div className="absolute h-[2px] rounded-full bg-blue-400 transition-all" style={{ width: `${pct}%` }} />
              <div className="absolute h-3 w-3 rounded-full border-2 border-blue-500 bg-card" style={{ left: `calc(${pct}% - 6px)` }} />
            </div>
            <span className="w-7 shrink-0 text-left text-[10px] font-bold text-foreground">{d.facilities}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut label ────────────────────────────────────────────────────────────────
const RADIAN = Math.PI / 180;
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>;
}

// ── Scatter tooltip ────────────────────────────────────────────────────────────
function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const sev = getSeverity(d.per100k);
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-xs shadow-xl" style={{ minWidth: 172 }}>
      <div className="mb-1.5 font-bold text-foreground" style={{ fontSize: 13 }}>{d.name}</div>
      <div className="space-y-0.5 text-muted-foreground">
        <div className="flex justify-between gap-6"><span>Population</span><span className="font-semibold text-foreground">{d.population.toFixed(2)}M</span></div>
        <div className="flex justify-between gap-6"><span>Per 100K</span><span className="font-semibold text-foreground">{d.per100k}</span></div>
        <div className="flex justify-between gap-6"><span>Facilities</span><span className="font-semibold text-foreground">{d.facilities}</span></div>
      </div>
      <div className="mt-2 rounded-md px-2 py-1 text-center font-bold text-white" style={{ fontSize: 10, backgroundColor: sev.color }}>
        {sev.label} coverage{d.critical ? ' · Priority' : ''}
      </div>
    </div>
  );
}

// ── Compare helpers ────────────────────────────────────────────────────────────
function getDiff(valA: number, valB: number) {
  if (valB === 0) return { pct: 0, direction: 'same' as const };
  const pct = ((valA - valB) / valB) * 100;
  return { pct: Math.abs(pct), direction: pct > 0 ? ('higher' as const) : pct < 0 ? ('lower' as const) : ('same' as const) };
}

function getDiffColor(direction: 'higher' | 'lower' | 'same', higherIsBetter: boolean) {
  if (direction === 'same') return 'text-muted-foreground';
  if (higherIsBetter) return direction === 'higher' ? 'text-green-600' : 'text-red-500';
  return direction === 'higher' ? 'text-red-500' : 'text-green-600';
}

// ══════════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════════
interface InsightsProps {
  districts: DistrictPop[];
  facilities: Facility[];
}

export default function InsightsTab({ districts, facilities }: InsightsProps) {

  // ── Compare state ────────────────────────────────────────────────────────────
  const [distA, setDistA] = useState('');
  const [distB, setDistB] = useState('');

  const sortedDistricts = useMemo(
    () => [...districts].filter((d) => d.DIS_NAME).sort((a, b) => (a.DIS_NAME || '').localeCompare(b.DIS_NAME || '')),
    [districts]
  );

  const national = useMemo<DistrictPop | null>(() => {
    if (!districts.length) return null;
    const n = districts.length;
    const totalPop = districts.reduce((s, d) => s + d.Population, 0);
    const totalFac = districts.reduce((s, d) => s + d.total_facilities, 0);
    return {
      DIV_NAME: 'National', DIV_CODE: 'national', DIS_NAME: 'National Average', DIS_CODE: 'national',
      Population: Math.round(totalPop / n), Male_population: 0, Female_population: 0,
      Rural_population: 0, Urban_population: 0,
      Total_households: Math.round(districts.reduce((s, d) => s + (d.Total_households || 0), 0) / n),
      Average_household_size: 0, total_facilities: Math.round(totalFac / n),
      facilitiesPer100k: totalPop > 0 ? (totalFac / totalPop) * 100000 : 0,
      populationPerFacility: totalFac > 0 ? totalPop / totalFac : 0,
      'Poverty Index': districts.reduce((s, d) => s + d['Poverty Index'], 0) / n,
      Literacy_rate: districts.reduce((s, d) => s + d.Literacy_rate, 0) / n,
      Urban_percent: districts.reduce((s, d) => s + d.Urban_percent, 0) / n,
    };
  }, [districts]);

  const compA = districts.find((d) => d.DIS_CODE === distA);
  const compB = distB === 'national' ? national : districts.find((d) => d.DIS_CODE === distB);

  const compData = useMemo(() => {
    if (!compA || !compB) return [];
    return [
      { metric: 'Population (M)', A: +(compA.Population / 1e6).toFixed(2),     B: +(compB.Population / 1e6).toFixed(2),     unit: 'M',  higherIsBetter: false },
      { metric: 'Facilities',     A: compA.total_facilities,                      B: compB.total_facilities,                      unit: '',   higherIsBetter: true  },
      { metric: 'Per 100K',       A: +(compA.facilitiesPer100k || 0).toFixed(2), B: +(compB.facilitiesPer100k || 0).toFixed(2), unit: '',   higherIsBetter: true  },
      { metric: 'Poverty Index',  A: +compA['Poverty Index'].toFixed(1),         B: +compB['Poverty Index'].toFixed(1),         unit: '',   higherIsBetter: false },
      { metric: 'Literacy %',     A: +compA.Literacy_rate.toFixed(1),             B: +compB.Literacy_rate.toFixed(1),             unit: '%',  higherIsBetter: true  },
      { metric: 'Urban %',        A: +compA.Urban_percent.toFixed(1),             B: +compB.Urban_percent.toFixed(1),             unit: '%',  higherIsBetter: false },
    ];
  }, [compA, compB]);

  // ── Chart data ────────────────────────────────────────────────────────────────
  const districtBars = useMemo(
    () => [...districts].sort((a, b) => b.total_facilities - a.total_facilities).slice(0, 15).map((d) => ({
      name: d.DIS_NAME || 'Unknown',
      shortName: truncateLabel(d.DIS_NAME || 'Unknown', 12),
      facilities: d.total_facilities || 0,
      per100k: +(d.facilitiesPer100k || 0).toFixed(2),
    })),
    [districts]
  );

  const underserved = useMemo(
    () => [...districts]
      .filter((d) => d.facilitiesPer100k !== undefined)
      .sort((a, b) => (a.facilitiesPer100k || 0) - (b.facilitiesPer100k || 0))
      .slice(0, 10)
      .map((d) => { const per100k = +(d.facilitiesPer100k || 0).toFixed(2); const sev = getSeverity(per100k); return { name: d.DIS_NAME || 'Unknown', value: per100k, populationM: +(d.Population / 1e6).toFixed(2), severity: sev.label, severityColor: sev.color }; }),
    [districts]
  );

  const bestServed = useMemo(
    () => [...districts]
      .filter((d) => d.facilitiesPer100k !== undefined)
      .sort((a, b) => (b.facilitiesPer100k || 0) - (a.facilitiesPer100k || 0))
      .slice(0, 10)
      .map((d) => { const per100k = +(d.facilitiesPer100k || 0).toFixed(2); const sev = getSeverity(per100k); return { name: d.DIS_NAME || 'Unknown', value: per100k, populationM: +(d.Population / 1e6).toFixed(2), severity: sev.label, severityColor: sev.color }; }),
    [districts]
  );

  const populationMedian = useMemo(() => {
    const vals = districts.map((d) => d.Population / 1e6).filter(Number.isFinite).sort((a, b) => a - b);
    if (!vals.length) return 0;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
  }, [districts]);

  const coverageMedian = useMemo(() => {
    const vals = districts.map((d) => d.facilitiesPer100k || 0).filter(Number.isFinite).sort((a, b) => a - b);
    if (!vals.length) return 0;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
  }, [districts]);

  const facilityVsNeed = useMemo(() => {
    const points = districts.map((d) => {
      const population = +(d.Population / 1e6).toFixed(2);
      const per100k = +(d.facilitiesPer100k || 0).toFixed(2);
      const critical = population >= populationMedian && per100k <= coverageMedian;
      return { name: d.DIS_NAME || 'Unknown', population, per100k, facilities: d.total_facilities || 0, critical };
    });
    const criticalSorted = [...points].filter((d) => d.critical).sort((a, b) => b.population - a.population || a.per100k - b.per100k).slice(0, 8).map((d) => ({ ...d, label: d.name }));
    return { critical: criticalSorted, normal: points.filter((d) => !d.critical), all: points };
  }, [districts, populationMedian, coverageMedian]);

  const quadrantCounts = useMemo(() => {
    const all = facilityVsNeed.all;
    return {
      highPopLowCov:  all.filter((d) => d.population >= populationMedian && d.per100k <  coverageMedian).length,
      highPopHighCov: all.filter((d) => d.population >= populationMedian && d.per100k >= coverageMedian).length,
      lowPopLowCov:   all.filter((d) => d.population <  populationMedian && d.per100k <  coverageMedian).length,
      lowPopHighCov:  all.filter((d) => d.population <  populationMedian && d.per100k >= coverageMedian).length,
    };
  }, [facilityVsNeed.all, populationMedian, coverageMedian]);

  const facilityTypeDist = useMemo(() => countBy(facilities, (f) => f.facility_type).slice(0, 10), [facilities]);
  const ownershipDist    = useMemo(() => countBy(facilities, (f) => f.ownership), [facilities]);

  // ── NEW: Division-level breakdown (govt vs private stacked) ──────────────────
  const divisionBreakdown = useMemo(() => {
    const divs: Record<string, { govt: number; private: number; free: number; child: number }> = {};
    facilities.forEach((f) => {
      const div = f.DIV_NAME || 'Unknown';
      if (!divs[div]) divs[div] = { govt: 0, private: 0, free: 0, child: 0 };
      if (f.ownership === 'Government') divs[div].govt++;
      else divs[div].private++;
      if ((f.cost || '').toLowerCase().includes('free')) divs[div].free++;
      if ((f.category_adult_child_both || '').includes('Child')) divs[div].child++;
    });
    return Object.entries(divs)
      .map(([name, v]) => ({ name, ...v, total: v.govt + v.private }))
      .sort((a, b) => b.total - a.total);
  }, [facilities]);

  // ── NEW: Access profile — cost brackets ──────────────────────────────────────
  const costBrackets = useMemo(() => {
    const order = ['Free', '1–99 BDT', '100–499 BDT', '500–999 BDT', '1000+ BDT', 'Unknown'];
    const map: Record<string, number> = {};
    order.forEach((k) => (map[k] = 0));
    facilities.forEach((f) => { const b = parseCostBracket(f.cost || ''); map[b] = (map[b] || 0) + 1; });
    return order.map((name) => ({ name, value: map[name] || 0 }));
  }, [facilities]);

  // ── NEW: Appointment + walk-in access matrix ─────────────────────────────────
  const accessMatrix = useMemo(() => {
    const apptFree   = facilities.filter((f) => f.appointment_required === 'Yes' && (f.cost || '').toLowerCase().includes('free')).length;
    const apptPaid   = facilities.filter((f) => f.appointment_required === 'Yes' && !(f.cost || '').toLowerCase().includes('free')).length;
    const walkinFree = facilities.filter((f) => f.appointment_required === 'No'  && (f.cost || '').toLowerCase().includes('free')).length;
    const walkinPaid = facilities.filter((f) => f.appointment_required === 'No'  && !(f.cost || '').toLowerCase().includes('free')).length;
    return [
      { name: 'Walk-in + Free',       value: walkinFree, fill: C.served   },
      { name: 'Walk-in + Paid',       value: walkinPaid, fill: C.neutral  },
      { name: 'Appointment + Free',   value: apptFree,   fill: C.accent   },
      { name: 'Appointment + Paid',   value: apptPaid,   fill: C.warning  },
    ];
  }, [facilities]);

  // ── NEW: Facility type × Ownership heatmap-style table ───────────────────────
  const typeOwnerMatrix = useMemo(() => {
    const types  = Array.from(new Set(facilities.map((f) => f.facility_type))).filter(Boolean);
    const owners = ['Government', 'Private'];
    return types.map((type) => {
      const row: Record<string, number | string> = { type };
      owners.forEach((own) => {
        row[own] = facilities.filter((f) => f.facility_type === type && f.ownership === own).length;
      });
      row.total = (row['Government'] as number) + (row['Private'] as number);
      return row as { type: string; Government: number; Private: number; total: number };
    }).sort((a, b) => b.total - a.total);
  }, [facilities]);

  // ── NEW: Division radar — normalised multi-metric profile ────────────────────
  const divisionRadar = useMemo(() => {
    const divNames = Array.from(new Set(facilities.map((f) => f.DIV_NAME))).filter(Boolean).sort();
    // For radar we use 5 divisions max (top by facility count)
    const top5 = [...divisionBreakdown].slice(0, 5).map((d) => d.name);
    const distByDiv: Record<string, DistrictPop[]> = {};
    districts.forEach((d) => {
      const div = d.DIV_NAME || 'Unknown';
      if (!distByDiv[div]) distByDiv[div] = [];
      distByDiv[div].push(d);
    });

    // metrics normalised 0-100
    const allCoverage = districts.map((d) => d.facilitiesPer100k || 0);
    const maxCov = Math.max(...allCoverage, 0.01);
    const allLit = districts.map((d) => d.Literacy_rate || 0);
    const minLit = Math.min(...allLit); const maxLit = Math.max(...allLit);
    const allPov = districts.map((d) => d['Poverty Index'] || 0);
    const minPov = Math.min(...allPov); const maxPov = Math.max(...allPov);

    const norm = (v: number, min: number, max: number) => max === min ? 50 : Math.round(((v - min) / (max - min)) * 100);

    return top5.map((divName, idx) => {
      const divDistricts = distByDiv[divName] || [];
      const avgCov = divDistricts.length ? divDistricts.reduce((s, d) => s + (d.facilitiesPer100k || 0), 0) / divDistricts.length : 0;
      const avgLit = divDistricts.length ? divDistricts.reduce((s, d) => s + d.Literacy_rate, 0) / divDistricts.length : 0;
      const avgPov = divDistricts.length ? divDistricts.reduce((s, d) => s + d['Poverty Index'], 0) / divDistricts.length : 0;
      const divFacs = facilities.filter((f) => f.DIV_NAME === divName);
      const pctGovt = divFacs.length ? Math.round((divFacs.filter((f) => f.ownership === 'Government').length / divFacs.length) * 100) : 0;
      const pctFree = divFacs.length ? Math.round((divFacs.filter((f) => (f.cost || '').toLowerCase().includes('free')).length / divFacs.length) * 100) : 0;
      return {
        name: divName,
        fill: DIV_PALETTE[idx],
        Coverage:   Math.round((avgCov / maxCov) * 100),
        Literacy:   norm(avgLit, minLit, maxLit),
        LowPoverty: norm(maxPov - avgPov, 0, maxPov - minPov), // inverted so higher = better
        GovtShare:  pctGovt,
        FreeAccess: pctFree,
      };
    });
  }, [districts, facilities, divisionBreakdown]);

  const radarMetrics = ['Coverage', 'Literacy', 'LowPoverty', 'GovtShare', 'FreeAccess'];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* ════════════════════════════════════════════════════════════
          1. PRIORITY DISTRICTS
      ════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          title="Priority Districts"
          subtitle="District-level extremes by facility coverage rate. Scroll down for the gap scatter plot."
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RankingGrid title="Top 10 Underserved Districts" data={underserved} color={C.underserved} />
          <RankingGrid title="Top 10 Best Served Districts"  data={bestServed}  color={C.served}     />
        </div>

        {/* Service Gap Analysis scatter ─────────────────────────── */}
        <div className="dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="mb-1">
            <h3 className="text-sm font-semibold text-foreground">Service Gap Analysis</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Each dot is a district. Color shows which quadrant relative to median population and median coverage.
              Red = high population &amp; low coverage — top priority for investment.
            </p>
          </div>

          {/* Quadrant legend pills */}
          <div className="mb-3 mt-2 flex flex-wrap gap-2">
            {[
              { label: `🔴 High Pop · Low Coverage (${quadrantCounts.highPopLowCov})`,  bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
              { label: `🟢 High Pop · High Coverage (${quadrantCounts.highPopHighCov})`, bg: '#f0fdf4', border: '#86efac', text: '#166534' },
              { label: `🟠 Low Pop · Low Coverage (${quadrantCounts.lowPopLowCov})`,    bg: '#fff7ed', border: '#fdba74', text: '#9a3412' },
              { label: `🔵 Low Pop · High Coverage (${quadrantCounts.lowPopHighCov})`,   bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
            ].map((q) => (
              <div key={q.label} className="rounded-full border px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: q.bg, borderColor: q.border, color: q.text }}>
                {q.label}
              </div>
            ))}
          </div>

          <div style={{ height: 420 }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ left: 10, right: 34, top: 16, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} strokeOpacity={0.7} />
                <ReferenceLine x={+populationMedian.toFixed(2)} stroke={C.line} strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: `Median pop (${populationMedian.toFixed(1)}M)`, position: 'insideTopRight', fontSize: 9, fill: C.line, offset: 6 }} />
                <ReferenceLine y={+coverageMedian.toFixed(2)} stroke={C.line} strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: `Median coverage (${coverageMedian.toFixed(2)})`, position: 'insideTopLeft', fontSize: 9, fill: C.line, offset: 6 }} />
                <XAxis type="number" dataKey="population" name="Population (M)" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: C.grid }}
                  label={{ value: 'Population (millions)', position: 'bottom', fontSize: 10, fill: '#6b7280', offset: -10 }} />
                <YAxis type="number" dataKey="per100k" name="Facilities per 100K" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: C.grid }}
                  label={{ value: 'Facilities per 100K', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#6b7280', dx: -4 }} />
                <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '4 4', stroke: C.line }} />

                <Scatter name="Districts" data={facilityVsNeed.normal}
                  shape={(props: any) => {
                    const d = props.payload;
                    const fill = d.population >= populationMedian && d.per100k >= coverageMedian ? C.served
                               : d.population <  populationMedian && d.per100k >= coverageMedian ? C.neutral
                               : C.orange;
                    return <circle cx={props.cx} cy={props.cy} r={5.5} fill={fill} fillOpacity={0.85} stroke="white" strokeWidth={1} />;
                  }}
                />
                <Scatter name="Priority" data={facilityVsNeed.critical}
                  shape={(props: any) => <circle cx={props.cx} cy={props.cy} r={7} fill={C.underserved} fillOpacity={0.92} stroke="white" strokeWidth={1.5} />}
                >
                  <LabelList dataKey="label" position="top" fontSize={9} style={{ fill: '#374151', fontWeight: 600 }} offset={8} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Quadrant legend strip */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground md:grid-cols-4">
            {[
              { icon: '🔴', label: 'Priority',      desc: 'High pop, low coverage — needs immediate investment' },
              { icon: '🟢', label: 'Better served', desc: 'High pop, adequate coverage' },
              { icon: '🟠', label: 'Watch',          desc: 'Low pop, low coverage — monitor closely' },
              { icon: '🔵', label: 'Adequate',       desc: 'Low pop, good coverage relative to size' },
            ].map((s) => (
              <div key={s.label} className="rounded-md bg-muted/40 px-2 py-1.5">
                <div className="font-semibold text-foreground">{s.icon} {s.label}</div>
                <div className="mt-0.5 leading-3">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          2. SYSTEM OVERVIEW
      ════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          title="System Overview"
          subtitle="Where facilities are concentrated and how the service system is structured."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <ChartCard title="Facilities by District (Top 15)" insight="Ranked by total facility count." height={340} className="xl:col-span-5">
            <LollipopChart data={districtBars} />
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 xl:col-span-7 xl:grid-cols-2">
            <ChartCard title="Facility Type Distribution" insight="Horizontal bars ease comparison across categories." height={340}>
              <ResponsiveContainer>
                <BarChart data={facilityTypeDist} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} strokeOpacity={0.6} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} tickFormatter={(v) => truncateLabel(v, 18)} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill={C.neutral} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ownership Distribution" insight="Share of facilities by ownership type." height={340}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={ownershipDist} cx="50%" cy="43%" innerRadius="38%" outerRadius="66%" paddingAngle={3} dataKey="value" labelLine={false} label={DonutLabel}>
                    {ownershipDist.map((_, i) => <Cell key={i} fill={DONUT_PALETTE[i % DONUT_PALETTE.length]} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    const total = ownershipDist.reduce((s, item) => s + item.value, 0);
                    const pct = total ? (((d.value as number) / total) * 100).toFixed(1) : '0';
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md">
                        <div className="font-semibold text-foreground">{d.name}</div>
                        <div className="text-muted-foreground">{d.value} facilities ({pct}%)</div>
                      </div>
                    );
                  }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} formatter={(v) => truncateLabel(v, 20)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          3. DIVISION-LEVEL BREAKDOWN  (NEW)
      ════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          title="Division-Level Breakdown"
          subtitle="Government vs private facility count per division, with free-service and child-focused totals."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* Stacked bar: govt vs private per division */}
          <ChartCard title="Govt vs Private Facilities by Division" insight="Stacked by ownership; total height = all facilities in that division." height={280} className="xl:col-span-7">
            <ResponsiveContainer>
              <BarChart data={divisionBreakdown} margin={{ left: 0, right: 10, top: 5, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} strokeOpacity={0.6} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} angle={-20} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} label={{ value: 'Facilities', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const govt  = (payload.find((p) => p.dataKey === 'govt')?.value  as number) || 0;
                    const priv  = (payload.find((p) => p.dataKey === 'private')?.value as number) || 0;
                    const row   = divisionBreakdown.find((d) => d.name === label);
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md">
                        <div className="mb-1 font-semibold text-foreground">{label}</div>
                        <div className="text-muted-foreground">Government: {govt}</div>
                        <div className="text-muted-foreground">Private: {priv}</div>
                        <div className="text-muted-foreground">Free services: {row?.free ?? 0}</div>
                        <div className="text-muted-foreground">Child-focused: {row?.child ?? 0}</div>
                      </div>
                    );
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="govt"    name="Government" stackId="a" fill={C.neutral}  radius={[0, 0, 0, 0]} />
                <Bar dataKey="private" name="Private"    stackId="a" fill={C.accent}   radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Type × Ownership table */}
          <div className="xl:col-span-5">
            <div className="dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4" style={{ height: 280, overflowY: 'auto' }}>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Facility Type × Ownership</h3>
              <p className="mb-3 text-[11px] text-muted-foreground">Count of facilities by type and ownership sector.</p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-1 text-left font-semibold text-muted-foreground">Type</th>
                    <th className="pb-1 text-right font-semibold text-blue-600">Govt</th>
                    <th className="pb-1 text-right font-semibold text-teal-600">Private</th>
                    <th className="pb-1 text-right font-semibold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {typeOwnerMatrix.map((row) => (
                    <tr key={row.type} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-2 text-foreground font-medium">{truncateLabel(row.type, 22)}</td>
                      <td className="py-1.5 text-right font-semibold text-blue-600">{row.Government}</td>
                      <td className="py-1.5 text-right font-semibold text-teal-600">{row.Private}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          4. ACCESS PROFILE  (NEW)
      ════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          title="Access Profile"
          subtitle="How easy is it to access mental health services? Cost brackets, appointment requirements, and walk-in availability."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">

          {/* Cost bracket bar */}
          <ChartCard title="Cost Distribution" insight="How many facilities fall into each cost range (based on available data)." height={240} className="xl:col-span-5">
            <ResponsiveContainer>
              <BarChart data={costBrackets} margin={{ left: 0, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} strokeOpacity={0.6} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} angle={-15} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" name="Facilities" radius={[6, 6, 0, 0]}>
                  {costBrackets.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.name === 'Free'       ? C.served  :
                      entry.name === '1–99 BDT'   ? C.accent  :
                      entry.name === 'Unknown'    ? C.line    : C.neutral
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Access matrix donut */}
          <ChartCard title="Access Type Matrix" insight="Combination of appointment requirement and cost — walk-in + free is the most accessible." height={240} className="xl:col-span-4">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={accessMatrix} cx="50%" cy="46%" innerRadius="36%" outerRadius="62%" paddingAngle={3} dataKey="value" labelLine={false} label={DonutLabel}>
                  {accessMatrix.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(val, name) => [val, name]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Access summary stat cards */}
          <div className="xl:col-span-3 flex flex-col gap-3 justify-center">
            {[
              { label: 'Walk-in available', value: facilities.filter((f) => f.appointment_required === 'No').length,  icon: '🚶', color: C.served   },
              { label: 'Appointment required', value: facilities.filter((f) => f.appointment_required === 'Yes').length, icon: '📅', color: C.warning  },
              { label: 'Free services',  value: facilities.filter((f) => (f.cost || '').toLowerCase().includes('free')).length, icon: '🆓', color: C.accent   },
              { label: 'International orgs', value: facilities.filter((f) => f.origin === 'International').length,             icon: '🌐', color: C.purple   },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card px-3 py-2.5 flex items-center gap-3">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <div className="text-xl font-bold leading-tight" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          5. DIVISION PROFILE RADAR  (NEW)
      ════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          title="Division Profile Radar"
          subtitle="Normalised multi-metric comparison across the top 5 divisions (0–100 scale; higher = better on all axes)."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Top 5 Divisions — Relative Profile" insight="Coverage, Literacy, Low Poverty, Govt Share, Free Access — each normalised 0–100." height={340}>
            <ResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarMetrics.map((m) => {
                const row: Record<string, string | number> = { metric: m };
                divisionRadar.forEach((d) => { row[d.name] = (d as any)[m]; });
                return row;
              })}>
                <PolarGrid stroke={C.grid} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={4} />
                {divisionRadar.map((d) => (
                  <Radar key={d.name} name={d.name} dataKey={d.name} stroke={d.fill} fill={d.fill} fillOpacity={0.15} strokeWidth={2} />
                ))}
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Division stat table */}
          <div className="dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4" style={{ overflowY: 'auto' }}>
            <h3 className="mb-1 text-sm font-semibold text-foreground">Division Summary</h3>
            <p className="mb-3 text-[11px] text-muted-foreground">All 8 divisions with facility counts and key metrics.</p>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  {['Division','Total','Govt','Free','Child'].map((h) => (
                    <th key={h} className={`pb-1.5 font-semibold text-muted-foreground ${h==='Division' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {divisionBreakdown.map((row, i) => (
                  <tr key={row.name} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-2 font-medium text-foreground">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: DIV_PALETTE[i % DIV_PALETTE.length] }} />
                      {row.name}
                    </td>
                    <td className="py-1.5 text-right font-bold text-foreground">{row.total}</td>
                    <td className="py-1.5 text-right text-blue-600">{row.govt}</td>
                    <td className="py-1.5 text-right text-teal-600">{row.free}</td>
                    <td className="py-1.5 text-right text-purple-600">{row.child}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          6. DISTRICT COMPARISON
      ════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          title="District Comparison"
          subtitle="Compare any two districts side-by-side, or benchmark one against the national average."
        />

        <div className="dashboard-panel rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <select value={distA} onChange={(e) => setDistA(e.target.value)} aria-label="District A"
              className="h-9 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select District A</option>
              {sortedDistricts.map((d) => <option key={d.DIS_CODE} value={d.DIS_CODE}>{d.DIS_NAME}</option>)}
            </select>

            <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">vs</span>

            <select value={distB} onChange={(e) => setDistB(e.target.value)} aria-label="District B"
              className="h-9 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select District B</option>
              <option value="national">📊 National Average</option>
              {sortedDistricts.map((d) => <option key={d.DIS_CODE} value={d.DIS_CODE}>{d.DIS_NAME}</option>)}
            </select>

            {(!compA || !compB) && (
              <p className="text-[11px] text-muted-foreground">Select two districts (or one vs National Average) to compare.</p>
            )}
          </div>
        </div>

        {compA && compB && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {compData.map((item, i) => {
              const diff = getDiff(item.A, item.B);
              const colorClass = getDiffColor(diff.direction, item.higherIsBetter);
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.metric}</div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="truncate text-[10px] text-muted-foreground" style={{ maxWidth: 80 }}>{compA.DIS_NAME}</div>
                      <div className="text-xl font-bold leading-tight text-primary">{item.A}{item.unit}</div>
                    </div>
                    <div className="text-right">
                      <div className="truncate text-[10px] text-muted-foreground" style={{ maxWidth: 80 }}>{compB.DIS_NAME}</div>
                      <div className="text-xl font-bold leading-tight text-accent">{item.B}{item.unit}</div>
                    </div>
                  </div>
                  <div className={`mt-2 flex items-center gap-1 text-[10px] font-semibold ${colorClass}`}>
                    {diff.direction === 'higher' ? <ArrowUp className="h-3 w-3" /> : diff.direction === 'lower' ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    <span>{diff.direction === 'same' ? 'Equal' : `${compA.DIS_NAME} is ${diff.pct.toFixed(0)}% ${diff.direction}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
