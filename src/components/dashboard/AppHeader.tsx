import { useNavigate, useLocation } from 'react-router-dom';
import { Map, BarChart3, Table2, GitCompare, MessageSquare, Menu, X } from 'lucide-react';
import CitationFooter from '@/components/dashboard/CitationFooter';

export type TabKey = 'map' | 'insights' | 'table' | 'compare';

const NAV_TABS = [
  { key: 'map'      as TabKey, label: 'Map',        icon: Map        },
  { key: 'insights' as TabKey, label: 'Insights',   icon: BarChart3  },
  { key: 'table'    as TabKey, label: 'Data table', icon: Table2     },
  { key: 'compare'  as TabKey, label: 'Compare',    icon: GitCompare },
];

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

        {/* Centered nav */}
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

            <div className="w-px h-5 bg-border/60 mx-1 self-center hidden sm:block" aria-hidden="true" />

            {/* Feedback tab */}
            <button
              type="button"
              onClick={() => navigate('/feedback')}
              aria-current={onFeedback ? 'page' : undefined}
              className={`flex items-center gap-1.5 text-[13px] rounded-[8px] whitespace-nowrap
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                transition-all duration-150 ${
                  onFeedback
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm border border-primary/80'
                    : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              style={{ padding: '7px 14px' }}
            >
              <MessageSquare style={{ width: 13, height: 13 }} />
              <span className="hidden sm:inline">Feedback</span>
            </button>
          </div>
        </nav>
      </div>

      <div className="border-t border-border/40 bg-card/50">
        <CitationFooter />
      </div>
    </header>
  );
}
