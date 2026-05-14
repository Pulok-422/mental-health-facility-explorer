import { useState, useMemo } from 'react';
import type { DistrictPop, Facility } from '@/types/dashboard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid, ReferenceLine, Cell,
  LabelList, PieChart, Pie, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { ArrowUp, ArrowDown, Minus, AlertTriangle, TrendingUp, Users, Lock } from 'lucide-react';

// ── Design Tokens ─────────────────────────────────────────────────────────────
// Blue-dominant. Two roles only:
//   BLUE family  → positive / coverage / government / good
//   SLATE family → neutral / context
// ONE semantic red for critical gaps only.
const C = {
  blue900: '#1e3a5f', blue700: '#1d4ed8', blue600: '#2563eb',
  blue500: '#3b82f6', blue400: '#60a5fa', blue200: '#bfdbfe',
  blue100: '#dbeafe', blue50: '#eff6ff',
  slate700: '#334155', slate500: '#64748b', slate300: '#cbd5e1',
  slate200: '#e2e8f0', slate100: '#f1f5f9', slate50: '#f8fafc',
  gap: '#dc2626', gapBg: '#fef2f2', gapBorder: '#fca5a5',
  amber: '#b45309', amberBg: '#fffbeb',
  chartA: '#2563eb', chartB: '#93c5fd',
  grid: '#e2e8f0', line: '#94a3b8',
};

const DIV_PALETTE = ['#1d4ed8','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#1e3a5f','#2563eb','#7dd3fc'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function truncateLabel(label: string, max = 14) {
  if (!label) return 'Unknown';
  return label.length > max ? `${label.slice(0, max)}\u2026` : label;
}

function getSeverityTier(per100k: number): { label: string; color: string; bg: string } {
  if (per100k <= 0.08) return { label: 'Critical',  color: C.gap,     bg: C.gapBg };
  if (per100k <= 0.18) return { label: 'High gap',  color: C.amber,   bg: C.amberBg };
  if (per100k <= 0.3)  return { label: 'Moderate',  color: C.blue700, bg: C.blue100 };
  return                      { label: 'Adequate',  color: C.blue600, bg: C.blue50 };
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
  if (avg < 100) return '1\u201399 BDT';
  if (avg < 500) return '100\u2013499 BDT';
  if (avg < 1000) return '500\u2013999 BDT';
  return '1000+ BDT';
}

function getDiff(valA: number, valB: number) {
  if (valB === 0) return { pct: 0, direction: 'same' as const };
  const pct = ((valA - valB) / valB) * 100;
  return { pct: Math.abs(pct), direction: pct > 0 ? 'higher' as const : pct < 0 ? 'lower' as const : 'same' as const };
}

function getDiffColor(direction: 'higher' | 'lower' | 'same', higherIsBetter: boolean) {
  if (direction === 'same') return 'text-muted-foreground';
  if (higherIsBetter) return direction === 'higher' ? 'text-blue-700' : 'text-red-600';
  return direction === 'higher' ? 'text-red-600' : 'text-blue-700';
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionHeader({ step, title, subtitle }: { step: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4 pb-1">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: C.blue600 }}>
        {step}
      </div>
      <div>
        <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function SectionDivider() {
  return <div className="h-px bg-gradient-to-r from-blue-200 via-slate-200 to-transparent my-2" />;
}

function ChartCard({ title, insight, children, height = 300, className = '' }: {
  title: string; insight?: string; children: React.ReactNode; height?: number; className?: string;
}) {
  return (
    <div className={`dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4 ${className}`}>
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {insight && <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{insight}</p>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function RankingGrid({ title, data, variant }: {
  title: string;
  data: { name: string; value: number; populationM: number; label: string; labelBg: string; labelColor: string }[];
  variant: 'gap' | 'served';
}) {
  if (!data.length) return null;
  const barColor = variant === 'gap' ? C.gap : C.blue600;
  const maxValue = Math.max(...data.map((d) => d.value), 0.01);
  return (
    <div className="dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground">per 100K people</span>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {data.map((d, i) => {
          const widthPct = (d.value / maxValue) * 100;
          return (
            <div key={d.name} className="rounded-lg border border-border bg-background px-2.5 py-2">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: barColor }}>{i + 1}</span>
                    <span className="truncate text-xs font-semibold text-foreground">{d.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-7 text-[10px] text-muted-foreground">
                    <span className="rounded-md bg-muted px-1.5 py-0.5">{d.populationM.toFixed(2)}M pop.</span>
                    <span className="rounded-md px-1.5 py-0.5 font-semibold" style={{ backgroundColor: d.labelBg, color: d.labelColor }}>{d.label}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-bold text-foreground">{d.value.toFixed(2)}</div>
                </div>
              </div>
              <div className="pl-7">
                <div className="h-1.5 w-full rounded-full bg-muted/80">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.max(widthPct, 8)}%`, backgroundColor: barColor }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LollipopChart({ data }: { data: { name: string; shortName: string; facilities: number }[] }) {
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
              <div className="absolute h-3 w-3 rounded-full border-2 bg-card" style={{ left: `calc(${pct}% - 6px)`, borderColor: C.blue500 }} />
            </div>
            <span className="w-7 shrink-0 text-left text-[10px] font-bold text-foreground">{d.facilities}</span>
          </div>
        );
      })}
    </div>
  );
}

const RADIAN = Math.PI / 180;
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.07) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>;
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const sev = getSeverityTier(d.per100k);
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-xs shadow-xl" style={{ minWidth: 172 }}>
      <div className="mb-1.5 font-bold text-foreground" style={{ fontSize: 13 }}>{d.name}</div>
      <div className="space-y-0.5 text-muted-foreground">
        <div className="flex justify-between gap-6"><span>Population</span><span className="font-semibold text-foreground">{d.population.toFixed(2)}M</span></div>
        <div className="flex justify-between gap-6"><span>Per 100K</span><span className="font-semibold text-foreground">{d.per100k}</span></div>
        <div className="flex justify-between gap-6"><span>Facilities</span><span className="font-semibold text-foreground">{d.facilities}</span></div>
      </div>
      <div className="mt-2 rounded-md px-2 py-1 text-center font-bold" style={{ fontSize: 10, backgroundColor: sev.bg, color: sev.color }}>{sev.label}</div>
    </div>
  );
}

function StatCard({ value, label, icon: Icon, color }: { value: number; label: string; icon: any; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: C.blue50 }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-bold leading-tight" style={{ color }}>{value.toLocaleString()}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
interface InsightsProps { districts: DistrictPop[]; facilities: Facility[]; }

export default function InsightsTab({ districts, facilities }: InsightsProps) {
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
      { metric: 'Population (M)', A: +(compA.Population / 1e6).toFixed(2), B: +(compB.Population / 1e6).toFixed(2), unit: 'M', higherIsBetter: false },
      { metric: 'Facilities', A: compA.total_facilities, B: compB.total_facilities, unit: '', higherIsBetter: true },
      { metric: 'Per 100K', A: +(compA.facilitiesPer100k || 0).toFixed(2), B: +(compB.facilitiesPer100k || 0).toFixed(2), unit: '', higherIsBetter: true },
      { metric: 'Poverty Index', A: +compA['Poverty Index'].toFixed(1), B: +compB['Poverty Index'].toFixed(1), unit: '', higherIsBetter: false },
      { metric: 'Literacy %', A: +compA.Literacy_rate.toFixed(1), B: +compB.Literacy_rate.toFixed(1), unit: '%', higherIsBetter: true },
      { metric: 'Urban %', A: +compA.Urban_percent.toFixed(1), B: +compB.Urban_percent.toFixed(1), unit: '%', higherIsBetter: false },
    ];
  }, [compA, compB]);

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
    () => [...districts].filter((d) => d.facilitiesPer100k !== undefined)
      .sort((a, b) => (a.facilitiesPer100k || 0) - (b.facilitiesPer100k || 0)).slice(0, 10)
      .map((d) => { const p = +(d.facilitiesPer100k || 0).toFixed(2); const s = getSeverityTier(p); return { name: d.DIS_NAME || 'Unknown', value: p, populationM: +(d.Population / 1e6).toFixed(2), label: s.label, labelBg: s.bg, labelColor: s.color }; }),
    [districts]
  );

  const bestServed = useMemo(
    () => [...districts].filter((d) => d.facilitiesPer100k !== undefined)
      .sort((a, b) => (b.facilitiesPer100k || 0) - (a.facilitiesPer100k || 0)).slice(0, 10)
      .map((d) => { const p = +(d.facilitiesPer100k || 0).toFixed(2); const s = getSeverityTier(p); return { name: d.DIS_NAME || 'Unknown', value: p, populationM: +(d.Population / 1e6).toFixed(2), label: s.label, labelBg: s.bg, labelColor: s.color }; }),
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
    const all = districts.map((d) => ({
      name: d.DIS_NAME || 'Unknown',
      population: +(d.Population / 1e6).toFixed(2),
      per100k: +(d.facilitiesPer100k || 0).toFixed(2),
      facilities: d.total_facilities || 0,
    }));
    const isGap = (d: typeof all[0]) => d.population >= populationMedian && d.per100k < coverageMedian;
    const gap = all.filter(isGap);
    const rest = all.filter((d) => !isGap(d));
    const gapLabelled = [...gap].sort((a, b) => b.population - a.population || a.per100k - b.per100k)
      .slice(0, 8).map((d) => ({ ...d, label: d.name }));
    const gapUnlabelled = gap.filter((d) => !gapLabelled.find((g) => g.name === d.name));
    return { gapLabelled, gapUnlabelled, rest, gapCount: gap.length };
  }, [districts, populationMedian, coverageMedian]);

  const facilityTypeDist = useMemo(() => countBy(facilities, (f) => f.facility_type).slice(0, 10), [facilities]);
  const ownershipDist = useMemo(() => countBy(facilities, (f) => f.ownership), [facilities]);

  const divisionBreakdown = useMemo(() => {
    const divs: Record<string, { govt: number; private: number; free: number; child: number }> = {};
    facilities.forEach((f) => {
      const div = f.DIV_NAME || 'Unknown';
      if (!divs[div]) divs[div] = { govt: 0, private: 0, free: 0, child: 0 };
      if (f.ownership === 'Government') divs[div].govt++; else divs[div].private++;
      if ((f.cost || '').toLowerCase().includes('free')) divs[div].free++;
      if ((f.category_adult_child_both || '').includes('Child')) divs[div].child++;
    });
    return Object.entries(divs).map(([name, v]) => ({ name, ...v, total: v.govt + v.private })).sort((a, b) => b.total - a.total);
  }, [facilities]);

  const costBrackets = useMemo(() => {
    const order = ['Free', '1\u201399 BDT', '100\u2013499 BDT', '500\u2013999 BDT', '1000+ BDT', 'Unknown'];
    const map: Record<string, number> = {};
    order.forEach((k) => (map[k] = 0));
    facilities.forEach((f) => { const b = parseCostBracket(f.cost || ''); map[b] = (map[b] || 0) + 1; });
    return order.map((name) => ({ name, value: map[name] || 0 }));
  }, [facilities]);

  const accessMatrix = useMemo(() => {
    const walkinFree = facilities.filter((f) => f.appointment_required === 'No' && (f.cost || '').toLowerCase().includes('free')).length;
    const walkinPaid = facilities.filter((f) => f.appointment_required === 'No' && !(f.cost || '').toLowerCase().includes('free')).length;
    const apptFree = facilities.filter((f) => f.appointment_required === 'Yes' && (f.cost || '').toLowerCase().includes('free')).length;
    const apptPaid = facilities.filter((f) => f.appointment_required === 'Yes' && !(f.cost || '').toLowerCase().includes('free')).length;
    return [
      { name: 'Walk-in \u00b7 Free', value: walkinFree, fill: C.blue600 },
      { name: 'Walk-in \u00b7 Paid', value: walkinPaid, fill: C.blue400 },
      { name: 'Appt \u00b7 Free', value: apptFree, fill: C.blue200 },
      { name: 'Appt \u00b7 Paid', value: apptPaid, fill: C.slate300 },
    ];
  }, [facilities]);

  const typeOwnerMatrix = useMemo(() => {
    const types = Array.from(new Set(facilities.map((f) => f.facility_type))).filter(Boolean);
    return types.map((type) => {
      const govt = facilities.filter((f) => f.facility_type === type && f.ownership === 'Government').length;
      const priv = facilities.filter((f) => f.facility_type === type && f.ownership === 'Private').length;
      return { type, Government: govt, Private: priv, total: govt + priv };
    }).sort((a, b) => b.total - a.total);
  }, [facilities]);

  const divisionRadar = useMemo(() => {
    const top5 = [...divisionBreakdown].slice(0, 5).map((d) => d.name);
    const distByDiv: Record<string, DistrictPop[]> = {};
    districts.forEach((d) => { const div = d.DIV_NAME || 'Unknown'; if (!distByDiv[div]) distByDiv[div] = []; distByDiv[div].push(d); });
    const allCov = districts.map((d) => d.facilitiesPer100k || 0);
    const maxCov = Math.max(...allCov, 0.01);
    const allLit = districts.map((d) => d.Literacy_rate || 0);
    const minLit = Math.min(...allLit); const maxLit = Math.max(...allLit);
    const allPov = districts.map((d) => d['Poverty Index'] || 0);
    const minPov = Math.min(...allPov); const maxPov = Math.max(...allPov);
    const norm = (v: number, min: number, max: number) => max === min ? 50 : Math.round(((v - min) / (max - min)) * 100);
    return top5.map((divName, idx) => {
      const dd = distByDiv[divName] || [];
      const avgCov = dd.length ? dd.reduce((s, d) => s + (d.facilitiesPer100k || 0), 0) / dd.length : 0;
      const avgLit = dd.length ? dd.reduce((s, d) => s + d.Literacy_rate, 0) / dd.length : 0;
      const avgPov = dd.length ? dd.reduce((s, d) => s + d['Poverty Index'], 0) / dd.length : 0;
      const divFacs = facilities.filter((f) => f.DIV_NAME === divName);
      const pctGovt = divFacs.length ? Math.round((divFacs.filter((f) => f.ownership === 'Government').length / divFacs.length) * 100) : 0;
      const pctFree = divFacs.length ? Math.round((divFacs.filter((f) => (f.cost || '').toLowerCase().includes('free')).length / divFacs.length) * 100) : 0;
      return { name: divName, fill: DIV_PALETTE[idx], Coverage: Math.round((avgCov / maxCov) * 100), Literacy: norm(avgLit, minLit, maxLit), LowPoverty: norm(maxPov - avgPov, 0, maxPov - minPov), GovtShare: pctGovt, FreeAccess: pctFree };
    });
  }, [districts, facilities, divisionBreakdown]);

  const radarMetrics = ['Coverage', 'Literacy', 'LowPoverty', 'GovtShare', 'FreeAccess'];

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── CHAPTER 1: WHERE ARE THE GAPS? ── */}
      <section className="space-y-4">
        <SectionHeader
          step="1"
          title="Where are the gaps?"
          subtitle="Districts ranked by mental health facility coverage (facilities per 100,000 people). Districts marked Critical have the greatest unmet need."
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RankingGrid title="10 Most Underserved Districts" data={underserved} variant="gap" />
          <RankingGrid title="10 Best Served Districts" data={bestServed} variant="served" />
        </div>

        <div className="dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">Population vs. Coverage — Investment Priority Map</h3>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              Each dot is a district. Districts in the <strong>lower-right quadrant</strong> (large population, few facilities) are the highest-priority targets for new investment.
            </p>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: C.gapBg, borderColor: C.gapBorder, color: C.gap }}>
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: C.gap }} />
              High population &middot; Low coverage &mdash; priority ({facilityVsNeed.gapCount} districts)
            </div>
            <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: C.blue50, borderColor: C.blue200, color: C.blue700 }}>
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: C.blue400 }} />
              Remaining districts
            </div>
          </div>

          <div style={{ height: 400 }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ left: 10, right: 34, top: 16, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} strokeOpacity={0.7} />
                <ReferenceLine x={+populationMedian.toFixed(2)} stroke={C.slate300} strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: `Median pop (${populationMedian.toFixed(1)}M)`, position: 'insideTopRight', fontSize: 9, fill: C.slate500, offset: 6 }} />
                <ReferenceLine y={+coverageMedian.toFixed(2)} stroke={C.slate300} strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: `Median coverage (${coverageMedian.toFixed(2)})`, position: 'insideTopLeft', fontSize: 9, fill: C.slate500, offset: 6 }} />
                <XAxis type="number" dataKey="population" name="Population (M)" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: C.grid }}
                  label={{ value: 'Population (millions)', position: 'bottom', fontSize: 10, fill: C.slate500, offset: -10 }} />
                <YAxis type="number" dataKey="per100k" name="Facilities per 100K" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: C.grid }}
                  label={{ value: 'Facilities per 100K', angle: -90, position: 'insideLeft', fontSize: 10, fill: C.slate500, dx: -4 }} />
                <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '4 4', stroke: C.slate300 }} />
                <Scatter name="Other districts" data={facilityVsNeed.rest}
                  shape={(props: any) => <circle cx={props.cx} cy={props.cy} r={5} fill={C.blue400} fillOpacity={0.55} stroke="white" strokeWidth={1} />} />
                <Scatter name="Gap (unlabelled)" data={facilityVsNeed.gapUnlabelled}
                  shape={(props: any) => <circle cx={props.cx} cy={props.cy} r={6} fill={C.gap} fillOpacity={0.75} stroke="white" strokeWidth={1} />} />
                <Scatter name="Gap (priority)" data={facilityVsNeed.gapLabelled}
                  shape={(props: any) => <circle cx={props.cx} cy={props.cy} r={7.5} fill={C.gap} fillOpacity={0.92} stroke="white" strokeWidth={1.5} />}>
                  <LabelList dataKey="label" position="top" fontSize={9} style={{ fill: C.slate700, fontWeight: 600 }} offset={9} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-muted-foreground italic">
            Dashed lines mark the national median population and median coverage. Districts below the coverage line are below-average — those also right of the population line are the most urgent.
          </p>
        </div>
      </section>

      <SectionDivider />

      {/* ── CHAPTER 2: HOW IS THE SYSTEM STRUCTURED? ── */}
      <section className="space-y-4">
        <SectionHeader
          step="2"
          title="How is the system structured?"
          subtitle="Facility concentration by district and division, with ownership and type breakdown — understanding what already exists."
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <ChartCard title="Facilities by District (Top 15)" insight="Concentration is highest in major cities. Rural districts are largely absent from this list." height={340} className="xl:col-span-5">
            <LollipopChart data={districtBars} />
          </ChartCard>
          <div className="grid grid-cols-1 gap-4 xl:col-span-7 xl:grid-cols-2">
            <ChartCard title="Facility Types" insight="Psychiatric services and general hospitals dominate the landscape." height={340}>
              <ResponsiveContainer>
                <BarChart data={facilityTypeDist} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} strokeOpacity={0.6} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} tickFormatter={(v) => truncateLabel(v, 18)} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill={C.blue500} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Ownership Split" insight="Most facilities are private — government provision is limited relative to need." height={340}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={ownershipDist} cx="50%" cy="43%" innerRadius="38%" outerRadius="66%" paddingAngle={3} dataKey="value" labelLine={false} label={DonutLabel}>
                    {ownershipDist.map((_, i) => <Cell key={i} fill={[C.blue600, C.blue200, C.blue900][i % 3]} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    const total = ownershipDist.reduce((s, item) => s + item.value, 0);
                    const pct = total ? (((d.value as number) / total) * 100).toFixed(1) : '0';
                    return <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md"><div className="font-semibold text-foreground">{d.name}</div><div className="text-muted-foreground">{d.value} facilities ({pct}%)</div></div>;
                  }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} formatter={(v) => truncateLabel(v, 20)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <ChartCard title="Government vs. Private by Division" insight="Hover for free-service and child-focused counts within each division." height={280} className="xl:col-span-7">
            <ResponsiveContainer>
              <BarChart data={divisionBreakdown} margin={{ left: 0, right: 10, top: 5, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} strokeOpacity={0.6} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} angle={-20} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} label={{ value: 'Facilities', angle: -90, position: 'insideLeft', fontSize: 10, fill: C.slate500 }} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const govt = (payload.find((p) => p.dataKey === 'govt')?.value as number) || 0;
                  const priv = (payload.find((p) => p.dataKey === 'private')?.value as number) || 0;
                  const row = divisionBreakdown.find((d) => d.name === label);
                  return <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md"><div className="mb-1 font-semibold text-foreground">{label}</div><div className="text-muted-foreground">Government: {govt}</div><div className="text-muted-foreground">Private: {priv}</div><div className="text-muted-foreground">Free services: {row?.free ?? 0}</div><div className="text-muted-foreground">Child-focused: {row?.child ?? 0}</div></div>;
                }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="govt" name="Government" stackId="a" fill={C.chartA} />
                <Bar dataKey="private" name="Private" stackId="a" fill={C.chartB} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="xl:col-span-5">
            <div className="dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4" style={{ height: 280, overflowY: 'auto' }}>
              <h3 className="mb-1 text-sm font-semibold text-foreground">Facility Type \u00d7 Ownership</h3>
              <p className="mb-3 text-[11px] text-muted-foreground">Count by type and sector.</p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-1 text-left font-semibold text-muted-foreground">Type</th>
                    <th className="pb-1 text-right font-semibold" style={{ color: C.blue700 }}>Govt</th>
                    <th className="pb-1 text-right font-semibold" style={{ color: C.blue400 }}>Private</th>
                    <th className="pb-1 text-right font-semibold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {typeOwnerMatrix.map((row) => (
                    <tr key={row.type} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-2 font-medium text-foreground">{truncateLabel(row.type, 22)}</td>
                      <td className="py-1.5 text-right font-semibold" style={{ color: C.blue700 }}>{row.Government}</td>
                      <td className="py-1.5 text-right font-semibold" style={{ color: C.blue400 }}>{row.Private}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── CHAPTER 3: WHO CAN ACCESS SERVICES? ── */}
      <section className="space-y-4">
        <SectionHeader
          step="3"
          title="Who can actually access services?"
          subtitle="Facility availability only matters if people can reach and afford the care. Cost and appointment barriers are the hidden gap."
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <ChartCard title="Cost Distribution" insight="A large share of facilities have unknown cost data \u2014 itself a transparency gap worth closing." height={240} className="xl:col-span-5">
            <ResponsiveContainer>
              <BarChart data={costBrackets} margin={{ left: 0, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} strokeOpacity={0.6} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} angle={-15} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" name="Facilities" radius={[6, 6, 0, 0]}>
                  {costBrackets.map((entry, i) => (
                    <Cell key={i} fill={entry.name === 'Free' ? C.blue600 : entry.name === 'Unknown' ? C.slate300 : C.blue400} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Access Type Breakdown" insight="Walk-in and free is the most accessible combination. Appointment-only and paid creates the highest barrier." height={240} className="xl:col-span-4">
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

          <div className="xl:col-span-3 flex flex-col gap-3 justify-center">
            <StatCard value={facilities.filter((f) => f.appointment_required === 'No').length} label="Walk-in available" icon={Users} color={C.blue600} />
            <StatCard value={facilities.filter((f) => f.appointment_required === 'Yes').length} label="Appointment required" icon={Lock} color={C.amber} />
            <StatCard value={facilities.filter((f) => (f.cost || '').toLowerCase().includes('free')).length} label="Free services" icon={TrendingUp} color={C.blue700} />
            <StatCard value={facilities.filter((f) => f.origin === 'International').length} label="International organisations" icon={AlertTriangle} color={C.slate500} />
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── CHAPTER 4: DIVISION PROFILES ── */}
      <section className="space-y-4">
        <SectionHeader
          step="4"
          title="How do divisions compare overall?"
          subtitle="A multi-metric profile across the top 5 divisions. All axes normalised 0\u2013100 \u2014 higher is better on all dimensions."
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Division Profiles" insight="Coverage, Literacy, Low Poverty, Govt Share, Free Access \u2014 each 0\u2013100. Gaps between lines reveal where divisions fall short." height={340}>
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
                  <Radar key={d.name} name={d.name} dataKey={d.name} stroke={d.fill} fill={d.fill} fillOpacity={0.12} strokeWidth={2} />
                ))}
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4" style={{ overflowY: 'auto' }}>
            <h3 className="mb-1 text-sm font-semibold text-foreground">Division Summary</h3>
            <p className="mb-3 text-[11px] text-muted-foreground">All 8 divisions with facility counts by sector and focus area.</p>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  {['Division', 'Total', 'Govt', 'Free', 'Child'].map((h) => (
                    <th key={h} className={`pb-1.5 font-semibold text-muted-foreground ${h === 'Division' ? 'text-left' : 'text-right'}`}>{h}</th>
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
                    <td className="py-1.5 text-right" style={{ color: C.blue700 }}>{row.govt}</td>
                    <td className="py-1.5 text-right" style={{ color: C.blue500 }}>{row.free}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{row.child}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── CHAPTER 5: DISTRICT DEEP-DIVE ── */}
      <section className="space-y-4">
        <SectionHeader
          step="5"
          title="Compare any two districts"
          subtitle="Benchmark a district against another or against the national average to understand relative need and prioritise resource allocation."
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
              <option value="national">National Average</option>
              {sortedDistricts.map((d) => <option key={d.DIS_CODE} value={d.DIS_CODE}>{d.DIS_NAME}</option>)}
            </select>
            {(!compA || !compB) && <p className="text-[11px] text-muted-foreground">Select two districts \u2014 or one district vs National Average.</p>}
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
                      <div className="text-xl font-bold leading-tight" style={{ color: C.blue700 }}>{item.A}{item.unit}</div>
                    </div>
                    <div className="text-right">
                      <div className="truncate text-[10px] text-muted-foreground" style={{ maxWidth: 80 }}>{compB.DIS_NAME}</div>
                      <div className="text-xl font-bold leading-tight" style={{ color: C.blue400 }}>{item.B}{item.unit}</div>
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
