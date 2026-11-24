"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Absence, Assignment, ServiceUser, Settings, Staff } from '@/types';
import { mockServiceUsers, mockStaff } from './mockData';
import { todayKey } from './cover';

/**
 * Carero data store.
 *
 * Today this persists to the browser (localStorage) so the app works with no backend.
 * Every write goes through the functions below, so swapping in Supabase later means
 * changing `load`/`save` only — pages don't need to change.
 */

export interface CareroData {
  staff: Staff[];
  users: ServiceUser[];
  assignments: Assignment[];
  absences: Absence[];
  settings: Settings;
}

const STORAGE_KEY = 'carero:data:v1';

export const defaultSettings: Settings = {
  centre_name: 'My Centre',
  default_shift_start: '07:00',
  default_shift_end: '15:00',
};

const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36)}`;

function seed(): CareroData {
  const date = todayKey();
  const now = new Date().toISOString();
  return {
    staff: mockStaff,
    users: mockServiceUsers,
    assignments: [
      { id: 'a1', staff_id: 's1', service_user_id: 'u1', date, start_time: defaultSettings.default_shift_start, end_time: defaultSettings.default_shift_end, created_at: now },
      { id: 'a2', staff_id: 's2', service_user_id: 'u2', date, start_time: defaultSettings.default_shift_start, end_time: defaultSettings.default_shift_end, created_at: now },
    ],
    absences: [],
    settings: defaultSettings,
  };
}

function load(): CareroData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<CareroData>;
    return {
      staff: parsed.staff ?? [],
      users: parsed.users ?? [],
      assignments: parsed.assignments ?? [],
      absences: parsed.absences ?? [],
      settings: { ...defaultSettings, ...parsed.settings },
    };
  } catch {
    return seed();
  }
}

function save(data: CareroData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (private mode) — the app keeps working in memory.
  }
}

interface CareroStore extends CareroData {
  ready: boolean;
  // staff
  addStaff: (s: Omit<Staff, 'id' | 'created_at'>) => void;
  updateStaff: (id: string, patch: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  // service users
  addUser: (u: Omit<ServiceUser, 'id' | 'created_at'>) => void;
  updateUser: (id: string, patch: Partial<ServiceUser>) => void;
  deleteUser: (id: string) => void;
  // assignments
  assign: (a: { staff_id: string; service_user_id: string; date: string; start_time?: string; end_time?: string }) => void;
  unassign: (serviceUserId: string, date: string) => void;
  clearDay: (date: string) => void;
  replaceAssignments: (date: string, next: Omit<Assignment, 'id' | 'created_at'>[]) => void;
  // absences
  addAbsence: (a: Omit<Absence, 'id' | 'created_at'>) => void;
  deleteAbsence: (id: string) => void;
  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemoData: () => void;
}

const Ctx = createContext<CareroStore | null>(null);

export function CareroProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CareroData>(() => ({ ...seed(), staff: [], users: [], assignments: [] }));
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    setData(load());
    setReady(true);
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) save(data);
  }, [data]);

  const update = useCallback((fn: (d: CareroData) => CareroData) => setData(fn), []);
  const now = () => new Date().toISOString();

  const store = useMemo<CareroStore>(() => ({
    ...data,
    ready,

    addStaff: s => update(d => ({ ...d, staff: [...d.staff, { ...s, id: newId('s'), created_at: now() }] })),
    updateStaff: (id, patch) => update(d => ({ ...d, staff: d.staff.map(s => (s.id === id ? { ...s, ...patch } : s)) })),
    deleteStaff: id => update(d => ({
      ...d,
      staff: d.staff.filter(s => s.id !== id),
      assignments: d.assignments.filter(a => a.staff_id !== id),
      absences: d.absences.filter(a => a.staff_id !== id),
    })),

    addUser: u => update(d => ({ ...d, users: [...d.users, { ...u, id: newId('u'), created_at: now() }] })),
    updateUser: (id, patch) => update(d => ({ ...d, users: d.users.map(u => (u.id === id ? { ...u, ...patch } : u)) })),
    deleteUser: id => update(d => ({
      ...d,
      users: d.users.filter(u => u.id !== id),
      assignments: d.assignments.filter(a => a.service_user_id !== id),
    })),

    // One staff member per service user per day, and one service user per staff member per day.
    assign: ({ staff_id, service_user_id, date, start_time, end_time }) => update(d => {
      const existing = d.assignments.find(a => a.date === date && a.service_user_id === service_user_id);
      const rest = d.assignments.filter(a => !(a.date === date && (a.staff_id === staff_id || a.service_user_id === service_user_id)));
      return {
        ...d,
        assignments: [...rest, {
          id: newId('a'),
          staff_id,
          service_user_id,
          date,
          start_time: start_time ?? existing?.start_time ?? d.settings.default_shift_start,
          end_time: end_time ?? existing?.end_time ?? d.settings.default_shift_end,
          created_at: now(),
        }],
      };
    }),
    unassign: (serviceUserId, date) => update(d => ({
      ...d,
      assignments: d.assignments.filter(a => !(a.date === date && a.service_user_id === serviceUserId)),
    })),
    clearDay: date => update(d => ({ ...d, assignments: d.assignments.filter(a => a.date !== date) })),
    replaceAssignments: (date, next) => update(d => ({
      ...d,
      assignments: [
        ...d.assignments.filter(a => a.date !== date),
        ...next.map(a => ({ ...a, date, id: newId('a'), created_at: now() })),
      ],
    })),

    addAbsence: a => update(d => ({ ...d, absences: [...d.absences, { ...a, id: newId('ab'), created_at: now() }] })),
    deleteAbsence: id => update(d => ({ ...d, absences: d.absences.filter(a => a.id !== id) })),

    updateSettings: patch => update(d => ({ ...d, settings: { ...d.settings, ...patch } })),
    resetDemoData: () => update(() => seed()),
  }), [data, ready, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useCarero() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCarero must be used inside <CareroProvider>');
  return ctx;
}
