import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Map, BarChart3, Table2, FileText,
  MessageSquare, Menu, X, Quote, ChevronDown, Copy, Check,
} from 'lucide-react';

export type TabKey = 'map' | 'insights' | 'table' | 'report';

const NAV_TABS = [
  { key: 'map'      as TabKey, label: 'Map',        icon: Map        },
  { key: 'insights' as TabKey, label: 'Insights',   icon: BarChart3  },
  { key: 'table'    as TabKey, label: 'Data table', icon: Table2     },
  { key: 'report'   as TabKey, label: 'Report',     icon: FileText   },
];

/* ─── helpers ───────────────────────────────────────────────────────────── */
function getDeployedUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://example.com';
}
function getMonthYear(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/* ─── CitationBlock ─────────────────────────────────────────────────────── */
interface CitationBlockProps { label: string; text: string }
function CitationBlock({ label, text }: CitationBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-foreground">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label} citation`}
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none
                     focus-visible:ring-2 focus-visible:ring-primary"
        >
          {copied
            ? <Check className="h-3.5 w-3.5 text-green-600" />
            : <Copy  className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>
      <div className="font-mono text-[11px] bg-muted/50 rounded p-2 leading-relaxed break-words">
        {text}
      </div>
    </div>
  );
}

/* ─── CiteDropdown ──────────────────────────────────────────────────────── */
function CiteDropdown() {
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const url               = getDeployedUrl();
  const monthYear         = getMonthYear();

  const apa       = `*****`;
  const vancouver = `*****`;

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Cite this tool"
        className={`flex items-center gap-1.5 text-[13px] rounded-[8px] whitespace-nowrap px-3 py-[7px]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-150
          border ${open
            ? 'bg-primary text-primary-foreground font-medium shadow-sm border-primary/80'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
      >
        <Quote style={{ width: 13, height: 13 }} />
        <span className="hidden sm:inline">Cite</span>
        <ChevronDown
          style={{ width: 12, height: 12 }}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[520px] max-w-[90vw] z-50
                     bg-card border border-border rounded-xl shadow-lg p-4
                     flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
            Cite this tool
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <CitationBlock label="APA 7th"    text={apa} />
            <CitationBlock label="Vancouver"  text={vancouver} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── AppHeader ─────────────────────────────────────────────────────────── */
interface AppHeaderProps {
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
}

export default function AppHeader({
  activeTab,
  onTabChange,
  sidebarOpen,
  onToggleSidebar,
  showSidebarToggle = false,
}: AppHeaderProps) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const onFeedback = location.pathname === '/feedback';

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="px-3 md:px-4 py-3 flex items-center gap-3">

        {/* Left: sidebar toggle OR back arrow */}
        {showSidebarToggle && onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Close filters' : 'Open filters'}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
          >
            {sidebarOpen
              ? <X    className="h-4 w-4 text-muted-foreground" />
              : <Menu className="h-4 w-4 text-muted-foreground" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-1.5 rounded-lg hover:bg-muted transition-colors focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4 text-muted-foreground" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 12L6 8l4-4" />
            </svg>
          </button>
        )}

        {/* Title */}
        <div className="min-w-0 flex-shrink-0">
          <h1 className="text-sm md:text-base font-bold text-foreground truncate">
            Mental Health Facility Explorer
          </h1>
          <p className="text-[11px] md:text-xs text-muted-foreground truncate hidden sm:block">
            District-wise decision-support dashboard for Bangladesh
          </p>
        </div>

        {/* Centered nav — main tabs only (no Feedback, no Cite) */}
        <nav className="flex-1 flex justify-center" aria-label="Dashboard sections">
          <div className="flex gap-0.5 bg-muted/60 rounded-[12px] p-1.5 border border-border/60 overflow-x-auto">
            {NAV_TABS.map((t) => {
              const isActive = !onFeedback && activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    if (onFeedback) navigate('/');
                    onTabChange?.(t.key);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 text-[13px] rounded-[8px] whitespace-nowrap
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                    transition-all duration-150 ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm border border-primary/80'
                        : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  style={{ padding: '7px 14px' }}
                >
                  <t.icon style={{ width: 13, height: 13 }} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right corner: Feedback + Cite */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Feedback */}
          <button
            type="button"
            onClick={() => navigate('/feedback')}
            aria-current={onFeedback ? 'page' : undefined}
            className={`flex items-center gap-1.5 text-[13px] rounded-[8px] whitespace-nowrap px-3 py-[7px]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              transition-all duration-150 border ${
                onFeedback
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm border-primary/80'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
          >
            <MessageSquare style={{ width: 13, height: 13 }} />
            <span className="hidden sm:inline">Feedback</span>
          </button>

        </div>

      </div>
      {/* CitationFooter bar removed — citation is now in the Cite dropdown above */}
    </header>
  );
}
