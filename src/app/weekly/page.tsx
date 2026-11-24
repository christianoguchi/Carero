"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { AlertCircle, ChevronLeft, ChevronRight, Copy, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCarero } from '@/lib/store';
import { getAbsenceOn, isAbsentOn, toDateKey, todayKey } from '@/lib/cover';
import { exportToPDF } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';

const mondayOf = (dateKey: string) => toDateKey(startOfWeek(parseISO(dateKey), { weekStartsOn: 1 }));

export default function WeeklyPage() {
  const store = useCarero();
  const { staff, users, assignments, absences, coverRequests } = store;
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayKey()));
  const [exporting, setExporting] = useState(false);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toDateKey(addDays(parseISO(weekStart), i))),
    [weekStart]
  );
  const today = todayKey();
  const staffById = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);

  const cell = (userId: string, day: string) => {
    const a = assignments.find(x => x.date === day && x.service_user_id === userId);
    if (!a) return { kind: 'empty' as const };
    const member = staffById.get(a.staff_id);
    const absent = isAbsentOn(a.staff_id, day, absences);
    const requested = coverRequests.some(r => r.service_user_id === userId && r.date === day && r.status === 'open');
    return { kind: absent ? ('uncovered' as const) : ('covered' as const), a, member, requested };
  };

  const dayStats = days.map(day => {
    const dayAssignments = assignments.filter(a => a.date === day);
    const uncovered = dayAssignments.filter(a => isAbsentOn(a.staff_id, day, absences)).length;
    return {
      day,
      covered: dayAssignments.length - uncovered,
      uncovered,
      off: staff.filter(s => isAbsentOn(s.id, day, absences)),
    };
  });
  const totalUncovered = dayStats.reduce((n, d) => n + d.uncovered, 0);

  const shiftWeek = (weeks: number) => setWeekStart(w => toDateKey(addDays(parseISO(w), weeks * 7)));

  const copyLastWeek = () => {
    const emptyDays = days.filter(day => !assignments.some(a => a.date === day));
    if (emptyDays.length === 0) {
      toast({ title: 'Nothing to copy', description: 'Every day this week already has assignments.' });
      return;
    }
    let copiedDays = 0;
    let needCover = 0;
    for (const day of emptyDays) {
      const lastWeek = toDateKey(addDays(parseISO(day), -7));
      const source = assignments.filter(a => a.date === lastWeek);
      if (source.length === 0) continue;
      store.replaceAssignments(
        day,
        source.map(({ staff_id, service_user_id, start_time, end_time, notes }) => ({ staff_id, service_user_id, start_time, end_time, notes, date: day }))
      );
      copiedDays++;
      needCover += source.filter(a => isAbsentOn(a.staff_id, day, absences)).length;
    }
    toast({
      title: copiedDays ? 'Copied last week' : 'Nothing to copy',
      description: copiedDays
        ? `Filled ${copiedDays} empty day${copiedDays === 1 ? '' : 's'} from last week.` + (needCover ? ` ${needCover} shift${needCover === 1 ? '' : 's'} need cover because of absence.` : '')
        : 'Last week had no assignments on this week’s empty days.',
    });
  };

  const print = async () => {
    setExporting(true);
    await exportToPDF('weekly-rota', `weekly-rota-${weekStart}`, 'landscape');
    setExporting(false);
  };

  if (!store.ready) return null;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Weekly Rota</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => shiftWeek(-1)} aria-label="Previous week" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="text-slate-500 font-medium min-w-[12rem] text-center">
              {format(parseISO(days[0]), 'd MMM')} – {format(parseISO(days[6]), 'd MMM yyyy')}
            </p>
            <button onClick={() => shiftWeek(1)} aria-label="Next week" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
            {weekStart !== mondayOf(today) && (
              <button onClick={() => setWeekStart(mondayOf(today))} className="ml-1 px-3 py-1 text-xs font-bold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
                This week
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={copyLastWeek} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl font-semibold text-slate-700 calm-shadow hover:bg-slate-50 transition-colors">
            <Copy className="w-4 h-4 text-slate-400" /> Copy last week
          </button>
          <button onClick={print} disabled={exporting} className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50">
            <Printer className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Print week'}
          </button>
        </div>
      </header>

      {totalUncovered > 0 && (
        <div className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="font-bold text-rose-800">
            {totalUncovered} shift{totalUncovered === 1 ? '' : 's'} this week need{totalUncovered === 1 ? 's' : ''} cover. Click a red cell to sort it.
          </p>
        </div>
      )}

      <div id="weekly-rota" className="bg-white rounded-3xl calm-shadow border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="sticky left-0 z-10 bg-white text-left p-4 font-bold text-slate-400 text-xs uppercase tracking-wider w-44">Service user</th>
                {dayStats.map(({ day, covered, uncovered }) => (
                  <th key={day} className={cn('p-3 text-left align-top', day === today && 'bg-primary-50/60')}>
                    <Link href={`/?date=${day}`} className="block hover:text-primary-600">
                      <span className="block font-bold text-slate-800">{format(parseISO(day), 'EEE d')}</span>
                      <span className={cn('block text-[11px] font-bold', uncovered ? 'text-rose-600' : 'text-slate-400')}>
                        {covered + uncovered === 0 ? 'No shifts' : uncovered ? `${uncovered} need cover` : `${covered} covered`}
                      </span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">No service users yet. Add them on the Service Users page.</td>
                </tr>
              )}
              {users.map(user => (
                <tr key={user.id} className="border-b border-slate-50">
                  <th scope="row" className="sticky left-0 z-10 bg-white text-left p-4 align-top">
                    <span className="block font-bold text-slate-800">{user.name}</span>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase">Level {user.support_level} · {user.required_ratio}</span>
                  </th>
                  {days.map(day => {
                    const c = cell(user.id, day);
                    return (
                      <td key={day} className={cn('p-1.5 align-top', day === today && 'bg-primary-50/30')}>
                        <Link
                          href={`/?date=${day}`}
                          title={c.kind === 'uncovered' ? `${c.member?.name} is off – needs cover` : c.kind === 'covered' ? `${c.member?.name} ${c.a.start_time}–${c.a.end_time}` : 'Nobody assigned'}
                          className={cn(
                            'block rounded-xl p-2 min-h-[3.25rem] transition-colors',
                            c.kind === 'covered' && 'bg-primary-50 hover:bg-primary-100',
                            c.kind === 'uncovered' && 'bg-rose-50 border-2 border-rose-200 hover:bg-rose-100',
                            c.kind === 'empty' && 'border-2 border-dashed border-slate-100 hover:border-slate-300'
                          )}
                        >
                          {c.kind === 'covered' && (
                            <>
                              <span className="block font-bold text-primary-900 truncate">{c.member?.name.split(' ')[0] ?? 'Unknown'}</span>
                              <span className="block text-[10px] font-bold text-primary-500">{c.a.start_time}–{c.a.end_time}</span>
                            </>
                          )}
                          {c.kind === 'uncovered' && (
                            <>
                              <span className="block font-bold text-rose-700 truncate line-through decoration-rose-300">{c.member?.name.split(' ')[0]}</span>
                              <span className="block text-[10px] font-bold text-rose-600">{c.requested ? 'Cover requested' : 'Needs cover'}</span>
                            </>
                          )}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-slate-50/60">
                <th scope="row" className="sticky left-0 z-10 bg-slate-50 text-left p-4 align-top text-xs font-bold text-slate-400 uppercase tracking-wider">Off this week</th>
                {dayStats.map(({ day, off }) => (
                  <td key={day} className="p-2 align-top">
                    {off.length === 0 ? (
                      <span className="text-[11px] font-bold text-slate-300">–</span>
                    ) : (
                      off.map(s => (
                        <span key={s.id} className="block text-[11px] font-bold text-rose-600 truncate" title={`${s.name}: ${getAbsenceOn(s.id, day, absences)?.reason}`}>
                          {s.name.split(' ')[0]} · {getAbsenceOn(s.id, day, absences)?.reason}
                        </span>
                      ))
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400">
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-primary-50 border border-primary-100" /> Covered</span>
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-rose-50 border-2 border-rose-200" /> Staff off – needs cover</span>
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded border-2 border-dashed border-slate-200" /> Nobody assigned</span>
      </div>
    </div>
  );
}
