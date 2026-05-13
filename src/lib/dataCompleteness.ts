import type { Facility } from '@/types/dashboard';

const FIELDS: (keyof Facility)[] = [
  'facility_name',
  'facility_type',
  'services_provided',
  'address',
  'visiting_hours',
  'cost',
  'service_days',
  'website',
  'email_address',
  'mobile_contact_number',
];

export const COMPLETENESS_TOTAL = FIELDS.length;

export function facilityCompleteness(f: Facility): number {
  let count = 0;
  for (const k of FIELDS) {
    const v = (f as any)[k];
    if (typeof v === 'string' && v.trim() !== '') count++;
  }
  return count;
}

export function completenessClasses(score: number): string {
  if (score >= 8) return 'bg-green-100 text-green-800 border border-green-300';
  if (score >= 5) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
  return 'bg-red-100 text-red-800 border border-red-300';
}

export function avgCompleteness(facilities: Facility[]): { avg: number; n: number } {
  if (!facilities.length) return { avg: 0, n: 0 };
  const sum = facilities.reduce((s, f) => s + facilityCompleteness(f), 0);
  return { avg: sum / facilities.length, n: facilities.length };
}
