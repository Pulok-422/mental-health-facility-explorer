import { useState } from 'react';
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
import { Map, BarChart3, Table2, GitCompare, Activity, Menu, X } from 'lucide-react';

export default function Index() {
  const { districts, facilities, geojson, loading } = useDataLoader();
  const {
    filters, updateFilter, resetFilters,
    selectedDistrict, setSelectedDistrict,
    activeDistricts, activeFacilities, filterOptions,
  } = useFilters(districts, facilities);
  const [activeTab, setActiveTab] = useState<TabView>('map');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <Activity className="h-8 w-8 text-primary animate-pulse mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'map' as const, label: 'Map Explorer', icon: Map },
    { key: 'insights' as const, label: 'Insights', icon: BarChart3 },
    { key: 'table' as const, label: 'Data Table', icon: Table2 },
    { key: 'compare' as const, label: 'Compare', icon: GitCompare },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - full width */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              {sidebarOpen ? (
                <X className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Menu className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <div>
              <h1 className="text-base font-bold text-foreground">
                Mental Health Facility Explorer
              </h1>
              <p className="text-xs text-muted-foreground">
                District-wise decision-support dashboard for Bangladesh
              </p>
            </div>
          </div>

          <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === t.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`bg-card border-r border-border transition-all duration-300 flex-shrink-0 ${
            sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
          }`}
        >
          <div className="h-[calc(100vh-52px)] sticky top-[52px] overflow-hidden">
            <FilterPanel
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              filterOptions={filterOptions}
              selectedDistrict={selectedDistrict}
              setSelectedDistrict={setSelectedDistrict}
            />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="p-4 space-y-4">
            {/* KPIs */}
            <KPICards districts={activeDistricts} facilities={activeFacilities} />

            {/* District Summary - only when multiple districts are active */}
            {activeDistricts.length >= 2 && (
              <DistrictSummaryCards districts={activeDistricts} />
            )}

            {/* Tab Content */}
            {activeTab === 'map' && (
              <DistrictMap
                geojson={geojson}
                districts={activeDistricts}
                facilities={activeFacilities}
                filters={filters}
                updateFilter={updateFilter}
                selectedDistrict={selectedDistrict}
                onDistrictClick={setSelectedDistrict}
              />
            )}

            {activeTab === 'insights' && (
              <InsightsTab districts={activeDistricts} facilities={activeFacilities} />
            )}

            {activeTab === 'table' && (
              <DataTable districts={activeDistricts} facilities={activeFacilities} />
            )}

            {activeTab === 'compare' && (
              <CompareTab districts={activeDistricts} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
