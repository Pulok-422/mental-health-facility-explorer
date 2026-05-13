import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { toCsv, downloadCsv, todayStamp } from '@/lib/csvExport';
import type { DistrictPop, Facility } from '@/types/dashboard';

interface ExportButtonsProps {
  facilities: Facility[];
  districts: DistrictPop[];
}

const FACILITY_COLS = [
  'facility_name', 'facility_type', 'services_provided', 'ownership', 'cost',
  'category_adult_child_both', 'appointment_required', 'DIV_NAME', 'DIS_NAME',
  'address', 'visiting_hours', 'service_days', 'website', 'email_address',
  'mobile_contact_number', 'latitude', 'longitude',
].map((k) => ({ key: k }));

const DISTRICT_COLS = [
  { key: 'DIS_NAME' },
  { key: 'DIV_NAME' },
  { key: 'total_facilities' },
  { key: 'Population' },
  { key: 'facilitiesPer100k' },
  { key: 'populationPerFacility' },
  { key: 'Poverty Index', header: 'Poverty_Index' },
  { key: 'Literacy_rate' },
  { key: 'Urban_percent' },
];

export default function ExportButtons({ facilities, districts }: ExportButtonsProps) {
  const handleFacilities = () => {
    const filename = `mhfe-facilities-${todayStamp()}.csv`;
    downloadCsv(filename, toCsv(facilities, FACILITY_COLS));
    toast.success('Export complete', {
      description: `Downloaded ${facilities.length} records to ${filename}`,
    });
  };

  const handleDistricts = () => {
    const filename = `mhfe-districts-${todayStamp()}.csv`;
    downloadCsv(filename, toCsv(districts, DISTRICT_COLS));
    toast.success('Export complete', {
      description: `Downloaded ${districts.length} records to ${filename}`,
    });
  };

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" size="sm" onClick={handleFacilities} aria-label="Export facilities CSV">
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Export Facilities CSV
      </Button>
      <Button variant="outline" size="sm" onClick={handleDistricts} aria-label="Export districts CSV">
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Export Districts CSV
      </Button>
    </div>
  );
}
