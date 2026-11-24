"use client";

import React, { useMemo, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCarero } from '@/lib/store';

/** Common UK care training, offered as one-tap options. */
export const COMMON_TRAINING = [
  'First Aid',
  'MAPA',
  'Epilepsy Training',
  'Medication',
  'Safeguarding',
  'Makaton',
  'PBS',
  'Food Hygiene',
  'Manual Handling',
  'Autism Awareness',
];

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Tick-able list of training. Picking from a shared list keeps names identical
 * between staff ("has") and service users ("needs"), so cover matching works.
 */
export function TrainingPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const { staff, users } = useCarero();
  const [custom, setCustom] = useState('');

  // Everything already used in this centre, plus the common list; one spelling per item.
  const options = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of [...COMMON_TRAINING, ...staff.flatMap(x => x.skills), ...users.flatMap(u => u.required_skills ?? []), ...value]) {
      const k = norm(s);
      if (k && !seen.has(k)) seen.set(k, s.trim());
    }
    return Array.from(seen.values());
  }, [staff, users, value]);

  const selected = new Set(value.map(norm));

  const toggle = (item: string) => {
    if (selected.has(norm(item))) onChange(value.filter(v => norm(v) !== norm(item)));
    else onChange([...value, item]);
  };

  const addCustom = () => {
    const item = custom.trim();
    if (!item) return;
    const existing = options.find(o => norm(o) === norm(item));
    if (!selected.has(norm(item))) onChange([...value, existing ?? item]);
    setCustom('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map(item => {
          const on = selected.has(norm(item));
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              aria-pressed={on}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors',
                on ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              {on && <Check className="w-3.5 h-3.5" />}
              {item}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Other training…"
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );
}
