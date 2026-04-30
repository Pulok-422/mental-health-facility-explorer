import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useFilters } from '@/hooks/useFilters';
import type { TabView } from '@/types/dashboard';
import KPICards from '@/components/dashboard/KPICards';
import DistrictMap from '@/components/dashboard/DistrictMap';
import FilterPanel from '@/components/dashboard/FilterPanel';
import InsightsTab from '@/components/dashboard/InsightsTab';
import DataTable from '@/components/dashboard/DataTable';
import DistrictSummaryCards from '@/components/dashboard/DistrictSummaryCards';
import CompareTab from '@/components/dashboard/CompareTab';
import ActiveFilterChips from '@/components/dashboard/ActiveFilterChips';
import { Map, BarChart3, Table2, GitCompare, Menu, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/LoadingScreen';
import appLogo from '@/assets/app-logo.png';

const VALID_TABS: TabView[] = ['map', 'insights', 'table', 'compare'];

export default function Index() {
  const { districts, facilities, geojson, loading, error, reload } = useDataLoader();
  const {
    filters, updateFilter, resetFilters,
    mapDisplay, updateMapDisplay,
    selectedDistrict, setSelectedDistrict,
    activeDistricts, activeFacilities, filterOptions,
  } = useFilters(districts, facilities);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabView) || 'map';
  const [activeTab, setActiveTab] = useState<TabView>(
    VALID_TABS.includes(initialTab) ? initialTab : 'map'
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sync tab to URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeTab === 'map') next.delete('tab');
    else next.set('tab', activeTab);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const districtNameLookup = useMemo(() => {
    const m: Record<string, string> = {};
    districts.forEach((d) => {
      if (d.DIS_CODE) m[d.DIS_CODE] = d.DIS_NAME;
    });
    return m;
  }, [districts]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md animate-fade-in">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h2 className="text-base font-bold text-foreground mb-1">
            Couldn't load dashboard data
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={reload} size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'map' as const, label: 'Map', icon: Map },
    { key: 'insights' as const, label: 'Insights', icon: BarChart3 },
    { key: 'table' as const, label: 'Data table', icon: Table2 },
    { key: 'compare' as const, label: 'Compare', icon: GitCompare },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border px-3 md:px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Close filters' : 'Open filters'}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {sidebarOpen ? (
                <X className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Menu className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <img
              src={appLogo}
              alt="Mental Health Facility Explorer logo"
              width={32}
              height={32}
              className="h-7 w-7 md:h-8 md:w-8 object-contain shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-sm md:text-base font-bold text-foreground truncate">
                Mental Health Facility Explorer
              </h1>
              <p className="text-[11px] md:text-xs text-muted-foreground truncate hidden sm:block">
                District-wise decision-support dashboard for Bangladesh
              </p>
            </div>
          </div>

          <nav
            className="flex gap-0.5 bg-muted/60 rounded-[12px] p-1.5 border border-border/60 overflow-x-auto"
            aria-label="Dashboard sections"
          >
            {tabs.map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] rounded-[8px] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-[background-color,border-color] duration-150 ${
                    isActive
                      ? 'bg-card border border-border text-foreground font-medium shadow-sm'
                      : 'border border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  style={{ padding: '7px 14px' }}
                >
                  <t.icon style={{ width: 13, height: 13 }} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — drawer on mobile, inline on desktop */}
        <aside
          className={`bg-card border-r border-border transition-all duration-300 flex-shrink-0 ${
            isMobile
              ? `fixed top-[52px] bottom-0 left-0 z-50 w-[85%] max-w-[320px] shadow-xl ${
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`
              : sidebarOpen
              ? 'w-72'
              : 'w-0 overflow-hidden'
          }`}
        >
          <div className={`${isMobile ? 'h-full' : 'h-[calc(100vh-52px)] sticky top-[52px]'} overflow-hidden`}>
            <FilterPanel
              filters={filters}
              updateFilter={updateFilter}
              mapDisplay={mapDisplay}
              updateMapDisplay={updateMapDisplay}
              resetFilters={resetFilters}
              filterOptions={filterOptions}
              selectedDistrict={selectedDistrict}
              setSelectedDistrict={setSelectedDistrict}
              facilities={facilities}
              districtNameLookup={districtNameLookup}
              chipsSlot={
                <ActiveFilterChips
                  filters={filters}
                  selectedDistrict={selectedDistrict}
                  districtNameLookup={districtNameLookup}
                  updateFilter={updateFilter}
                  setSelectedDistrict={setSelectedDistrict}
                  resetFilters={resetFilters}
                />
              }
            />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="p-3 md:p-4 space-y-4">

            <KPICards districts={activeDistricts} facilities={activeFacilities} />

            {activeDistricts.length >= 2 && (
              <DistrictSummaryCards districts={activeDistricts} />
            )}

            {activeTab === 'map' && (
              <>
                <DistrictMap
                  geojson={geojson}
                  districts={activeDistricts}
                  facilities={activeFacilities}
                  mapDisplay={mapDisplay}
                  updateMapDisplay={updateMapDisplay}
                  selectedDistrict={selectedDistrict}
                  onDistrictClick={setSelectedDistrict}
                />
              </>
            )}

            {activeTab === 'insights' && (
              activeDistricts.length === 0 ? (
                <div className="dashboard-panel p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No data matches the current filters. Adjust filters to see insights.
                  </p>
                </div>
              ) : (
                <InsightsTab districts={activeDistricts} facilities={activeFacilities} />
              )
            )}

            {activeTab === 'table' && (
              <DataTable districts={activeDistricts} facilities={activeFacilities} />
            )}

            {activeTab === 'compare' && <CompareTab districts={activeDistricts} />}
          </div>
        </main>
      </div>
    </div>
  );
}
