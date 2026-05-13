function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T extends Record<string, any>>(
  rows: T[],
  columns: { key: string; header?: string }[]
): string {
  const header = columns.map((c) => escapeCsvField(c.header ?? c.key)).join(',');
  const body = rows
    .map((r) => columns.map((c) => escapeCsvField(getValue(r, c.key))).join(','))
    .join('\n');
  return header + '\n' + body;
}

function getValue(obj: any, key: string): any {
  if (key in obj) return obj[key];
  // allow bracket notation keys like 'Poverty Index'
  return obj[key];
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function todayStamp(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
