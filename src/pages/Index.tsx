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
import ReportTab from '@/components/dashboard/ReportTab';
import ActiveFilterChips from '@/components/dashboard/ActiveFilterChips';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/LoadingScreen';
import AppHeader from '@/components/dashboard/AppHeader';

const VALID_TABS: TabView[] = ['map', 'insights', 'table', 'report'];

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

  if (loading) return <LoadingScreen />;

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabView)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        showSidebarToggle={activeTab !== 'report'}
      />

      <div className="flex flex-1 relative">
        {activeTab !== 'report' && isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {activeTab !== 'report' && (
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
        )}

        <main className="flex-1 min-w-0">
          <div className={activeTab === 'report' ? '' : 'p-3 md:p-4 space-y-4'}>
            {activeTab !== 'report' && <KPICards districts={activeDistricts} facilities={activeFacilities} />}

            {activeTab !== 'report' && activeDistricts.length >= 2 && (
              <DistrictSummaryCards districts={activeDistricts} />
            )}

            {activeTab === 'map' && (
              <DistrictMap
                geojson={geojson}
                districts={activeDistricts}
                facilities={activeFacilities}
                mapDisplay={mapDisplay}
                updateMapDisplay={updateMapDisplay}
                selectedDistrict={selectedDistrict}
                onDistrictClick={setSelectedDistrict}
              />
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
          </div>

          {activeTab === 'report' && <ReportTab districts={districts} facilities={facilities} />}
        </main>
      </div>
    </div>
  );
}
