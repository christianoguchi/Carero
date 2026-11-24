import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Absence, Assignment, ServiceUser, Settings, Staff } from '@/types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Null when Carero runs in local demo mode (no Supabase configured). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export interface CloudData {
  staff: Staff[];
  users: ServiceUser[];
  assignments: Assignment[];
  absences: Absence[];
  settings: Settings;
}

// Columns that exist in the database, per table. Anything else on the app objects is UI-only.
const COLUMNS = {
  staff: ['id', 'name', 'role', 'skills', 'availability', 'preferred_users', 'notes', 'support_level_max', 'shift_limits', 'emergency_contact'],
  service_users: ['id', 'name', 'support_level', 'required_ratio', 'required_skills', 'preferred_staff', 'alerts', 'notes', 'sensory_notes', 'behaviour_notes', 'transport_notes', 'medication_reminders'],
  assignments: ['id', 'staff_id', 'service_user_id', 'date', 'start_time', 'end_time', 'notes'],
  absences: ['id', 'staff_id', 'start_date', 'end_date', 'reason', 'notes'],
} as const;

export type Table = keyof typeof COLUMNS;

const pick = (table: Table, row: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const c of COLUMNS[table]) if (row[c] !== undefined) out[c] = row[c];
  return out;
};

const hhmm = (t: string) => (t ? t.slice(0, 5) : t);

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Thin, organisation-scoped data access. Row-level security enforces the same scoping server-side. */
export function cloud(db: SupabaseClient, orgId: string) {
  const org = { organisation_id: orgId };

  return {
    async loadAll(): Promise<CloudData> {
      const [o, s, u, a, ab] = await Promise.all([
        db.from('organisations').select('*').eq('id', orgId).single(),
        db.from('staff').select('*').eq('organisation_id', orgId).order('name'),
        db.from('service_users').select('*').eq('organisation_id', orgId).order('name'),
        db.from('assignments').select('*').eq('organisation_id', orgId),
        db.from('absences').select('*').eq('organisation_id', orgId),
      ]);
      const orgRow = must(o) as { name: string; default_shift_start: string; default_shift_end: string };
      return {
        settings: {
          centre_name: orgRow.name,
          default_shift_start: hhmm(orgRow.default_shift_start),
          default_shift_end: hhmm(orgRow.default_shift_end),
        },
        staff: (must(s) as Staff[]).map(r => ({ ...r, notes: r.notes ?? '', status: 'available' as const })),
        users: must(u) as ServiceUser[],
        assignments: (must(a) as Assignment[]).map(r => ({ ...r, start_time: hhmm(r.start_time), end_time: hhmm(r.end_time) })),
        absences: must(ab) as Absence[],
      };
    },

    async insert(table: Table, rows: Record<string, unknown>[]) {
      if (rows.length === 0) return;
      must(await db.from(table).insert(rows.map(r => ({ ...pick(table, r), ...org }))));
    },

    async update(table: Table, id: string, patch: Record<string, unknown>) {
      const cols = pick(table, patch);
      delete cols.id;
      if (Object.keys(cols).length === 0) return;
      must(await db.from(table).update(cols).eq('id', id).eq('organisation_id', orgId));
    },

    async remove(table: Table, id: string) {
      must(await db.from(table).delete().eq('id', id).eq('organisation_id', orgId));
    },

    /** Free the slot (same person or same service user that day) before inserting the new assignment. */
    async assign(row: Assignment) {
      must(await db.from('assignments').delete()
        .eq('organisation_id', orgId)
        .eq('date', row.date)
        .or(`staff_id.eq.${row.staff_id},service_user_id.eq.${row.service_user_id}`));
      await this.insert('assignments', [row as unknown as Record<string, unknown>]);
    },

    async unassign(serviceUserId: string, date: string) {
      must(await db.from('assignments').delete().eq('organisation_id', orgId).eq('date', date).eq('service_user_id', serviceUserId));
    },

    async clearDay(date: string) {
      must(await db.from('assignments').delete().eq('organisation_id', orgId).eq('date', date));
    },

    async updateSettings(s: Partial<Settings>) {
      const patch: Record<string, string> = {};
      if (s.centre_name !== undefined) patch.name = s.centre_name;
      if (s.default_shift_start !== undefined) patch.default_shift_start = s.default_shift_start;
      if (s.default_shift_end !== undefined) patch.default_shift_end = s.default_shift_end;
      if (Object.keys(patch).length) must(await db.from('organisations').update(patch).eq('id', orgId));
    },

    /** Wipe this organisation's rota data (staff/service users cascade to assignments and absences). */
    async wipe() {
      must(await db.from('staff').delete().eq('organisation_id', orgId));
      must(await db.from('service_users').delete().eq('organisation_id', orgId));
    },
  };
}

export type Cloud = ReturnType<typeof cloud>;
