import { useMemo } from 'react';
import type { DistrictPop, Facility } from '@/types/dashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  ReferenceLine,
  Cell,
  LabelList,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

const CHART_COLORS = {
  underserved: '#ef4444',
  served: '#22c55e',
  neutral: '#3b82f6',
  accent: '#14b8a6',
  warning: '#f59e0b',
  mutedGrid: '#e5e7eb',
  mutedLine: '#94a3b8',
};

const DONUT_PALETTE = [
  '#3b82f6',
  '#14b8a6',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#22c55e',
  '#f97316',
  '#06b6d4',
];

interface InsightsProps {
  districts: DistrictPop[];
  facilities: Facility[];
}

function formatMillions(value: number) {
  if (!Number.isFinite(value)) return '0M';
  return `${value.toFixed(2)}M`;
}

function truncateLabel(label: string, max = 14) {
  if (!label) return 'Unknown';
  return label.length > max ? `${label.slice(0, max)}…` : label;
}

function getSeverity(per100k: number) {
  if (per100k <= 0.08) return { label: 'Critical', color: CHART_COLORS.underserved };
  if (per100k <= 0.18) return { label: 'High', color: '#f97316' };
  if (per100k <= 0.3) return { label: 'Moderate', color: CHART_COLORS.warning };
  return { label: 'Better', color: CHART_COLORS.served };
}

function countBy<T>(arr: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  arr.forEach((item) => {
    const k = (key(item) || 'Unknown').trim() || 'Unknown';
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
      {subtitle ? <p className="text-[11px] leading-4 text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function ChartCard({
  title,
  insight,
  children,
  height = 300,
  className = '',
}: {
  title: string;
  insight?: string;
  children: React.ReactNode;
  height?: number;
  className?: string;
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
  title,
  data,
  color,
}: {
  title: string;
  data: {
    name: string;
    value: number;
    populationM: number;
    severity: string;
    severityColor: string;
  }[];
  color: string;
}) {
  if (!data.length) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 0.01);

  return (
    <div className="dashboard-panel rounded-xl border border-border bg-card p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="text-[10px] text-muted-foreground">Compact district ranking</div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {data.map((d, i) => {
          const widthPct = (d.value / maxValue) * 100;

          return (
            <div
              key={d.name}
              className="rounded-lg border border-border bg-background px-2.5 py-2"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground">{d.name}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-7 text-[10px] text-muted-foreground">
                    <span className="rounded-md bg-muted px-1.5 py-0.5">
                      Pop: {d.populationM.toFixed(2)}M
                    </span>
                    <span
                      className="rounded-md px-1.5 py-0.5 text-white"
                      style={{ backgroundColor: d.severityColor }}
                    >
                      {d.severity}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs font-bold text-foreground">{d.value.toFixed(2)}</div>
                </div>
              </div>

              <div className="pl-7">
                <div className="h-1.5 w-full rounded-full bg-muted/80">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.max(widthPct, 10)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Lollipop chart for Facilities by District ─────────────────────────────────
function LollipopChart({
  data,
}: {
  data: { name: string; shortName: string; facilities: number; per100k: number }[];
}) {
  const max = Math.max(...data.map((d) => d.facilities), 1);

  return (
    <div className="flex h-full flex-col justify-between gap-1 overflow-hidden py-1">
      {data.map((d, i) => {
        const pct = (d.facilities / max) * 100;
        return (
          <div key={d.name} className="group flex items-center gap-2">
            {/* rank */}
            <span className="w-5 shrink-0 text-right text-[10px] font-semibold text-muted-foreground">
              {i + 1}
            </span>
            {/* label */}
            <span
              className="w-[88px] shrink-0 truncate text-right text-[10px] text-foreground"
              title={d.name}
            >
              {d.shortName}
            </span>
            {/* track + lollipop */}
            <div className="relative flex flex-1 items-center">
              <div className="h-[2px] w-full rounded-full bg-muted/60" />
              <div
                className="absolute h-[2px] rounded-full bg-blue-400 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div
                className="absolute h-3 w-3 rounded-full border-2 border-blue-500 bg-card transition-all"
                style={{ left: `calc(${pct}% - 6px)` }}
              />
            </div>
            {/* value */}
            <span className="w-7 shrink-0 text-left text-[10px] font-bold text-foreground">
              {d.facilities}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut chart for Ownership ─────────────────────────────────────────────────
const RADIAN = Math.PI / 180;
function CustomDonutLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function InsightsTab({ districts, facilities }: InsightsProps) {
  const districtBars = useMemo(
    () =>
      [...districts]
        .sort((a, b) => b.total_facilities - a.total_facilities)
        .slice(0, 15)
        .map((d) => ({
          name: d.DIS_NAME || 'Unknown',
          shortName: truncateLabel(d.DIS_NAME || 'Unknown', 12),
          facilities: d.total_facilities || 0,
          per100k: +(d.facilitiesPer100k || 0).toFixed(2),
        })),
    [districts]
  );

  const underserved = useMemo(
    () =>
      [...districts]
        .filter((d) => d.facilitiesPer100k !== undefined)
        .sort((a, b) => (a.facilitiesPer100k || 0) - (b.facilitiesPer100k || 0))
        .slice(0, 10)
        .map((d) => {
          const per100k = +(d.facilitiesPer100k || 0).toFixed(2);
          const sev = getSeverity(per100k);
          return {
            name: d.DIS_NAME || 'Unknown',
            value: per100k,
            populationM: +(d.Population / 1e6).toFixed(2),
            severity: sev.label,
            severityColor: sev.color,
          };
        }),
    [districts]
  );

  const bestServed = useMemo(
    () =>
      [...districts]
        .filter((d) => d.facilitiesPer100k !== undefined)
        .sort((a, b) => (b.facilitiesPer100k || 0) - (a.facilitiesPer100k || 0))
        .slice(0, 10)
        .map((d) => {
          const per100k = +(d.facilitiesPer100k || 0).toFixed(2);
          const sev = getSeverity(per100k);
          return {
            name: d.DIS_NAME || 'Unknown',
            value: per100k,
            populationM: +(d.Population / 1e6).toFixed(2),
            severity: sev.label,
            severityColor: sev.color,
          };
        }),
    [districts]
  );

  const populationMedian = useMemo(() => {
    const vals = districts
      .map((d) => d.Population / 1e6)
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);

    if (!vals.length) return 0;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
  }, [districts]);

  const coverageMedian = useMemo(() => {
    const vals = districts
      .map((d) => d.facilitiesPer100k || 0)
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);

    if (!vals.length) return 0;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
  }, [districts]);

  const facilityVsNeed = useMemo(() => {
    const points = districts.map((d) => {
      const population = +(d.Population / 1e6).toFixed(2);
      const per100k = +(d.facilitiesPer100k || 0).toFixed(2);
      const critical = population >= populationMedian && per100k <= coverageMedian;

      return {
        name: d.DIS_NAME || 'Unknown',
        population,
        per100k,
        poverty: d['Poverty Index'],
        facilities: d.total_facilities || 0,
        critical,
      };
    });

    const criticalSorted = [...points]
      .filter((d) => d.critical)
      .sort((a, b) => b.population - a.population || a.per100k - b.per100k)
      .slice(0, 10)
      .map((d) => ({ ...d, label: d.name }));

    const normal = points.filter((d) => !d.critical);

    return { critical: criticalSorted, normal };
  }, [districts, populationMedian, coverageMedian]);

  const facilityTypeDist = useMemo(
    () => countBy(facilities, (f) => f.facility_type).slice(0, 10),
    [facilities]
  );

  const ownershipDist = useMemo(
    () => countBy(facilities, (f) => f.ownership),
    [facilities]
  );

  const povertyScatter = useMemo(
    () =>
      districts.map((d) => ({
        name: d.DIS_NAME || 'Unknown',
        poverty: Number(d['Poverty Index']) || 0,
        per100k: +(d.facilitiesPer100k || 0).toFixed(2),
        facilities: d.total_facilities || 0,
        populationM: +(d.Population / 1e6).toFixed(2),
      })),
    [districts]
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="space-y-3">
        <SectionHeader
          title="Priority Districts"
          subtitle="Start with district-level extremes, then review the wider service gap pattern."
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RankingGrid
            title="Top 10 Underserved Districts"
            data={underserved}
            color={CHART_COLORS.underserved}
          />
          <RankingGrid
            title="Top 10 Best Served Districts"
            data={bestServed}
            color={CHART_COLORS.served}
          />
        </div>

        <ChartCard
          title="Service Gap Analysis"
          insight="Red points mark districts with above-median population and below-median facility coverage."
          height={340}
        >
          <ResponsiveContainer>
            <ScatterChart margin={{ left: 8, right: 18, top: 14, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.mutedGrid} strokeOpacity={0.6} />

              <ReferenceLine
                x={+populationMedian.toFixed(2)}
                stroke={CHART_COLORS.mutedLine}
                strokeDasharray="4 4"
                label={{ value: 'Median population', position: 'insideTopRight', fontSize: 10 }}
              />

              <ReferenceLine
                y={+coverageMedian.toFixed(2)}
                stroke={CHART_COLORS.mutedLine}
                strokeDasharray="4 4"
                label={{ value: 'Median coverage', position: 'insideTopLeft', fontSize: 10 }}
              />

              <XAxis
                type="number"
                dataKey="population"
                name="Population (M)"
                tick={{ fontSize: 10 }}
                label={{ value: 'Population (M)', position: 'bottom', fontSize: 10, offset: -4 }}
              />

              <YAxis
                type="number"
                dataKey="per100k"
                name="Facilities per 100K"
                tick={{ fontSize: 10 }}
                label={{
                  value: 'Facilities per 100K',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 10,
                }}
              />

              <Tooltip
                cursor={{ strokeDasharray: '4 4' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md">
                      <div className="font-semibold text-foreground">{d.name}</div>
                      <div className="text-muted-foreground">Population: {formatMillions(d.population)}</div>
                      <div className="text-muted-foreground">Coverage: {d.per100k} per 100K</div>
                      <div className="text-muted-foreground">Facilities: {d.facilities}</div>
                      {typeof d.poverty === 'number' && (
                        <div className="text-muted-foreground">Poverty Index: {d.poverty}</div>
                      )}
                      {d.critical && (
                        <div className="mt-1 font-medium text-red-600">Priority district</div>
                      )}
                    </div>
                  );
                }}
              />

              <Scatter
                data={facilityVsNeed.normal}
                fill={CHART_COLORS.neutral}
                shape={(props: any) => (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={5}
                    fill={CHART_COLORS.neutral}
                    fillOpacity={0.95}
                  />
                )}
              />

              <Scatter
                data={facilityVsNeed.critical}
                fill={CHART_COLORS.underserved}
                shape={(props: any) => (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={5.5}
                    fill={CHART_COLORS.underserved}
                    fillOpacity={0.95}
                  />
                )}
              >
                <LabelList dataKey="label" position="top" fontSize={10} />
              </Scatter>

              <LabelList />
            </ScatterChart>
          </ResponsiveContainer>

          <div className="mt-2 grid grid-cols-1 gap-2 text-[10px] text-muted-foreground md:grid-cols-2">
            <div className="rounded-md bg-muted/40 px-2 py-1">
              <span className="font-medium text-foreground">High Pop, Low Coverage:</span> Priority districts for action
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1">
              <span className="font-medium text-foreground">Low Pop, High Coverage:</span> Relatively better served areas
            </div>
          </div>
        </ChartCard>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="System Overview"
          subtitle="These charts show where facilities are concentrated and how the service system is structured."
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* ── Lollipop: Facilities by District (Top 15) ── */}
          <ChartCard
            title="Facilities by District (Top 15)"
            insight="Ranked by total facility count — hover a row for coverage detail."
            height={340}
            className="xl:col-span-5"
          >
            <LollipopChart data={districtBars} />
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 xl:col-span-7 xl:grid-cols-2">
            {/* ── Facility Type Distribution ── */}
            <ChartCard
              title="Facility Type Distribution"
              insight="Horizontal bars make smaller categories easier to compare."
              height={340}
            >
              <ResponsiveContainer>
                <BarChart
                  data={facilityTypeDist}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.mutedGrid} strokeOpacity={0.6} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => truncateLabel(v, 18)}
                  />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill={CHART_COLORS.neutral} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* ── Donut: Ownership Distribution ── */}
            <ChartCard
              title="Ownership Distribution"
              insight="Share of facilities by ownership type."
              height={340}
            >
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={ownershipDist}
                    cx="50%"
                    cy="45%"
                    innerRadius="40%"
                    outerRadius="68%"
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={CustomDonutLabel}
                  >
                    {ownershipDist.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DONUT_PALETTE[index % DONUT_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      const total = ownershipDist.reduce((s, i) => s + i.value, 0);
                      const pct = total ? ((d.value as number / total) * 100).toFixed(1) : '0';
                      return (
                        <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md">
                          <div className="font-semibold text-foreground">{d.name}</div>
                          <div className="text-muted-foreground">
                            {d.value} facilities ({pct}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                    formatter={(value) => truncateLabel(value, 20)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Access & Inequality"
          subtitle="These views help explain whether poverty and service targeting align with access patterns."
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <ChartCard
            title="Poverty Index vs Facilities Per 100K"
            insight="Use this to check whether poorer districts also face lower service density."
            height={300}
            className="xl:col-span-12"
          >
            <ResponsiveContainer>
              <ScatterChart margin={{ left: 0, right: 10, top: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.mutedGrid} strokeOpacity={0.6} />
                <XAxis
                  type="number"
                  dataKey="poverty"
                  name="Poverty Index"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Poverty Index', position: 'bottom', fontSize: 10, offset: -5 }}
                />
                <YAxis
                  type="number"
                  dataKey="per100k"
                  name="Per 100K"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Per 100K', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md">
                        <div className="font-semibold text-foreground">{d.name}</div>
                        <div className="text-muted-foreground">Poverty Index: {d.poverty}</div>
                        <div className="text-muted-foreground">Coverage: {d.per100k} per 100K</div>
                        <div className="text-muted-foreground">Population: {d.populationM}M</div>
                        <div className="text-muted-foreground">Facilities: {d.facilities}</div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={povertyScatter}
                  fill={CHART_COLORS.neutral}
                  shape={(props: any) => (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill={CHART_COLORS.neutral}
                      fillOpacity={0.95}
                    />
                  )}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
