import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Filters, MapDisplay, DistrictPop, Facility } from '@/types/dashboard';

const DEFAULT_FILTERS: Filters = {
  divisions: [],
  districts: [],
  facilityTypes: [],
  ownership: [],
  origin: [],
  services: [],
  category: [],
  appointmentRequired: [],
  cost: [],
  searchQuery: '',
  povertyRange: [0, 100],
  literacyRange: [0, 100],
  urbanRange: [0, 100],
  populationRange: [0, 50000000],
  facilitiesRange: [0, 200],
};

const DEFAULT_MAP_DISPLAY: MapDisplay = {
  showChoropleth: true,
  showMarkers: true,
  showHeatmap: false,
  showBubbles: false,
  showLabels: false,
  choroplethMetric: 'facilities',
  bubbleMetric: 'facilities',
};

function parseList(v: string | null): string[] {
  return v ? v.split(',').filter(Boolean) : [];
}

export function useFilters(allDistricts: DistrictPop[], allFacilities: Facility[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize from URL once
  const init = useRef(false);
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    divisions: parseList(searchParams.get('div')),
    districts: parseList(searchParams.get('d')),
    facilityTypes: parseList(searchParams.get('ft')),
    ownership: parseList(searchParams.get('o')),
    cost: parseList(searchParams.get('c')),
    category: parseList(searchParams.get('cat')),
    appointmentRequired: parseList(searchParams.get('ap')),
    origin: parseList(searchParams.get('or')),
    searchQuery: searchParams.get('q') || '',
  }));
  const [mapDisplay, setMapDisplay] = useState<MapDisplay>(DEFAULT_MAP_DISPLAY);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(
    searchParams.get('sel') || null
  );

  // Persist meaningful filter state to URL (debounced via simple effect)
  useEffect(() => {
    if (!init.current) {
      init.current = true;
      return;
    }
    const next = new URLSearchParams(searchParams);
    const setOrDel = (key: string, val: string) => {
      if (val) next.set(key, val);
      else next.delete(key);
    };
    setOrDel('div', filters.divisions.join(','));
    setOrDel('d', filters.districts.join(','));
    setOrDel('ft', filters.facilityTypes.join(','));
    setOrDel('o', filters.ownership.join(','));
    setOrDel('c', filters.cost.join(','));
    setOrDel('cat', filters.category.join(','));
    setOrDel('ap', filters.appointmentRequired.join(','));
    setOrDel('or', filters.origin.join(','));
    setOrDel('q', filters.searchQuery);
    setOrDel('sel', selectedDistrict || '');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedDistrict]);

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateMapDisplay = useCallback(<K extends keyof MapDisplay>(key: K, value: MapDisplay[K]) => {
    setMapDisplay((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSelectedDistrict(null);
  }, []);

  const activeDistricts = useMemo(() => {
    const selected = selectedDistrict ? [selectedDistrict] : filters.districts;
    return allDistricts.filter((d) => {
      if (selected.length > 0 && !selected.includes(d.DIS_CODE)) return false;
      if (d['Poverty Index'] < filters.povertyRange[0] || d['Poverty Index'] > filters.povertyRange[1]) return false;
      if (d.Literacy_rate < filters.literacyRange[0] || d.Literacy_rate > filters.literacyRange[1]) return false;
      if (d.Urban_percent < filters.urbanRange[0] || d.Urban_percent > filters.urbanRange[1]) return false;
      if (d.Population < filters.populationRange[0] || d.Population > filters.populationRange[1]) return false;
      if (d.total_facilities < filters.facilitiesRange[0] || d.total_facilities > filters.facilitiesRange[1]) return false;
      return true;
    });
  }, [allDistricts, filters, selectedDistrict]);

  const activeFacilities = useMemo(() => {
    const distCodes = new Set(activeDistricts.map((d) => d.DIS_CODE));
    const hasDistrictConstraint =
      selectedDistrict !== null ||
      filters.districts.length > 0 ||
      filters.povertyRange[0] > 0 || filters.povertyRange[1] < 100 ||
      filters.literacyRange[0] > 0 || filters.literacyRange[1] < 100 ||
      filters.urbanRange[0] > 0 || filters.urbanRange[1] < 100 ||
      filters.populationRange[0] > 0 || filters.populationRange[1] < 50000000 ||
      filters.facilitiesRange[0] > 0 || filters.facilitiesRange[1] < 200;

    return allFacilities.filter((f) => {
      // Fix #12: when district constraints are active, filter strictly — even to empty
      if (hasDistrictConstraint && !distCodes.has(f.DIS_CODE)) return false;
      if (filters.facilityTypes.length > 0 && !filters.facilityTypes.includes(f.facility_type)) return false;
      if (filters.ownership.length > 0 && !filters.ownership.includes(f.ownership)) return false;
      if (filters.origin.length > 0 && !filters.origin.includes(f.origin)) return false;
      if (filters.category.length > 0 && !filters.category.includes(f.category_adult_child_both)) return false;
      if (filters.appointmentRequired.length > 0 && !filters.appointmentRequired.includes(f.appointment_required)) return false;
      if (filters.cost.length > 0 && !filters.cost.includes(f.cost)) return false;
      if (filters.services.length > 0 && !filters.services.some((s) => f.services_provided?.includes(s))) return false;
      if (filters.searchQuery && !f.facility_name.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allFacilities, activeDistricts, filters, selectedDistrict]);

  const filterOptions = useMemo(() => {
    const unique = <T,>(arr: T[]) => [...new Set(arr)].filter(Boolean).sort() as string[];
    const divMap = new Map<string, string>();
    allDistricts.forEach((d) => {
      if (d.DIV_CODE && d.DIV_NAME && !divMap.has(d.DIV_CODE)) divMap.set(d.DIV_CODE, d.DIV_NAME);
    });
    const divisions = Array.from(divMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      divisions,
      districts: allDistricts
        .filter((d) => d.DIS_NAME)
        .map((d) => ({ code: d.DIS_CODE, name: d.DIS_NAME }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      facilityTypes: unique(allFacilities.map((f) => f.facility_type)),
      ownership: unique(allFacilities.map((f) => f.ownership)),
      origin: unique(allFacilities.map((f) => f.origin)),
      services: unique(allFacilities.map((f) => f.services_provided)),
      category: unique(allFacilities.map((f) => f.category_adult_child_both)),
      appointmentRequired: unique(allFacilities.map((f) => f.appointment_required)),
      cost: unique(allFacilities.map((f) => f.cost)),
    };
  }, [allDistricts, allFacilities]);

  return {
    filters,
    updateFilter,
    resetFilters,
    mapDisplay,
    updateMapDisplay,
    selectedDistrict,
    setSelectedDistrict,
    activeDistricts,
    activeFacilities,
    filterOptions,
  };
}
