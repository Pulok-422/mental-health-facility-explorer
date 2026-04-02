import { useState, useEffect } from 'react';
import type { DistrictPop, Facility } from '@/types/dashboard';

interface DashboardData {
  districts: DistrictPop[];
  facilities: Facility[];
  geojson: any | null;
  loading: boolean;
}

export function useDataLoader(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    districts: [],
    facilities: [],
    geojson: null,
    loading: true,
  });

  useEffect(() => {
    Promise.all([
      fetch('/data/districts_pop.json').then(r => r.json()),
      fetch('/data/facilities.json').then(r => r.json()),
      fetch('/data/district.geojson').then(r => r.json()),
    ]).then(([districts, facilities, geojson]) => {
      const enriched = (districts as DistrictPop[]).map(d => ({
        ...d,
        facilitiesPer100k: d.Population > 0 ? (d.total_facilities / d.Population) * 100000 : 0,
        populationPerFacility: d.total_facilities > 0 ? d.Population / d.total_facilities : 0,
        householdsPerFacility: d.total_facilities > 0 ? d.Total_households / d.total_facilities : 0,
      }));
      setData({ districts: enriched, facilities, geojson, loading: false });
    });
  }, []);

  return data;
}
