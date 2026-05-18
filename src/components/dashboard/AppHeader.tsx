import { useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Map,
  BarChart3,
  Table2,
  FileText,
  MessageSquare,
  Menu,
  X,
} from 'lucide-react';

export type TabKey = 'map' | 'insights' | 'table' | 'report';

const NAV_TABS = [
  { key: 'map' as TabKey, label: 'Map', icon: Map },
  { key: 'insights' as TabKey, label: 'Insights', icon: BarChart3 },
  { key: 'table' as TabKey, label: 'Data table', icon: Table2 },
  { key: 'report' as TabKey, label: 'Report', icon: FileText },
];

interface AppHeaderProps {
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
}

export default function AppHeader({
  activeTab = 'map',
  onTabChange,
  sidebarOpen,
  onToggleSidebar,
  showSidebarToggle = false,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const onFeedback = location.pathname === '/feedback';
  const [isPending, startTransition] = useTransition();

  const activeIndex = NAV_TABS.findIndex((tab) => tab.key === activeTab);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  const handleTabClick = (tab: TabKey) => {
    startTransition(() => {
      if (onFeedback) {
        navigate('/');
      }

      onTabChange?.(tab);
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-card/85 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75">
      <div className="px-3 md:px-4 py-2.5 flex items-center gap-3">
        {/* Left button */}
        {showSidebarToggle && onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Close filters' : 'Open filters'}
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
          >
            {sidebarOpen ? (
              <X className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Menu className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 12L6 8l4-4" />
            </svg>
          </button>
        )}

        {/* Title */}
        <div className="min-w-0 flex-shrink-0">
          <h1 className="text-sm md:text-base font-bold text-foreground truncate leading-tight">
            Mental Health Facility Explorer
          </h1>

          <p className="text-[11px] md:text-xs text-muted-foreground truncate hidden sm:block">
            Bangladesh district-wise decision-support dashboard
          </p>
        </div>

        {/* Center nav */}
        <nav
          className="flex-1 flex justify-center min-w-0"
          aria-label="Dashboard sections"
        >
          <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="relative flex gap-1 bg-muted/55 rounded-2xl p-1 border border-border/60 shadow-inner min-w-max">
              {/* Smooth active background */}
              {!onFeedback && (
                <div
                  className="absolute top-1 bottom-1 rounded-xl bg-primary shadow-sm transition-transform duration-300 ease-out"
                  style={{
                    width: '92px',
                    transform: `translateX(${safeActiveIndex * 96}px)`,
                  }}
                />
              )}

              {NAV_TABS.map((tab) => {
                const isActive = !onFeedback && activeTab === tab.key;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabClick(tab.key)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative z-10 flex h-9 w-[92px] items-center justify-center gap-1.5 text-[13px] rounded-xl whitespace-nowrap
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                      transition-colors duration-200 ${
                        isActive
                          ? 'text-primary-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isActive ? 'scale-110' : ''
                      }`}
                    />

                    <span className="hidden sm:inline">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Right action: Feedback only */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/feedback')}
            aria-current={onFeedback ? 'page' : undefined}
            className={`flex items-center gap-1.5 text-[13px] rounded-lg whitespace-nowrap px-3 py-[7px]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200 border ${
                onFeedback
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm border-primary/80'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />

            <span className="hidden sm:inline">
              Feedback
            </span>
          </button>
        </div>
      </div>

      {/* Tiny loading indicator during tab switch */}
      {isPending && (
        <div className="h-[2px] w-full overflow-hidden bg-muted">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
      )}
    </header>
  );
}
