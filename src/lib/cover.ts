import { addDays, format, getDay, parseISO } from 'date-fns';
import { Absence, Assignment, ServiceUser, Staff } from '@/types';

/** Local calendar date as yyyy-MM-dd (never UTC, so 7am shifts land on the right day). */
export const toDateKey = (d: Date) => format(d, 'yyyy-MM-dd');

export const todayKey = () => toDateKey(new Date());

/** "Monday", "Tuesday"... for a yyyy-MM-dd key, matching Staff.availability. */
export const weekdayName = (dateKey: string) => format(parseISO(dateKey), 'EEEE');

/** Last working day (Friday) of the week containing dateKey; dateKey itself if it's already the weekend. */
export const endOfWorkingWeek = (dateKey: string) => {
  const d = parseISO(dateKey);
  const dow = getDay(d); // 0 = Sun ... 6 = Sat
  if (dow === 0 || dow === 6) return dateKey;
  return toDateKey(addDays(d, 5 - dow));
};

export const getAbsenceOn = (staffId: string, dateKey: string, absences: Absence[]) =>
  absences.find(a => a.staff_id === staffId && a.start_date <= dateKey && dateKey <= a.end_date);

export const isAbsentOn = (staffId: string, dateKey: string, absences: Absence[]) =>
  Boolean(getAbsenceOn(staffId, dateKey, absences));

/** Required skills the staff member is missing for this service user (case-insensitive). */
export const missingSkills = (member: Staff, user: ServiceUser) => {
  const have = new Set(member.skills.map(s => s.trim().toLowerCase()));
  return (user.required_skills ?? []).filter(s => !have.has(s.trim().toLowerCase()));
};

export interface Suggestion {
  staff: Staff;
  score: number;
  reasons: string[];
}

interface SuggestArgs {
  user: ServiceUser;
  dateKey: string;
  staff: Staff[];
  assignments: Assignment[]; // assignments for dateKey
  absences: Absence[];
  /** staff ids to treat as already taken (e.g. picked earlier in a bulk reassign) */
  exclude?: Set<string>;
}

/**
 * Who could safely cover this service user on this day?
 * Hard rules (filtered out): absent, already booked that day, support level too low,
 * missing a required skill. Soft rules (ranked): preferred match, normally works that day.
 */
export function suggestReplacements({ user, dateKey, staff, assignments, absences, exclude }: SuggestArgs): Suggestion[] {
  const day = weekdayName(dateKey);
  const booked = new Set(assignments.filter(a => a.date === dateKey).map(a => a.staff_id));

  return staff
    .filter(s => !exclude?.has(s.id))
    .filter(s => !isAbsentOn(s.id, dateKey, absences))
    .filter(s => !booked.has(s.id))
    .filter(s => s.support_level_max >= user.support_level)
    .filter(s => missingSkills(s, user).length === 0)
    .map(s => {
      const reasons: string[] = [];
      let score = 0;
      if (user.preferred_staff.includes(s.id) || s.preferred_users.includes(user.id)) {
        score += 10;
        reasons.push('Preferred match');
      }
      if (s.availability.includes(day)) {
        score += 5;
        reasons.push(`Usually works ${day}s`);
      } else {
        reasons.push(`Not usually in on ${day}s`);
      }
      if ((user.required_skills ?? []).length > 0) reasons.push('Has required training');
      return { staff: s, score, reasons };
    })
    .sort((a, b) => b.score - a.score || a.staff.name.localeCompare(b.staff.name));
}

/** Assignments on dateKey whose staff member is absent that day. */
export const uncoveredAssignments = (dateKey: string, assignments: Assignment[], absences: Absence[]) =>
  assignments.filter(a => a.date === dateKey && isAbsentOn(a.staff_id, dateKey, absences));

/**
 * Pick one replacement per uncovered assignment, never using the same person twice.
 * Highest-need service users (support level) are filled first.
 */
export function planQuickReassign(args: {
  dateKey: string;
  staff: Staff[];
  users: ServiceUser[];
  assignments: Assignment[];
  absences: Absence[];
}) {
  const { dateKey, staff, users, assignments, absences } = args;
  const taken = new Set<string>();
  const uncovered = uncoveredAssignments(dateKey, assignments, absences)
    .map(a => ({ a, user: users.find(u => u.id === a.service_user_id) }))
    .filter((x): x is { a: Assignment; user: ServiceUser } => Boolean(x.user))
    .sort((x, y) => y.user.support_level - x.user.support_level);

  const filled: { assignment: Assignment; staff: Staff }[] = [];
  const unfilled: ServiceUser[] = [];

  for (const { a, user } of uncovered) {
    const [best] = suggestReplacements({ user, dateKey, staff, assignments, absences, exclude: taken });
    if (best) {
      taken.add(best.staff.id);
      filled.push({ assignment: a, staff: best.staff });
    } else {
      unfilled.push(user);
    }
  }
  return { filled, unfilled };
}
