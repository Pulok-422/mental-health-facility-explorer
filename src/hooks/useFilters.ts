import { useState, useMemo, useCallback } from 'react';
import type { Filters, DistrictPop, Facility, ChoroplethMetric } from '@/types/dashboard';

const DEFAULT_FILTERS: Filters = {
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
  showChoropleth: true,
  showMarkers: true,
  showLabels: false,
  normalizeByPop: false,
  choroplethMetric: 'facilities',
};

export function useFilters(allDistricts: DistrictPop[], allFacilities: Facility[]) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSelectedDistrict(null);
  }, []);

  const activeDistricts = useMemo(() => {
    const selected = selectedDistrict ? [selectedDistrict] : filters.districts;
    return allDistricts.filter(d => {
      if (selected.length > 0 && !selected.includes(d.DIS_CODE)) return false;
      if (d["Poverty Index"] < filters.povertyRange[0] || d["Poverty Index"] > filters.povertyRange[1]) return false;
      if (d.Literacy_rate < filters.literacyRange[0] || d.Literacy_rate > filters.literacyRange[1]) return false;
      if (d.Urban_percent < filters.urbanRange[0] || d.Urban_percent > filters.urbanRange[1]) return false;
      if (d.Population < filters.populationRange[0] || d.Population > filters.populationRange[1]) return false;
      if (d.total_facilities < filters.facilitiesRange[0] || d.total_facilities > filters.facilitiesRange[1]) return false;
      return true;
    });
  }, [allDistricts, filters, selectedDistrict]);

  const activeFacilities = useMemo(() => {
    const distCodes = new Set(activeDistricts.map(d => d.DIS_CODE));
    return allFacilities.filter(f => {
      if (distCodes.size > 0 && !distCodes.has(f.DIS_CODE)) return false;
      if (filters.facilityTypes.length > 0 && !filters.facilityTypes.includes(f.facility_type)) return false;
      if (filters.ownership.length > 0 && !filters.ownership.includes(f.ownership)) return false;
      if (filters.origin.length > 0 && !filters.origin.includes(f.origin)) return false;
      if (filters.category.length > 0 && !filters.category.includes(f.category_adult_child_both)) return false;
      if (filters.appointmentRequired.length > 0 && !filters.appointmentRequired.includes(f.appointment_required)) return false;
      if (filters.cost.length > 0 && !filters.cost.includes(f.cost)) return false;
      if (filters.services.length > 0 && !filters.services.some(s => f.services_provided?.includes(s))) return false;
      if (filters.searchQuery && !f.facility_name.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allFacilities, activeDistricts, filters]);

  const filterOptions = useMemo(() => {
    const unique = <T,>(arr: T[]) => [...new Set(arr)].filter(Boolean).sort() as string[];
    return {
      districts: allDistricts.filter(d => d.DIS_NAME).map(d => ({ code: d.DIS_CODE, name: d.DIS_NAME })).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      facilityTypes: unique(allFacilities.map(f => f.facility_type)),
      ownership: unique(allFacilities.map(f => f.ownership)),
      origin: unique(allFacilities.map(f => f.origin)),
      services: unique(allFacilities.map(f => f.services_provided)),
      category: unique(allFacilities.map(f => f.category_adult_child_both)),
      appointmentRequired: unique(allFacilities.map(f => f.appointment_required)),
      cost: unique(allFacilities.map(f => f.cost)),
    };
  }, [allDistricts, allFacilities]);

  return {
    filters,
    updateFilter,
    resetFilters,
    selectedDistrict,
    setSelectedDistrict,
    activeDistricts,
    activeFacilities,
    filterOptions,
  };
}
