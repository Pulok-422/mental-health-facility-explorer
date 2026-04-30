import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Facility } from '@/types/dashboard';

interface Props {
  value: string;
  onChange: (v: string) => void;
  facilities: Facility[];
  districtNameLookup: Record<string, string>;
  onSelectFacility: (f: Facility) => void;
}

export default function FacilitySearch({
  value,
  onChange,
  facilities,
  districtNameLookup,
  onSelectFacility,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const matches: Facility[] = [];
    for (const f of facilities) {
      const name = (f.facility_name || '').toLowerCase();
      const dist = (districtNameLookup[f.DIS_CODE] || '').toLowerCase();
      const type = (f.facility_type || '').toLowerCase();
      if (name.includes(q) || dist.includes(q) || type.includes(q)) {
        matches.push(f);
        if (matches.length >= 8) break;
      }
    }
    return matches;
  }, [value, facilities, districtNameLookup]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setActiveIdx(-1);
  }, [value]);

  const choose = useCallback(
    (f: Facility) => {
      onChange(f.facility_name);
      onSelectFacility(f);
      setOpen(false);
    },
    [onChange, onSelectFacility]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        e.preventDefault();
        choose(suggestions[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && value.trim().length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
      <Input
        placeholder="Search facility…"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-9 pl-8 text-[12px] bg-card border border-border rounded-[10px]"
        aria-label="Search facility"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        role="combobox"
      />
      {showDropdown && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-[10px] shadow-lg overflow-hidden"
        >
          {suggestions.length === 0 ? (
            <div className="px-3 py-2.5 text-[12px] text-muted-foreground">
              No matching facility found
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {suggestions.map((f, i) => {
                const dist = districtNameLookup[f.DIS_CODE] || '';
                const isActive = i === activeIdx;
                return (
                  <li
                    key={`${f.facility_name}-${i}`}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIdx(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(f);
                    }}
                    className={`px-3 py-1.5 cursor-pointer text-[12px] flex flex-col gap-0.5 transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span className="font-medium truncate">{f.facility_name}</span>
                    <span className="text-[10.5px] text-muted-foreground truncate">
                      {[dist, f.facility_type].filter(Boolean).join(' • ')}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
