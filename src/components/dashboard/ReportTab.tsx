import { useState, useMemo, useEffect } from 'react';
import {
  FileText, Globe, LayoutList, PenLine, MapPin, AlertTriangle,
  Activity, Building2, Lock, Layers, ChevronDown, Search, X,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { DistrictPop, Facility } from '@/types/dashboard';

interface ReportTabProps { districts: DistrictPop[]; facilities: Facility[]; }

/* ───── helpers ───────────────────────────────────────── */
function parseCostBracket(cost: string): string {
  if (!cost) return 'Unknown';
  const l = cost.toLowerCase();
  if (l.includes('free')) return 'Free';
  const nums = cost.match(/\d+/g);
  if (!nums) return 'Unknown';
  const avg = nums.reduce((s, n) => s + parseInt(n), 0) / nums.length;
  return avg < 100 ? '1–99 BDT' : avg < 500 ? '100–499 BDT' : avg < 1000 ? '500–999 BDT' : '1000+ BDT';
}

function severity(p: number) {
  return p <= 0.08 ? { label: 'Critical', cls: 'bg-red-100 text-red-700' }
    : p <= 0.18 ? { label: 'High Gap', cls: 'bg-amber-100 text-amber-700' }
    : p <= 0.30 ? { label: 'Moderate', cls: 'bg-blue-100 text-blue-700' }
    : { label: 'Adequate', cls: 'bg-green-100 text-green-700' };
}

function fmtPop(n: number) {
  return n >= 1e6 ? (n / 1e6).toFixed(2) + 'm' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

interface DivRow { name: string; total: number; govt: number; priv: number; free: number; child: number; avgPer100k: number; districtCount: number; }
interface ScoredD extends DistrictPop { score: number; }
interface ComputedReport {
  hasData: boolean; isFiltered: boolean; scopeLabel: string; scopePct: string;
  totalFacilities: number; totalPop: number; natAvgPer100k: number;
  districtsWithFacilities: number;
  govtCount: number; govtPct: string; privCount: number; privPct: string;
  freeCount: number; freePct: string; criticalCount: number;
  walkinCount: number; walkinPct: string; apptCount: number; walkinFreeCount: number;
  unknownCostCount: number; unknownCostPct: string;
  medianPer100k: number; belowMedianCount: number;
  findings: string[];
  bottom10: DistrictPop[]; top10: ScoredD[];
  divRows: DivRow[]; costBrackets: Record<string, number>;
  topDiv: DivRow | null; topGovtDiv: DivRow | null; topFreeDiv: DivRow | null; lowestDiv: DivRow | null;
  coveredDivisions: number;
}

function computeReport(sd: DistrictPop[], sf: Facility[], allF: Facility[], scopeLabel: string): ComputedReport {
  const isFiltered = scopeLabel !== 'All Bangladesh';
  if (!sf.length || !sd.length) return { hasData: false, isFiltered, scopeLabel } as ComputedReport;

  const tot = sf.length;
  const pop = sd.reduce((s, d) => s + d.Population, 0);
  const avg = pop > 0 ? (tot / pop) * 100000 : 0;
  const scopePct = allF.length ? ((tot / allF.length) * 100).toFixed(0) : '0';
  const withFac = sd.filter(d => d.total_facilities > 0).length;
  const govt = sf.filter(f => f.ownership === 'Government').length;
  const gPct = ((govt / tot) * 100).toFixed(0);
  const priv = tot - govt;
  const pPct = (100 - Number(gPct)).toFixed(0);
  const free = sf.filter(f => (f.cost || '').toLowerCase().includes('free')).length;
  const fPct = ((free / tot) * 100).toFixed(0);
  const crit = sd.filter(d => (d.facilitiesPer100k || 0) <= 0.08).length;
  const walkin = sf.filter(f => f.appointment_required === 'No').length;
  const wPct = ((walkin / tot) * 100).toFixed(0);
  const appt = sf.filter(f => f.appointment_required === 'Yes').length;
  const wf = sf.filter(f => f.appointment_required === 'No' && (f.cost || '').toLowerCase().includes('free')).length;
  const unk = sf.filter(f => { const c = (f.cost || '').toLowerCase().trim(); return !c || c === 'unknown' || c === 'n/a'; }).length;
  const uPct = ((unk / tot) * 100).toFixed(0);

  const s100k = [...sd].map(d => d.facilitiesPer100k || 0).sort((a, b) => a - b);
  const mid = Math.floor(s100k.length / 2);
  const median = s100k.length % 2 === 0 ? (s100k[mid - 1] + s100k[mid]) / 2 : s100k[mid];
  const belowMed = sd.filter(d => (d.facilitiesPer100k || 0) < median).length;

  const bottom10 = [...sd].sort((a, b) => (a.facilitiesPer100k || 0) - (b.facilitiesPer100k || 0)).slice(0, 10);
  const worst = bottom10[0];

  const findings = [
    `${crit} of ${sd.length} district(s) have fewer than 0.1 facilities per 100,000 people (scope average: ${avg.toFixed(2)}/100K).`,
    `${worst?.DIS_NAME} is the most underserved — ${worst?.total_facilities} facilit${worst?.total_facilities === 1 ? 'y' : 'ies'} for ${fmtPop(worst?.Population || 0)} people (${(worst?.facilitiesPer100k || 0).toFixed(2)}/100K).`,
    `${pPct}% of facilities are private; government provision is only ${gPct}%, raising equity concerns for low-income populations.`,
    `Only ${wf} facilit${wf === 1 ? 'y' : 'ies'} (${((wf / tot) * 100).toFixed(0)}%) offer both walk-in access and free care — the minimum-barrier pathway.`,
    `Cost data is missing for ${unk} facilit${unk === 1 ? 'y' : 'ies'} (${uPct}%), limiting patients' ability to assess affordability.`,
  ];

  const maxP = Math.max(...sd.map(d => d.facilitiesPer100k || 0));
  const maxPop = Math.max(...sd.map(d => d.Population));
  const maxPov = Math.max(...sd.map(d => d['Poverty Index']));
  const top10: ScoredD[] = [...sd].map(d => {
    const cg = maxP > 0 ? 1 - (d.facilitiesPer100k || 0) / maxP : 1;
    const pn = maxPop > 0 ? d.Population / maxPop : 0;
    const vn = maxPov > 0 ? d['Poverty Index'] / maxPov : 0;
    return { ...d, score: cg * 0.5 + pn * 0.3 + vn * 0.2 };
  }).sort((a, b) => b.score - a.score).slice(0, 10);

  const divNames = [...new Set(sd.map(d => d.DIV_NAME))];
  const divRows: DivRow[] = divNames.map(name => {
    const dd = sd.filter(d => d.DIV_NAME === name);
    const df = sf.filter(f => f.DIV_NAME === name);
    const g = df.filter(f => f.ownership === 'Government').length;
    const fr = df.filter(f => (f.cost || '').toLowerCase().includes('free')).length;
    const ch = df.filter(f => (f.category_adult_child_both || '').includes('Child')).length;
    const a = dd.length ? dd.reduce((s, d) => s + (d.facilitiesPer100k || 0), 0) / dd.length : 0;
    return { name, total: df.length, govt: g, priv: df.length - g, free: fr, child: ch, avgPer100k: a, districtCount: dd.length };
  }).sort((a, b) => b.total - a.total);

  const brackets = ['Free', '1–99 BDT', '100–499 BDT', '500–999 BDT', '1000+ BDT', 'Unknown'];
  const costBrackets: Record<string, number> = {};
  brackets.forEach(b => { costBrackets[b] = 0; });
  sf.forEach(f => { const b = parseCostBracket(f.cost); costBrackets[b] = (costBrackets[b] || 0) + 1; });

  const covDiv = divRows.filter(r => r.total > 0).length;
  const topDiv = divRows[0] ?? null;
  const topGovtDiv = divRows.length ? [...divRows].sort((a, b) => (b.govt / b.total) - (a.govt / a.total))[0] : null;
  const topFreeDiv = divRows.length ? [...divRows].sort((a, b) => (b.free / b.total) - (a.free / a.total))[0] : null;
  const lowestDiv = divRows.length ? [...divRows].sort((a, b) => a.avgPer100k - b.avgPer100k)[0] : null;

  return {
    hasData: true, isFiltered, scopeLabel, scopePct,
    totalFacilities: tot, totalPop: pop, natAvgPer100k: avg, districtsWithFacilities: withFac,
    govtCount: govt, govtPct: gPct, privCount: priv, privPct: pPct,
    freeCount: free, freePct: fPct, criticalCount: crit,
    walkinCount: walkin, walkinPct: wPct, apptCount: appt, walkinFreeCount: wf,
    unknownCostCount: unk, unknownCostPct: uPct,
    medianPer100k: median, belowMedianCount: belowMed,
    findings, bottom10, top10, divRows, costBrackets,
    coveredDivisions: covDiv, topDiv, topGovtDiv, topFreeDiv, lowestDiv,
  };
}

const SECTIONS: { key: string; icon: any; title: string; desc: string }[] = [
  { key: 'summary',    icon: Activity,       title: 'Executive Summary', desc: 'Headline metrics and key findings' },
  { key: 'coverage',   icon: MapPin,         title: 'Coverage & Gaps',   desc: 'Underserved districts ranked' },
  { key: 'structure',  icon: Building2,      title: 'System Structure',  desc: 'Govt vs private breakdown' },
  { key: 'access',     icon: Lock,           title: 'Access Barriers',   desc: 'Walk-in, cost, appointment' },
  { key: 'priorities', icon: AlertTriangle,  title: 'Priority Districts',desc: 'Composite need ranking' },
  { key: 'divisions',  icon: Layers,         title: 'Division Profiles', desc: 'Per-division summary' },
];

export default function ReportTab({ districts, facilities }: ReportTabProps) {
  const [phase, setPhase] = useState<'builder' | 'report'>('builder');
  const [reportData, setReportData] = useState<ComputedReport | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [selectedSections, setSelectedSections] = useState(
    new Set(['summary', 'coverage', 'structure', 'access', 'priorities', 'divisions'])
  );
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [districtSearch, setDistrictSearch] = useState('');
  const [divOpen, setDivOpen] = useState(true);
  const [disOpen, setDisOpen] = useState(false);

  const allDivisions = useMemo(
    () => [...new Set(districts.map(d => d.DIV_NAME))].sort(),
    [districts]
  );

  useEffect(() => {
    if (!selectedDivisions.length) return;
    const valid = new Set(districts.filter(d => selectedDivisions.includes(d.DIV_NAME)).map(d => d.DIS_CODE));
    setSelectedDistricts(p => p.filter(c => valid.has(c)));
  }, [selectedDivisions, districts]);

  const availableDistricts = useMemo(() => (
    selectedDivisions.length
      ? districts.filter(d => selectedDivisions.includes(d.DIV_NAME)).sort((a, b) => a.DIS_NAME.localeCompare(b.DIS_NAME))
      : [...districts].sort((a, b) => a.DIS_NAME.localeCompare(b.DIS_NAME))
  ), [districts, selectedDivisions]);

  const filteredDistricts = useMemo(
    () => availableDistricts.filter(d => d.DIS_NAME.toLowerCase().includes(districtSearch.toLowerCase())),
    [availableDistricts, districtSearch]
  );

  const scopedDistricts = useMemo(() => (
    (selectedDivisions.length || selectedDistricts.length)
      ? districts.filter(d => {
          const divOk = !selectedDivisions.length || selectedDivisions.includes(d.DIV_NAME);
          const disOk = !selectedDistricts.length || selectedDistricts.includes(d.DIS_CODE);
          return divOk && disOk;
        })
      : districts
  ), [districts, selectedDivisions, selectedDistricts]);

  const scopedFacilities = useMemo(() => (
    (selectedDivisions.length || selectedDistricts.length)
      ? facilities.filter(f => {
          const divOk = !selectedDivisions.length || selectedDivisions.includes(f.DIV_NAME);
          const disOk = !selectedDistricts.length || selectedDistricts.includes(f.DIS_CODE);
          return divOk && disOk;
        })
      : facilities
  ), [facilities, selectedDivisions, selectedDistricts]);

  const scopeLabel = useMemo(() => {
    if (!selectedDivisions.length && !selectedDistricts.length) return 'All Bangladesh';
    if (selectedDistricts.length === 1) return districts.find(d => d.DIS_CODE === selectedDistricts[0])?.DIS_NAME ?? '1 District';
    if (selectedDistricts.length > 1) return `${selectedDistricts.length} Districts`;
    if (selectedDivisions.length === 1) return `${selectedDivisions[0]} Division`;
    return `${selectedDivisions.length} Divisions`;
  }, [selectedDivisions, selectedDistricts, districts]);

  const isFiltered = scopeLabel !== 'All Bangladesh';
  const isEmpty = !scopedFacilities.length || !scopedDistricts.length;

  useEffect(() => {
    setReportTitle(
      !isFiltered
        ? 'Mental Health Facility System — Bangladesh: National Overview'
        : `Mental Health Facility System — ${scopeLabel}`
    );
  }, [scopeLabel, isFiltered]);

  /* print css */
  useEffect(() => {
    if (phase !== 'report') return;
    const id = 'mhfe-print';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    el.textContent = `@media print{
      body>*{display:none!important;}
      #mhfe-report-root{display:block!important;}
      .no-print{display:none!important;}
      table,tr{page-break-inside:avoid;}
      .bg-blue-50,.bg-amber-50,.bg-slate-50,.bg-red-100,.bg-amber-100,.bg-blue-100,.bg-green-100{
        -webkit-print-color-adjust:exact;print-color-adjust:exact;}
    }`;
    return () => { document.getElementById(id)?.remove(); };
  }, [phase]);

  const toggleDivision = (name: string) => {
    setSelectedDivisions(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
  };
  const toggleDistrict = (code: string) => {
    setSelectedDistricts(p => p.includes(code) ? p.filter(x => x !== code) : [...p, code]);
  };
  const toggleSection = (key: string) => {
    setSelectedSections(p => {
      const n = new Set(p);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const handleGenerate = () => {
    setReportData(computeReport(scopedDistricts, scopedFacilities, facilities, scopeLabel));
    setPhase('report');
  };

  /* ─────────── REPORT PHASE ─────────── */
  if (phase === 'report' && reportData) {
    const rd = reportData;
    let secNum = 0;
    const nextNum = () => ++secNum;
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
      <div>
        {/* Sticky controls */}
        <div className="no-print sticky top-[52px] z-10 bg-card/90 backdrop-blur border border-border rounded-xl px-4 py-2 flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setPhase('builder')}
            className="text-sm text-slate-600 hover:text-slate-900 font-medium"
          >
            ← Back to Builder
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Print / Save as PDF
          </button>
        </div>

        <div id="mhfe-report-root" className="max-w-[800px] mx-auto bg-white rounded-2xl shadow-xl p-10 my-6">
          {/* Cover */}
          <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 mb-5" />
          <p className="text-[10px] font-semibold tracking-[0.15em] text-blue-700 uppercase mb-2">
            District-level decision support · Bangladesh
          </p>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{reportTitle}</h1>
          <div className="mt-3 text-[12px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
            <span>Generated: {today}</span>
            {preparedBy && <span>Prepared by: {preparedBy}</span>}
          </div>
          {rd.isFiltered && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium rounded-full px-3 py-1">
              <MapPin className="h-3 w-3" /> Scope: {rd.scopeLabel}
            </div>
          )}
          <div className="border-b border-slate-200 mt-5 mb-7" />

          {!rd.hasData && (
            <p className="text-sm text-slate-500">No data available for the selected scope.</p>
          )}

          {/* SUMMARY */}
          {rd.hasData && selectedSections.has('summary') && (
            <section>
              <SectionHeader num={nextNum()} title="Executive Summary" />
              {rd.isFiltered && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex gap-2 text-[12px] text-slate-700">
                  <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  <span>This report covers {scopedDistricts.length} district{scopedDistricts.length === 1 ? '' : 's'} and {rd.totalFacilities} facilities, representing {rd.scopePct}% of all mapped facilities nationally.</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Stat label="Total Facilities" value={rd.totalFacilities.toString()} />
                <Stat label="Districts with Facilities" value={`${rd.districtsWithFacilities} / ${scopedDistricts.length}`} />
                <Stat label="Govt Facilities" value={`${rd.govtCount} (${rd.govtPct}%)`} />
                <Stat label="Free Services" value={`${rd.freeCount} (${rd.freePct}%)`} />
                <Stat label="Critical Districts" value={rd.criticalCount.toString()} />
                <Stat label="Avg per 100K" value={rd.natAvgPer100k.toFixed(2)} />
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                <p className="text-[11px] font-semibold tracking-wider text-blue-700 uppercase mb-2">Key Findings</p>
                <ul className="space-y-1.5 text-[12px] text-slate-700 list-disc list-inside">
                  {rd.findings.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            </section>
          )}

          {rd.hasData && selectedSections.has('summary') && selectedSections.has('coverage') && (
            <div className="border-b border-slate-100 my-8" />
          )}

          {/* COVERAGE */}
          {rd.hasData && selectedSections.has('coverage') && (
            <section>
              <SectionHeader num={nextNum()} title="Coverage & Gaps" />
              <p className="text-[12px] text-slate-600 leading-relaxed mb-3">
                Within {rd.scopeLabel}, {rd.belowMedianCount} of {scopedDistricts.length} districts fall below the median of {rd.medianPer100k.toFixed(2)} facilities per 100,000 people. The 10 most underserved districts are listed below.
              </p>
              <SimpleTable
                headers={['#', 'District', 'Division', 'Population', 'Facilities', 'Per 100K', 'Status']}
                rows={rd.bottom10.map((d, i) => {
                  const sev = severity(d.facilitiesPer100k || 0);
                  return [
                    String(i + 1),
                    d.DIS_NAME,
                    d.DIV_NAME,
                    fmtPop(d.Population),
                    String(d.total_facilities),
                    (d.facilitiesPer100k || 0).toFixed(2),
                    <span key="s" className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${sev.cls}`}>{sev.label}</span>,
                  ];
                })}
              />
            </section>
          )}

          {rd.hasData && selectedSections.has('coverage') && selectedSections.has('structure') && (
            <div className="border-b border-slate-100 my-8" />
          )}

          {/* STRUCTURE */}
          {rd.hasData && selectedSections.has('structure') && (
            <section>
              <SectionHeader num={nextNum()} title="System Structure" />
              <p className="text-[12px] text-slate-600 leading-relaxed mb-3">
                Of the {rd.totalFacilities} facilities across {rd.coveredDivisions} division{rd.coveredDivisions === 1 ? '' : 's'}, {rd.govtPct}% are government-run and {rd.privPct}% are private. {rd.topDiv?.name ?? '—'} hosts the largest share with {rd.topDiv?.total ?? 0} facilities.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Stat label="Government" value={`${rd.govtCount} (${rd.govtPct}%)`} />
                <Stat label="Private" value={`${rd.privCount} (${rd.privPct}%)`} />
              </div>
              <div className="flex h-3 rounded-full overflow-hidden mb-5 border border-slate-200">
                <div className="bg-blue-600" style={{ width: `${rd.govtPct}%` }} />
                <div className="bg-blue-300" style={{ width: `${rd.privPct}%` }} />
              </div>
              <SimpleTable
                headers={['Division', 'Total', 'Govt', 'Private', 'Free', 'Child']}
                rows={rd.divRows.map(r => [r.name, String(r.total), String(r.govt), String(r.priv), String(r.free), String(r.child)])}
              />
            </section>
          )}

          {rd.hasData && selectedSections.has('structure') && selectedSections.has('access') && (
            <div className="border-b border-slate-100 my-8" />
          )}

          {/* ACCESS */}
          {rd.hasData && selectedSections.has('access') && (
            <section>
              <SectionHeader num={nextNum()} title="Access Barriers" />
              <p className="text-[12px] text-slate-600 leading-relaxed mb-3">
                {rd.walkinPct}% of facilities accept walk-ins, {rd.freePct}% offer free services, and only {rd.walkinFreeCount} combine both — the minimum-barrier access pathway.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Stat label="Walk-in Available" value={`${rd.walkinCount} (${rd.walkinPct}%)`} />
                <Stat label="Appointment Required" value={String(rd.apptCount)} />
                <Stat label="Free Services" value={`${rd.freeCount} (${rd.freePct}%)`} />
                <Stat label="Cost Unknown" value={`${rd.unknownCostCount} (${rd.unknownCostPct}%)`} />
              </div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-2">Cost Distribution</p>
              <div className="space-y-1.5">
                {(['Free', '1–99 BDT', '100–499 BDT', '500–999 BDT', '1000+ BDT', 'Unknown'] as const).map(b => {
                  const v = rd.costBrackets[b] || 0;
                  const pct = rd.totalFacilities ? (v / rd.totalFacilities) * 100 : 0;
                  return (
                    <div key={b} className="flex items-center gap-2 text-[11px]">
                      <span className="w-24 text-slate-600">{b}</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-right text-slate-700 tabular-nums">{v} ({pct.toFixed(0)}%)</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {rd.hasData && selectedSections.has('access') && selectedSections.has('priorities') && (
            <div className="border-b border-slate-100 my-8" />
          )}

          {/* PRIORITIES */}
          {rd.hasData && selectedSections.has('priorities') && (
            <section>
              <SectionHeader num={nextNum()} title="Priority Districts" />
              <p className="text-[12px] text-slate-600 leading-relaxed mb-3">
                Need score = 0.5 × coverage gap + 0.3 × normalized population + 0.2 × normalized poverty. Higher scores indicate greater unmet need.
              </p>
              <SimpleTable
                headers={['#', 'District', 'Division', 'Pop (M)', 'Per 100K', 'Poverty', 'Score', 'Priority']}
                rows={rd.top10.map((d, i) => {
                  const rank = i + 1;
                  const scoreCls = rank <= 3 ? 'text-red-600 font-semibold'
                    : rank <= 7 ? 'text-amber-600 font-semibold'
                    : 'text-slate-600';
                  const pri = rank <= 3 ? { l: 'Urgent', c: 'bg-red-100 text-red-700' }
                    : rank <= 7 ? { l: 'High', c: 'bg-amber-100 text-amber-700' }
                    : { l: 'Moderate', c: 'bg-blue-100 text-blue-700' };
                  return [
                    String(rank),
                    d.DIS_NAME,
                    d.DIV_NAME,
                    (d.Population / 1e6).toFixed(2),
                    (d.facilitiesPer100k || 0).toFixed(2),
                    d['Poverty Index'].toFixed(2),
                    <span key="sc" className={scoreCls}>{d.score.toFixed(3)}</span>,
                    <span key="pr" className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${pri.c}`}>{pri.l}</span>,
                  ];
                })}
              />
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-[12px] text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>These districts should be prioritized for new facility allocation, mobile outreach, or telehealth expansion.</span>
              </div>
            </section>
          )}

          {rd.hasData && selectedSections.has('priorities') && selectedSections.has('divisions') && (
            <div className="border-b border-slate-100 my-8" />
          )}

          {/* DIVISIONS */}
          {rd.hasData && selectedSections.has('divisions') && (
            <section>
              <SectionHeader num={nextNum()} title="Division Profiles" />
              <p className="text-[12px] text-slate-600 leading-relaxed mb-3">
                {rd.isFiltered
                  ? `The ${rd.divRows.length} division${rd.divRows.length === 1 ? '' : 's'} in scope show varying patterns of provision. `
                  : `Bangladesh's 8 divisions show varying patterns of provision. `}
                {rd.topGovtDiv && <>{rd.topGovtDiv.name} has the largest government share. </>}
                {rd.topFreeDiv && <>{rd.topFreeDiv.name} offers the highest proportion of free care. </>}
                {rd.lowestDiv && <>{rd.lowestDiv.name} has the lowest average per-100K coverage.</>}
              </p>
              <SimpleTable
                headers={['Division', 'Districts', 'Total', 'Govt', 'Govt %', 'Free', 'Child', 'Avg/100K', 'Profile']}
                rows={rd.divRows.map(r => {
                  let prof = { l: 'Mixed', c: 'bg-slate-100 text-slate-700' };
                  if (rd.lowestDiv && r.name === rd.lowestDiv.name) prof = { l: 'Underserved', c: 'bg-red-100 text-red-700' };
                  else if (rd.topGovtDiv && r.name === rd.topGovtDiv.name) prof = { l: 'Govt-led', c: 'bg-blue-100 text-blue-700' };
                  else if (rd.topFreeDiv && r.name === rd.topFreeDiv.name) prof = { l: 'Accessible', c: 'bg-green-100 text-green-700' };
                  const govtPct = r.total ? ((r.govt / r.total) * 100).toFixed(0) + '%' : '—';
                  return [
                    r.name,
                    String(r.districtCount),
                    String(r.total),
                    String(r.govt),
                    govtPct,
                    String(r.free),
                    String(r.child),
                    r.avgPer100k.toFixed(2),
                    <span key="p" className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${prof.c}`}>{prof.l}</span>,
                  ];
                })}
              />
            </section>
          )}

          <div className="border-t border-slate-100 mt-10 pt-4 flex justify-between text-[10px] text-slate-400">
            <span>Mental Health Facility Explorer</span>
            <span>Generated {today}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────── BUILDER PHASE ─────────── */
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Build Your Report</h2>
          <p className="text-sm text-muted-foreground">Generate a PDF-ready, decision-support report scoped to your area of interest.</p>
        </div>
      </div>

      {/* A — Scope */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-foreground">Geographic scope</span>
          </div>
          <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-[11px] text-blue-700">
            <MapPin className="h-3 w-3" /> {scopeLabel}
          </span>
        </div>

        {/* Divisions */}
        <button
          type="button"
          onClick={() => setDivOpen(o => !o)}
          className="w-full flex items-center justify-between text-[12px] font-semibold text-slate-700 mb-2"
        >
          <span>Divisions {selectedDivisions.length ? `(${selectedDivisions.length})` : ''}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${divOpen ? 'rotate-180' : ''}`} />
        </button>
        {divOpen && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-1.5">
              {allDivisions.map(name => {
                const sel = selectedDivisions.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleDivision(name)}
                    className={`text-[12px] rounded-full px-3 py-1.5 border transition-colors ${
                      sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            {selectedDivisions.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedDivisions([])}
                className="mt-2 text-[11px] text-blue-600 hover:underline"
              >
                Clear all divisions
              </button>
            )}
          </div>
        )}

        {/* Districts */}
        <button
          type="button"
          onClick={() => setDisOpen(o => !o)}
          className="w-full flex items-center justify-between text-[12px] font-semibold text-slate-700 mb-2"
        >
          <span>Districts {selectedDistricts.length ? `(${selectedDistricts.length})` : ''}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${disOpen ? 'rotate-180' : ''}`} />
        </button>
        {disOpen && (
          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={districtSearch}
                  onChange={e => setDistrictSearch(e.target.value)}
                  placeholder="Search districts..."
                  className="w-full pl-7 pr-7 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                {districtSearch && (
                  <button type="button" onClick={() => setDistrictSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedDistricts.length === filteredDistricts.length) setSelectedDistricts([]);
                  else setSelectedDistricts(filteredDistricts.map(d => d.DIS_CODE));
                }}
                className="text-[11px] text-blue-600 hover:underline whitespace-nowrap"
              >
                {selectedDistricts.length === filteredDistricts.length && filteredDistricts.length > 0 ? 'Clear' : 'Select all'}
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto border border-slate-100 rounded-lg p-2">
              {filteredDistricts.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-3">No districts found</p>
              )}
              {selectedDivisions.length > 1 ? (
                selectedDivisions.map(div => {
                  const inDiv = filteredDistricts.filter(d => d.DIV_NAME === div);
                  if (!inDiv.length) return null;
                  return (
                    <div key={div} className="mb-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1 px-1">{div}</p>
                      {inDiv.map(d => (
                        <label key={d.DIS_CODE} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-50 cursor-pointer">
                          <Checkbox
                            checked={selectedDistricts.includes(d.DIS_CODE)}
                            onCheckedChange={() => toggleDistrict(d.DIS_CODE)}
                          />
                          <span className="text-[12px] text-slate-700">{d.DIS_NAME}</span>
                        </label>
                      ))}
                    </div>
                  );
                })
              ) : (
                filteredDistricts.map(d => (
                  <label key={d.DIS_CODE} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-50 cursor-pointer">
                    <Checkbox
                      checked={selectedDistricts.includes(d.DIS_CODE)}
                      onCheckedChange={() => toggleDistrict(d.DIS_CODE)}
                    />
                    <span className="text-[12px] text-slate-700">{d.DIS_NAME}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-[12px] text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>No facilities or districts in current scope. Adjust your selection.</span>
          </div>
        )}
      </div>

      {/* B — Sections */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <LayoutList className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-foreground">Sections</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS.map(s => {
            const active = selectedSections.has(s.key);
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSection(s.key)}
                aria-pressed={active}
                className={`text-left border rounded-xl p-3 transition-colors ${
                  active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`} />
                  <div>
                    <p className={`text-[13px] font-semibold ${active ? 'text-blue-900' : 'text-slate-800'}`}>{s.title}</p>
                    <p className="text-[11px] text-slate-500 leading-snug">{s.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* C — Details */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-foreground">Details</span>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title</label>
          <input
            type="text"
            value={reportTitle}
            onChange={e => setReportTitle(e.target.value)}
            className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prepared by</label>
          <input
            type="text"
            value={preparedBy}
            onChange={e => setPreparedBy(e.target.value)}
            placeholder="Name or organisation — optional"
            className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="text-[11px] text-slate-500">
          Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <button
        type="button"
        disabled={isEmpty || selectedSections.size === 0}
        onClick={handleGenerate}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-colors"
      >
        Generate Report
      </button>
    </div>
  );
}

/* ───── small subcomponents ───────────────────────────── */
function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="h-7 w-7 rounded-full bg-blue-600 text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">
          {num}
        </span>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      <div className="h-px bg-slate-100" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-xl p-3">
      <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-1">{label}</p>
      <p className="text-base font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | JSX.Element)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map((h, i) => (
              <th key={i} className="text-left font-semibold text-slate-700 px-2 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              {r.map((c, j) => (
                <td key={j} className="px-2 py-1.5 text-slate-700 align-middle">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
