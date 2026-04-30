import { useState, useEffect, useCallback } from 'react';
import type { DistrictPop, Facility } from '@/types/dashboard';

interface DashboardData {
  districts: DistrictPop[];
  facilities: Facility[];
  geojson: any | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useDataLoader(): DashboardData {
  const [districts, setDistricts] = useState<DistrictPop[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [geojson, setGeojson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchJson = async (url: string) => {
      const cacheBustedUrl = `${url}?v=${Date.now()}`;

      const r = await fetch(cacheBustedUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!r.ok) throw new Error(`Failed to load ${url} (${r.status})`);
      return r.json();
    };

    Promise.all([
      fetchJson('/data/districts_pop.json'),
      fetchJson('/data/facilities.json'),
      fetchJson('/data/district.geojson'),
    ])
      .then(([d, f, g]) => {
        if (cancelled) return;

        const enriched = (d as DistrictPop[]).map((row) => ({
          ...row,
          facilitiesPer100k:
            row.Population > 0 ? (row.total_facilities / row.Population) * 100000 : 0,
          populationPerFacility:
            row.total_facilities > 0 ? row.Population / row.total_facilities : 0,
          householdsPerFacility:
            row.total_facilities > 0 ? row.Total_households / row.total_facilities : 0,
        }));

        setDistricts(enriched);
        setFacilities(f);
        setGeojson(g);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load dashboard data');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { districts, facilities, geojson, loading, error, reload };
}
