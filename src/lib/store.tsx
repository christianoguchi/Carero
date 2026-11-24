"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Absence, Assignment, CoverOffer, CoverRequest, ServiceUser, Settings, Staff } from '@/types';
import { mockServiceUsers, mockStaff } from './mockData';
import { todayKey } from './cover';
import { cloud, Cloud, supabase } from './supabase';

const PENDING_INVITE_KEY = 'carero:pending-invite';
export const rememberInvite = (token: string) => {
  try { localStorage.setItem(PENDING_INVITE_KEY, token); } catch { /* ignore */ }
};
export const pendingInvite = () => {
  try { return localStorage.getItem(PENDING_INVITE_KEY); } catch { return null; }
};
const forgetInvite = () => {
  try { localStorage.removeItem(PENDING_INVITE_KEY); } catch { /* ignore */ }
};
import { toast } from '@/hooks/use-toast';

/**
 * Carero data store.
 *
 * Two modes:
 *  - cloud: Supabase is configured. Users sign in, belong to an organisation (their centre),
 *    and every change is written to the database. The screen updates immediately and
 *    reloads from the server if a save fails.
 *  - local: no Supabase configured. Data is saved in this browser only (demo mode).
 */

export interface CareroData {
  staff: Staff[];
  users: ServiceUser[];
  assignments: Assignment[];
  absences: Absence[];
  coverRequests: CoverRequest[];
  coverOffers: CoverOffer[];
  settings: Settings;
}

export type Status = 'loading' | 'signed-out' | 'no-organisation' | 'ready';

const STORAGE_KEY = 'carero:data:v1';

export const defaultSettings: Settings = {
  centre_name: 'My Centre',
  default_shift_start: '07:00',
  default_shift_end: '15:00',
};

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

const emptyData = (): CareroData => ({
  staff: [], users: [], assignments: [], absences: [], coverRequests: [], coverOffers: [], settings: defaultSettings,
});

/** Demo data with fresh ids (valid database uuids), keeping the links between records. */
function demoData(settings: Settings = defaultSettings): CareroData {
  const ids = new Map<string, string>();
  const id = (old: string) => {
    if (!ids.has(old)) ids.set(old, uuid());
    return ids.get(old)!;
  };
  const now = new Date().toISOString();
  const date = todayKey();
  const staff = mockStaff.map(s => ({ ...s, id: id(s.id), preferred_users: s.preferred_users.map(id), created_at: now }));
  const users = mockServiceUsers.map(u => ({ ...u, id: id(u.id), preferred_staff: u.preferred_staff.map(id), created_at: now }));
  const shift = { date, start_time: settings.default_shift_start, end_time: settings.default_shift_end, created_at: now };
  return {
    staff,
    users,
    assignments: [
      { id: uuid(), staff_id: id('s1'), service_user_id: id('u1'), ...shift },
      { id: uuid(), staff_id: id('s2'), service_user_id: id('u2'), ...shift },
    ],
    absences: [],
    coverRequests: [],
    coverOffers: [],
    settings,
  };
}

function loadLocal(): CareroData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return demoData();
    const parsed = JSON.parse(raw) as Partial<CareroData>;
    return {
      staff: parsed.staff ?? [],
      users: parsed.users ?? [],
      assignments: parsed.assignments ?? [],
      absences: parsed.absences ?? [],
      coverRequests: [],
      coverOffers: [],
      settings: { ...defaultSettings, ...parsed.settings },
    };
  } catch {
    return demoData();
  }
}

function saveLocal(data: CareroData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (private mode): keep working in memory.
  }
}

interface CareroStore extends CareroData {
  mode: 'cloud' | 'local';
  status: Status;
  ready: boolean;
  session: Session | null;
  /** The signed-in user's role in their centre (cloud mode). */
  role: 'manager' | 'staff' | null;
  /** Organisation-scoped API (cloud mode, signed in with a centre). */
  api: Cloud | null;
  // auth
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  createOrganisation: (name: string) => Promise<string | null>;
  acceptInvitation: (token: string) => Promise<string>;
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
  // cover requests (cloud mode only)
  createCoverRequest: (
    req: Pick<CoverRequest, 'service_user_id' | 'date' | 'start_time' | 'end_time'>,
    staffIds: string[]
  ) => Promise<{ request: CoverRequest; offers: CoverOffer[] } | { error: string }>;
  cancelCoverRequest: (id: string) => void;
  refresh: () => Promise<void>;
  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemoData: () => void;
}

const Ctx = createContext<CareroStore | null>(null);

export function CareroProvider({ children }: { children: React.ReactNode }) {
  const mode: 'cloud' | 'local' = supabase ? 'cloud' : 'local';
  const [data, setData] = useState<CareroData>(emptyData);
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [api, setApi] = useState<Cloud | null>(null);
  const [role, setRole] = useState<'manager' | 'staff' | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const localLoaded = useRef(false);

  // ---- Loading -------------------------------------------------------------

  const loadOrganisation = useCallback(async (s: Session | null) => {
    if (!supabase) return;
    setSession(s);
    if (!s) {
      setApi(null);
      setData(emptyData());
      setStatus('signed-out');
      return;
    }
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select('organisation_id, role')
      .eq('user_id', s.user.id)
      .limit(1);
    if (error) {
      toast({ title: 'Could not load your centre', description: error.message });
      return;
    }
    const orgId = memberships?.[0]?.organisation_id as string | undefined;
    setRole((memberships?.[0]?.role as 'manager' | 'staff' | undefined) ?? null);
    if (!orgId) {
      setApi(null);
      setStatus('no-organisation');
      return;
    }
    const c = cloud(supabase, orgId);
    try {
      setData(await c.loadAll());
      setApi(c);
      setStatus('ready');
    } catch (e) {
      toast({ title: 'Could not load rota data', description: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setData(loadLocal());
      localLoaded.current = true;
      setStatus('ready');
      return;
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => loadOrganisation(s));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') loadOrganisation(s);
      else if (s) setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadOrganisation]);

  useEffect(() => {
    if (mode === 'local' && localLoaded.current) saveLocal(data);
  }, [data, mode]);

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setData(await api.loadAll());
    } catch {
      /* offline or transient: keep current view */
    }
  }, [api]);

  // While any cover request is open, check for replies every 20s and whenever the tab regains focus.
  const hasOpenRequest = data.coverRequests.some(r => r.status === 'open');
  useEffect(() => {
    if (!api) return;
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    const timer = hasOpenRequest ? window.setInterval(refresh, 20_000) : undefined;
    return () => {
      window.removeEventListener('focus', onFocus);
      if (timer) window.clearInterval(timer);
    };
  }, [api, hasOpenRequest, refresh]);

  // ---- Write helpers -------------------------------------------------------

  /** Update the screen now; in cloud mode, save in the background and resync if it fails. */
  const commit = useCallback(
    (fn: (d: CareroData) => CareroData, remote?: (c: Cloud) => Promise<unknown>) => {
      setData(fn);
      if (api && remote) {
        remote(api).catch(async (e: Error) => {
          toast({ title: "Couldn't save that change", description: e.message });
          try {
            setData(await api.loadAll());
          } catch {
            /* keep current view */
          }
        });
      }
    },
    [api]
  );

  const now = () => new Date().toISOString();

  const store = useMemo<CareroStore>(() => ({
    ...data,
    mode,
    status,
    ready: status === 'ready',
    session,
    role,
    api,

    signIn: async (email, password) => {
      if (!supabase) return 'Not configured';
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error?.message ?? null;
    },
    signUp: async (email, password) => {
      if (!supabase) return { error: 'Not configured', needsConfirmation: false };
      const { data: d, error } = await supabase.auth.signUp({
        email,
        password,
        // Come back to the same page (e.g. an invite link) after confirming the email.
        options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.href : undefined },
      });
      return { error: error?.message ?? null, needsConfirmation: !error && !d.session };
    },
    signOut: async () => {
      await supabase?.auth.signOut();
    },
    acceptInvitation: async token => {
      if (!supabase) return 'invalid';
      const { data: res, error } = await supabase.rpc('accept_invitation', { invite_token: token });
      if (error) return error.message;
      if (res === 'joined' || res === 'already_member') {
        forgetInvite();
        const { data: { session: s } } = await supabase.auth.getSession();
        await loadOrganisation(s);
      }
      return res as string;
    },
    createOrganisation: async name => {
      if (!supabase) return 'Not configured';
      const { error } = await supabase.rpc('create_organisation', { org_name: name });
      if (error) return error.message;
      const { data: { session: s } } = await supabase.auth.getSession();
      await loadOrganisation(s);
      return null;
    },

    addStaff: s => {
      const row: Staff = { ...s, id: uuid(), created_at: now() };
      commit(d => ({ ...d, staff: [...d.staff, row] }), c => c.insert('staff', [row as never]));
    },
    updateStaff: (id, patch) =>
      commit(d => ({ ...d, staff: d.staff.map(s => (s.id === id ? { ...s, ...patch } : s)) }), c => c.update('staff', id, patch)),
    deleteStaff: id =>
      commit(d => ({
        ...d,
        staff: d.staff.filter(s => s.id !== id),
        assignments: d.assignments.filter(a => a.staff_id !== id),
        absences: d.absences.filter(a => a.staff_id !== id),
      }), c => c.remove('staff', id)),

    addUser: u => {
      const row: ServiceUser = { ...u, id: uuid(), created_at: now() };
      commit(d => ({ ...d, users: [...d.users, row] }), c => c.insert('service_users', [row as never]));
    },
    updateUser: (id, patch) =>
      commit(d => ({ ...d, users: d.users.map(u => (u.id === id ? { ...u, ...patch } : u)) }), c => c.update('service_users', id, patch)),
    deleteUser: id =>
      commit(d => ({
        ...d,
        users: d.users.filter(u => u.id !== id),
        assignments: d.assignments.filter(a => a.service_user_id !== id),
      }), c => c.remove('service_users', id)),

    // One staff member per service user per day, and one service user per staff member per day.
    assign: ({ staff_id, service_user_id, date, start_time, end_time }) => {
      const d0 = dataRef.current;
      const existing = d0.assignments.find(a => a.date === date && a.service_user_id === service_user_id);
      const row: Assignment = {
        id: uuid(),
        staff_id,
        service_user_id,
        date,
        start_time: start_time ?? existing?.start_time ?? d0.settings.default_shift_start,
        end_time: end_time ?? existing?.end_time ?? d0.settings.default_shift_end,
        created_at: now(),
      };
      commit(d => ({
        ...d,
        assignments: [
          ...d.assignments.filter(a => !(a.date === date && (a.staff_id === staff_id || a.service_user_id === service_user_id))),
          row,
        ],
      }), c => c.assign(row));
    },
    unassign: (serviceUserId, date) =>
      commit(d => ({
        ...d,
        assignments: d.assignments.filter(a => !(a.date === date && a.service_user_id === serviceUserId)),
      }), c => c.unassign(serviceUserId, date)),
    clearDay: date =>
      commit(d => ({ ...d, assignments: d.assignments.filter(a => a.date !== date) }), c => c.clearDay(date)),
    replaceAssignments: (date, next) => {
      const rows: Assignment[] = next.map(a => ({ ...a, date, id: uuid(), created_at: now() }));
      commit(d => ({ ...d, assignments: [...d.assignments.filter(a => a.date !== date), ...rows] }), async c => {
        await c.clearDay(date);
        await c.insert('assignments', rows as never[]);
      });
    },

    addAbsence: a => {
      const row: Absence = { ...a, id: uuid(), created_at: now() };
      commit(d => ({ ...d, absences: [...d.absences, row] }), c => c.insert('absences', [row as never]));
    },
    deleteAbsence: id =>
      commit(d => ({ ...d, absences: d.absences.filter(a => a.id !== id) }), c => c.remove('absences', id)),

    createCoverRequest: async (req, staffIds) => {
      if (!api) return { error: 'Sign in to send cover requests.' };
      try {
        const res = await api.createCoverRequest(req, staffIds);
        setData(d => ({
          ...d,
          coverRequests: [
            ...d.coverRequests.map(r =>
              r.service_user_id === req.service_user_id && r.date === req.date && r.status === 'open'
                ? { ...r, status: 'cancelled' as const }
                : r
            ),
            res.request,
          ],
          coverOffers: [...d.coverOffers, ...res.offers],
        }));
        return res;
      } catch (e) {
        return { error: (e as Error).message };
      }
    },
    cancelCoverRequest: id =>
      commit(d => ({
        ...d,
        coverRequests: d.coverRequests.map(r => (r.id === id ? { ...r, status: 'cancelled' as const } : r)),
      }), c => c.cancelCoverRequest(id)),
    refresh,

    updateSettings: patch =>
      commit(d => ({ ...d, settings: { ...d.settings, ...patch } }), c => c.updateSettings(patch)),
    resetDemoData: () => {
      const demo = demoData(dataRef.current.settings);
      commit(() => demo, async c => {
        await c.wipe();
        await c.insert('staff', demo.staff as never[]);
        await c.insert('service_users', demo.users as never[]);
        await c.insert('assignments', demo.assignments as never[]);
      });
    },
  }), [data, mode, status, session, role, commit, loadOrganisation, api, refresh]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useCarero() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCarero must be used inside <CareroProvider>');
  return ctx;
}
