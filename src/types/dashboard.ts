export interface DistrictPop {
  DIV_NAME: string;
  DIV_CODE: string;
  DIS_NAME: string;
  DIS_CODE: string;
  total_facilities: number;
  Population: number;
  Male_population: number;
  Female_population: number;
  Rural_population: number;
  Urban_population: number;
  Urban_percent: number;
  Total_households: number;
  Average_household_size: number;
  Literacy_rate: number;
  "Poverty Index": number;
  // Derived
  facilitiesPer100k?: number;
  populationPerFacility?: number;
  householdsPerFacility?: number;
}

export interface Facility {
  facility_name: string;
  facility_type: string;
  services_provided: string;
  address: string;
  division: string;
  website?: string;
  email_address?: string;
  mobile_contact_number?: string;
  service_days: string;
  visiting_hours: string;
  cost: string;
  category_adult_child_both: string;
  appointment_required: string;
  origin: string;
  ownership: string;
  latitude: number;
  longitude: number;
  DIV_NAME: string;
  DIV_CODE: string;
  DIS_NAME: string;
  DIS_CODE: string;
}

export interface Filters {
  districts: string[];
  facilityTypes: string[];
  ownership: string[];
  origin: string[];
  services: string[];
  category: string[];
  appointmentRequired: string[];
  cost: string[];
  searchQuery: string;
  povertyRange: [number, number];
  literacyRange: [number, number];
  urbanRange: [number, number];
  populationRange: [number, number];
  facilitiesRange: [number, number];
  showChoropleth: boolean;
  showMarkers: boolean;
  showLabels: boolean;
  normalizeByPop: boolean;
  choroplethMetric: ChoroplethMetric;
}

export type ChoroplethMetric = 
  | 'facilities' 
  | 'population' 
  | 'facilitiesPer100k' 
  | 'populationPerFacility' 
  | 'povertyIndex' 
  | 'literacyRate';

export type TabView = 'map' | 'insights' | 'table' | 'compare';
