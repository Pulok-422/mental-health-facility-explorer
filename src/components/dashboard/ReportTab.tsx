import { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText, Globe, LayoutList, MapPin, AlertTriangle,
  Activity, Building2, Lock, Layers, ChevronDown, Search, X,
  Download,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { DistrictPop, Facility } from '@/types/dashboard';

interface ReportTabProps { districts: DistrictPop[]; facilities: Facility[]; }

/* ─── helpers ─────────────────────────────────────────────────────────────── */
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

/* ─── types ───────────────────────────────────────────────────────────────── */
interface DivRow {
  name: string; total: number; govt: number; priv: number;
  free: number; child: number; avgPer100k: number; districtCount: number;
}
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

/* ─── computeReport ───────────────────────────────────────────────────────── */
function computeReport(
  sd: DistrictPop[], sf: Facility[], allF: Facility[], scopeLabel: string
): ComputedReport {
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

const SECTIONS = [
  { key: 'summary',    icon: Activity,      title: 'Executive Summary', desc: 'Headline metrics and key findings' },
  { key: 'coverage',   icon: MapPin,        title: 'Coverage & Gaps',   desc: 'Underserved districts ranked' },
  { key: 'structure',  icon: Building2,     title: 'System Structure',  desc: 'Govt vs private breakdown' },
  { key: 'access',     icon: Lock,          title: 'Access Barriers',   desc: 'Walk-in, cost, appointment' },
  { key: 'priorities', icon: AlertTriangle, title: 'Priority Districts',desc: 'Composite need ranking' },
  { key: 'divisions',  icon: Layers,        title: 'Division Profiles', desc: 'Per-division summary' },
];

/* ─── PDF download via html2pdf ───────────────────────────────────────────── */
async function downloadAsPdf(element: HTMLElement, filename: string) {
  // Dynamically load html2pdf.js from CDN if not already present
  if (!(window as any).html2pdf) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load html2pdf'));
      document.head.appendChild(s);
    });
  }
  const opt = {
    margin: [10, 10, 10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };
  await (window as any).html2pdf().set(opt).from(element).save();
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function ReportTab({ districts, facilities }: ReportTabProps) {
  const [phase, setPhase] = useState<'builder' | 'report'>('builder');
  const [reportData, setReportData] = useState<ComputedReport | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [selectedSections, setSelectedSections] = useState(
    new Set(['summary', 'coverage', 'structure', 'access', 'priorities', 'divisions'])
  );
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [districtSearch, setDistrictSearch] = useState('');
  const [divOpen, setDivOpen] = useState(true);
  const [disOpen, setDisOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const allDivisions = useMemo(
    () => [...new Set(districts.map(d => d.DIV_NAME))].sort(),
    [districts]
  );

  // Drop districts that no longer belong when divisions change
  useEffect(() => {
    if (!selectedDivisions.length) return;
    const valid = new Set(
      districts.filter(d => selectedDivisions.includes(d.DIV_NAME)).map(d => d.DIS_CODE)
    );
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

  const isEmpty = !scopedFacilities.length || !scopedDistricts.length;

  // Auto-generate title when scope changes
  useEffect(() => {
    setReportTitle(
      scopeLabel === 'All Bangladesh'
        ? 'Mental Health Facility System — Bangladesh: National Overview'
        : `Mental Health Facility System — ${scopeLabel}`
    );
  }, [scopeLabel]);

  const toggleDivision = (name: string) =>
    setSelectedDivisions(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);

  const toggleDistrict = (code: string) =>
    setSelectedDistricts(p => p.includes(code) ? p.filter(x => x !== code) : [...p, code]);

  const toggleSection = (key: string) =>
    setSelectedSections(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const handleGenerate = () => {
    setReportData(computeReport(scopedDistricts, scopedFacilities, facilities, scopeLabel));
    setPhase('report');
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const slug = scopeLabel.replace(/\s+/g, '-').toLowerCase();
      await downloadAsPdf(reportRef.current, `mhfe-report-${slug}.pdf`);
    } catch (e) {
      console.error('PDF download failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  /* ═══════════════════════════════════════════════════════════════════════
     REPORT PHASE
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'report' && reportData) {
    const rd = reportData;
    let secNum = 0;
    const SECTION_ORDER = ['summary', 'coverage', 'structure', 'access', 'priorities', 'divisions'];
    const activeKeys = SECTION_ORDER.filter(k => selectedSections.has(k));

    return (
      /* Full-bleed white canvas — no sidebar, no KPI cards */
      <div className="min-h-screen bg-slate-100">

        {/* ── Top controls bar ─────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
          <button
            type="button"
            onClick={() => setPhase('builder')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            ← Back to Builder
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">{rd.scopeLabel}</span>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Generating PDF…' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* ── Report document ──────────────────────────────────────── */}
        <div className="max-w-[860px] mx-auto py-8 px-4">
          <div
            ref={reportRef}
            style={{ backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Cover strip */}
            <div style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%)', height: 8 }} />

            <div className="p-10">
              {/* Cover block */}
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Arial, sans-serif' }}>
                District-level Decision Support · Bangladesh
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: 12 }}>
                {reportTitle}
              </h1>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b', marginBottom: rd.isFiltered ? 12 : 0, fontFamily: 'Arial, sans-serif' }}>
                <span>Generated: {today}</span>
              </div>
              {rd.isFiltered && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '4px 12px', fontSize: 11, color: '#1d4ed8', fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>
                  📍 Scope: {rd.scopeLabel} · {rd.scopePct}% of national facilities
                </div>
              )}
              <div style={{ borderBottom: '2px solid #e2e8f0', marginTop: 24, marginBottom: 28 }} />

              {!rd.hasData && (
                <p style={{ color: '#64748b', fontSize: 14 }}>No data available for the selected scope.</p>
              )}

              {rd.hasData && activeKeys.map((key, idx) => {
                secNum++;
                const n = secNum;
                const isLast = idx === activeKeys.length - 1;

                return (
                  <div key={key}>

                    {/* ── EXECUTIVE SUMMARY ───────────────────── */}
                    {key === 'summary' && (
                      <section>
                        <PdfSectionHeader num={n} title="Executive Summary" />
                        {rd.isFiltered && (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#475569', fontFamily: 'Arial, sans-serif' }}>
                            This report covers <strong>{scopedDistricts.length}</strong> district{scopedDistricts.length === 1 ? '' : 's'} and <strong>{rd.totalFacilities}</strong> facilities,
                            representing <strong>{rd.scopePct}%</strong> of all mapped facilities nationally.
                          </div>
                        )}
                        {/* Stat grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                          {[
                            ['Total Facilities', rd.totalFacilities],
                            ['Districts Covered', `${rd.districtsWithFacilities} / ${scopedDistricts.length}`],
                            ['Govt Facilities', `${rd.govtCount} (${rd.govtPct}%)`],
                            ['Free Services', `${rd.freeCount} (${rd.freePct}%)`],
                            ['Critical Districts', rd.criticalCount],
                            ['Avg per 100K Pop', rd.natAvgPer100k.toFixed(2)],
                          ].map(([label, value]) => (
                            <div key={String(label)} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Arial, sans-serif' }}>{label}</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8', fontFamily: 'Arial, sans-serif' }}>{value}</div>
                            </div>
                          ))}
                        </div>
                        {/* Key findings */}
                        <div style={{ background: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: '0 8px 8px 0', padding: '14px 16px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'Arial, sans-serif' }}>Key Findings</p>
                          {rd.findings.map((f, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: '#334155', lineHeight: 1.6, fontFamily: 'Arial, sans-serif' }}>
                              <span style={{ color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>·</span>
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ── COVERAGE & GAPS ─────────────────────── */}
                    {key === 'coverage' && (
                      <section>
                        <PdfSectionHeader num={n} title="Coverage & Gaps" />
                        <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, marginBottom: 14, fontFamily: 'Arial, sans-serif' }}>
                          Within {rd.scopeLabel}, <strong>{rd.belowMedianCount}</strong> of <strong>{scopedDistricts.length}</strong> districts fall below the
                          median of <strong>{rd.medianPer100k.toFixed(2)}</strong> facilities per 100,000. The 10 most underserved districts are listed below.
                        </p>
                        <PdfTable
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
                              <PdfBadge key="s" label={sev.label} cls={sev.cls} />,
                            ];
                          })}
                        />
                      </section>
                    )}

                    {/* ── SYSTEM STRUCTURE ────────────────────── */}
                    {key === 'structure' && (
                      <section>
                        <PdfSectionHeader num={n} title="System Structure" />
                        <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, marginBottom: 14, fontFamily: 'Arial, sans-serif' }}>
                          Of the <strong>{rd.totalFacilities}</strong> facilities across <strong>{rd.coveredDivisions}</strong> division{rd.coveredDivisions === 1 ? '' : 's'},
                          {' '}<strong>{rd.govtPct}%</strong> are government-run and <strong>{rd.privPct}%</strong> are private.
                          {rd.topDiv ? ` ${rd.topDiv.name} hosts the largest share with ${rd.topDiv.total} facilities.` : ''}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                          {[
                            ['Government', `${rd.govtCount} (${rd.govtPct}%)`],
                            ['Private', `${rd.privCount} (${rd.privPct}%)`],
                          ].map(([l, v]) => (
                            <div key={l} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Arial, sans-serif' }}>{l}</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', fontFamily: 'Arial, sans-serif' }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        {/* Split bar */}
                        <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 20 }}>
                          <div style={{ background: '#1d4ed8', width: `${rd.govtPct}%` }} />
                          <div style={{ background: '#93c5fd', flex: 1 }} />
                        </div>
                        <PdfTable
                          headers={['Division', 'Total', 'Govt', 'Private', 'Free', 'Child']}
                          rows={rd.divRows.map(r => [r.name, String(r.total), String(r.govt), String(r.priv), String(r.free), String(r.child)])}
                        />
                      </section>
                    )}

                    {/* ── ACCESS BARRIERS ─────────────────────── */}
                    {key === 'access' && (
                      <section>
                        <PdfSectionHeader num={n} title="Access Barriers" />
                        <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, marginBottom: 14, fontFamily: 'Arial, sans-serif' }}>
                          <strong>{rd.walkinPct}%</strong> of facilities accept walk-ins, <strong>{rd.freePct}%</strong> offer free services,
                          and only <strong>{rd.walkinFreeCount}</strong> combine both — the minimum-barrier access pathway.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                          {[
                            ['Walk-in Available', `${rd.walkinCount} (${rd.walkinPct}%)`],
                            ['Appointment Required', String(rd.apptCount)],
                            ['Free Services', `${rd.freeCount} (${rd.freePct}%)`],
                            ['Cost Unknown', `${rd.unknownCostCount} (${rd.unknownCostPct}%)`],
                          ].map(([l, v]) => (
                            <div key={l} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Arial, sans-serif' }}>{l}</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', fontFamily: 'Arial, sans-serif' }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'Arial, sans-serif' }}>Cost Distribution</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(['Free', '1–99 BDT', '100–499 BDT', '500–999 BDT', '1000+ BDT', 'Unknown'] as const).map(b => {
                            const v = rd.costBrackets[b] || 0;
                            const pct = rd.totalFacilities ? (v / rd.totalFacilities) * 100 : 0;
                            return (
                              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: 'Arial, sans-serif' }}>
                                <span style={{ width: 96, color: '#475569', flexShrink: 0 }}>{b}</span>
                                <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', background: '#3b82f6', width: `${pct}%` }} />
                                </div>
                                <span style={{ width: 72, textAlign: 'right', color: '#334155', fontWeight: 600 }}>{v} ({pct.toFixed(0)}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* ── PRIORITY DISTRICTS ──────────────────── */}
                    {key === 'priorities' && (
                      <section>
                        <PdfSectionHeader num={n} title="Priority Districts" />
                        <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, marginBottom: 14, fontFamily: 'Arial, sans-serif' }}>
                          Need score = 0.5 × coverage gap + 0.3 × normalised population + 0.2 × normalised poverty.
                          Higher scores indicate greater unmet need and urgency for investment.
                        </p>
                        <PdfTable
                          headers={['#', 'District', 'Division', 'Pop (M)', 'Per 100K', 'Poverty', 'Score', 'Priority']}
                          rows={rd.top10.map((d, i) => {
                            const rank = i + 1;
                            const scoreCls = rank <= 3 ? 'color:#dc2626;font-weight:700'
                              : rank <= 7 ? 'color:#d97706;font-weight:700'
                              : 'color:#475569';
                            const pri = rank <= 3 ? { l: 'Urgent', cls: 'bg-red-100 text-red-700' }
                              : rank <= 7 ? { l: 'High', cls: 'bg-amber-100 text-amber-700' }
                              : { l: 'Moderate', cls: 'bg-blue-100 text-blue-700' };
                            return [
                              String(rank),
                              d.DIS_NAME,
                              d.DIV_NAME,
                              (d.Population / 1e6).toFixed(2),
                              (d.facilitiesPer100k || 0).toFixed(2),
                              d['Poverty Index'].toFixed(2),
                              <span key="sc" style={{ ...Object.fromEntries(scoreCls.split(';').map(s => s.split(':').map(x => x.trim())).filter(a => a.length === 2).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])) }}>{d.score.toFixed(3)}</span>,
                              <PdfBadge key="pr" label={pri.l} cls={pri.cls} />,
                            ];
                          })}
                        />
                        <div style={{ marginTop: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10, fontSize: 12, color: '#92400e', fontFamily: 'Arial, sans-serif' }}>
                          <span style={{ flexShrink: 0 }}>⚠</span>
                          <span>These districts should be prioritised for new facility allocation, mobile outreach, or telehealth expansion.</span>
                        </div>
                      </section>
                    )}

                    {/* ── DIVISION PROFILES ───────────────────── */}
                    {key === 'divisions' && (
                      <section>
                        <PdfSectionHeader num={n} title="Division Profiles" />
                        <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, marginBottom: 14, fontFamily: 'Arial, sans-serif' }}>
                          {rd.isFiltered
                            ? `The ${rd.divRows.length} division${rd.divRows.length === 1 ? '' : 's'} in scope show varying patterns of provision. `
                            : `Bangladesh's 8 divisions show varying patterns of provision. `}
                          {rd.topGovtDiv && `${rd.topGovtDiv.name} has the largest government share. `}
                          {rd.topFreeDiv && `${rd.topFreeDiv.name} offers the highest proportion of free care. `}
                          {rd.lowestDiv && `${rd.lowestDiv.name} has the lowest average per-100K coverage.`}
                        </p>
                        <PdfTable
                          headers={['Division', 'Districts', 'Total', 'Govt', 'Govt %', 'Free', 'Child', 'Avg/100K', 'Profile']}
                          rows={rd.divRows.map(r => {
                            let prof = { l: 'Mixed', cls: 'bg-slate-100 text-slate-700' };
                            if (rd.lowestDiv && r.name === rd.lowestDiv.name) prof = { l: 'Underserved', cls: 'bg-red-100 text-red-700' };
                            else if (rd.topGovtDiv && r.name === rd.topGovtDiv.name) prof = { l: 'Govt-led', cls: 'bg-blue-100 text-blue-700' };
                            else if (rd.topFreeDiv && r.name === rd.topFreeDiv.name) prof = { l: 'Accessible', cls: 'bg-green-100 text-green-700' };
                            return [
                              r.name,
                              String(r.districtCount),
                              String(r.total),
                              String(r.govt),
                              r.total ? ((r.govt / r.total) * 100).toFixed(0) + '%' : '—',
                              String(r.free),
                              String(r.child),
                              r.avgPer100k.toFixed(2),
                              <PdfBadge key="p" label={prof.l} cls={prof.cls} />,
                            ];
                          })}
                        />
                      </section>
                    )}

                    {/* Section divider */}
                    {!isLast && (
                      <div style={{ borderBottom: '1px solid #e2e8f0', margin: '28px 0' }} />
                    )}
                  </div>
                );
              })}

              {/* Footer */}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 36, paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>
                <span>Mental Health Facility Explorer · Bangladesh</span>
                <span>Generated {today}</span>
              </div>
            </div>{/* /p-10 */}
          </div>{/* /white doc */}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     BUILDER PHASE
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Build Your Report</h2>
            <p className="text-sm text-slate-500">Generate a PDF report scoped to your area of interest.</p>
          </div>
        </div>

        {/* ── A: Geographic Scope ─────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-slate-800">Geographic scope</span>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-[11px] text-blue-700 font-semibold">
              <MapPin className="h-3 w-3" /> {scopeLabel}
            </span>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Divisions */}
            <div>
              <button
                type="button"
                onClick={() => setDivOpen(o => !o)}
                className="w-full flex items-center justify-between mb-3"
              >
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Divisions {selectedDivisions.length ? `(${selectedDivisions.length} selected)` : ''}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${divOpen ? 'rotate-180' : ''}`} />
              </button>
              {divOpen && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allDivisions.map(name => {
                      const sel = selectedDivisions.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleDivision(name)}
                          className={`text-[12px] font-medium rounded-lg px-3 py-2 border transition-all text-center ${
                            sel
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
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
                      className="mt-2 text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Clear all divisions
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="h-px bg-slate-100" />

            {/* Districts */}
            <div>
              <button
                type="button"
                onClick={() => setDisOpen(o => !o)}
                className="w-full flex items-center justify-between mb-3"
              >
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Districts {selectedDistricts.length ? `(${selectedDistricts.length} selected)` : ''}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${disOpen ? 'rotate-180' : ''}`} />
              </button>
              {disOpen && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={districtSearch}
                        onChange={e => setDistrictSearch(e.target.value)}
                        placeholder="Search districts…"
                        className="w-full pl-8 pr-7 py-2 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-slate-50"
                      />
                      {districtSearch && (
                        <button type="button" onClick={() => setDistrictSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                          <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const allCodes = filteredDistricts.map(d => d.DIS_CODE);
                        const allSel = allCodes.every(c => selectedDistricts.includes(c));
                        setSelectedDistricts(allSel ? [] : allCodes);
                      }}
                      className="text-[11px] text-blue-600 hover:underline whitespace-nowrap"
                    >
                      {filteredDistricts.length > 0 && filteredDistricts.every(d => selectedDistricts.includes(d.DIS_CODE)) ? 'Clear all' : 'Select all'}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg">
                    {filteredDistricts.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-4">No districts found</p>
                    )}
                    {selectedDivisions.length > 1
                      ? selectedDivisions.map(div => {
                          const inDiv = filteredDistricts.filter(d => d.DIV_NAME === div);
                          if (!inDiv.length) return null;
                          return (
                            <div key={div}>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1">{div}</p>
                              {inDiv.map(d => (
                                <label key={d.DIS_CODE} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                                  <Checkbox checked={selectedDistricts.includes(d.DIS_CODE)} onCheckedChange={() => toggleDistrict(d.DIS_CODE)} />
                                  <span className="text-[12px] text-slate-700">{d.DIS_NAME}</span>
                                </label>
                              ))}
                            </div>
                          );
                        })
                      : filteredDistricts.map(d => (
                          <label key={d.DIS_CODE} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                            <Checkbox checked={selectedDistricts.includes(d.DIS_CODE)} onCheckedChange={() => toggleDistrict(d.DIS_CODE)} />
                            <span className="text-[12px] text-slate-700">{d.DIS_NAME}</span>
                          </label>
                        ))
                    }
                  </div>
                </div>
              )}
            </div>

            {isEmpty && (selectedDivisions.length > 0 || selectedDistricts.length > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-[12px] text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>No facilities found for this scope. Adjust your selection.</span>
              </div>
            )}
          </div>
        </div>

        {/* ── B: Sections ─────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">Sections</span>
            <span className="ml-auto text-xs text-slate-400">{selectedSections.size} of {SECTIONS.length} selected</span>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-2.5">
            {SECTIONS.map(s => {
              const active = selectedSections.has(s.key);
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSection(s.key)}
                  aria-pressed={active}
                  className={`text-left rounded-xl p-3.5 border-2 transition-all ${
                    active
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <p className={`text-[13px] font-semibold leading-tight ${active ? 'text-blue-900' : 'text-slate-700'}`}>{s.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{s.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Generate button ──────────────────────────────────────── */}
        <button
          type="button"
          disabled={isEmpty || selectedSections.size === 0}
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 rounded-xl transition-colors shadow-sm"
        >
          <FileText className="h-4 w-4" />
          {isEmpty && (selectedDivisions.length > 0 || selectedDistricts.length > 0)
            ? 'No data in selected scope'
            : 'Generate Report'}
        </button>

      </div>
    </div>
  );
}

/* ─── PDF-safe sub-components (inline styles only — no Tailwind) ─────────── */
function PdfSectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{
          height: 26, width: 26, borderRadius: '50%', background: '#1d4ed8',
          color: '#ffffff', fontSize: 12, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontFamily: 'Arial, sans-serif',
        }}>
          {num}
        </span>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>{title}</h2>
      </div>
      <div style={{ height: 1, background: '#e2e8f0' }} />
    </div>
  );
}

function PdfBadge({ label, cls }: { label: string; cls: string }) {
  // Map Tailwind class pairs to inline styles for pdf rendering
  const map: Record<string, { background: string; color: string }> = {
    'bg-red-100 text-red-700':     { background: '#fee2e2', color: '#b91c1c' },
    'bg-amber-100 text-amber-700': { background: '#fef3c7', color: '#b45309' },
    'bg-blue-100 text-blue-700':   { background: '#dbeafe', color: '#1d4ed8' },
    'bg-green-100 text-green-700': { background: '#dcfce7', color: '#15803d' },
    'bg-slate-100 text-slate-700': { background: '#f1f5f9', color: '#334155' },
  };
  const style = map[cls] ?? { background: '#f1f5f9', color: '#334155' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 700, fontFamily: 'Arial, sans-serif',
      ...style,
    }}>
      {label}
    </span>
  );
}

function PdfTable({ headers, rows }: { headers: string[]; rows: (string | JSX.Element)[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Arial, sans-serif' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
              {r.map((c, j) => (
                <td key={j} style={{ padding: '7px 10px', color: '#334155', verticalAlign: 'middle' }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
