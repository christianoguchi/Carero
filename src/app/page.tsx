"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  AlertCircle, 
  FileText,
  Search,
  ArrowRight,
  CheckCircle2,
  X,
  RefreshCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Send,
  Clock
} from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Absence } from '@/types';
import { useCarero } from '@/lib/store';
import {
  endOfWorkingWeek,
  getAbsenceOn,
  isAbsentOn,
  planQuickReassign,
  suggestReplacements,
  toDateKey,
  todayKey,
  uncoveredAssignments,
} from '@/lib/cover';

import { exportToPDF } from '@/lib/exportUtils';

import { 
  DndContext, 
  DragEndEvent, 
  PointerSensor, 
  KeyboardSensor, 
  useSensor, 
  useSensors,
  closestCenter,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Draggable } from '@/components/Draggable';
import { Droppable } from '@/components/Droppable';

import { QuickActions } from '@/components/QuickActions';
import { CoverRequestModal } from '@/components/CoverRequestModal';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { toast } = useToast();
  const store = useCarero();
  const { staff, users, absences, settings } = store;

  const [date, setDate] = useState<string>(todayKey());
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [selectedStaffForEmergency, setSelectedStaffForEmergency] = useState<string | null>(null);
  const [absenceStart, setAbsenceStart] = useState<string>(date);
  const [absenceEnd, setAbsenceEnd] = useState<string>(date);
  const [absenceReason, setAbsenceReason] = useState<Absence['reason']>('sick');
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [coverFor, setCoverFor] = useState<string | null>(null);

  // Open a specific day when linked from the weekly view (/?date=yyyy-MM-dd).
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDate(d);
  }, []);

  const assignments = store.assignments.filter(a => a.date === date);
  const absentStaff = staff.filter(s => isAbsentOn(s.id, date, absences));
  const presentStaff = staff.filter(s => !isAbsentOn(s.id, date, absences));
  const freeStaff = presentStaff
    .filter(s => !assignments.some(a => a.staff_id === s.id))
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const shiftDate = (days: number) => setDate(d => toDateKey(addDays(parseISO(d), days)));

  const handleUnassignAll = () => {
    if (confirm('Are you sure you want to clear the entire board for this day?')) {
      store.clearDay(date);
      toast({
        title: "Board Cleared",
        description: "All assignments for this day have been removed.",
      });
    }
  };

  const handleAutoFill = () => {
    // Fill empty service users, highest support level first, using the same safety rules as sick cover.
    const taken = new Set(assignments.map(a => a.staff_id));
    const empty = users
      .filter(u => !assignments.some(a => a.service_user_id === u.id))
      .sort((a, b) => b.support_level - a.support_level);
    let filledCount = 0;
    for (const user of empty) {
      const [best] = suggestReplacements({ user, dateKey: date, staff, assignments, absences, exclude: taken });
      if (best) {
        taken.add(best.staff.id);
        store.assign({ staff_id: best.staff.id, service_user_id: user.id, date });
        filledCount++;
      }
    }
    toast({
      title: filledCount > 0 ? "Auto-Fill Complete" : "Auto-Fill",
      description: filledCount > 0
        ? `Automatically assigned ${filledCount} staff member${filledCount === 1 ? '' : 's'}.`
        : "No suitable staff found for remaining slots.",
    });
  };

  const handleDuplicateYesterday = () => {
    const prev = toDateKey(addDays(parseISO(date), -1));
    const source = store.assignments.filter(a => a.date === prev);
    if (source.length === 0) {
      toast({ title: "Nothing to copy", description: `No assignments on ${format(parseISO(prev), 'EEEE d MMM')}.` });
      return;
    }
    store.replaceAssignments(date, source.map(({ staff_id, service_user_id, start_time, end_time, notes }) => ({
      staff_id, service_user_id, start_time, end_time, notes, date,
    })));
    const absentCopied = source.filter(a => isAbsentOn(a.staff_id, date, absences)).length;
    toast({
      title: "Rota Copied",
      description: `Copied ${source.length} assignment${source.length === 1 ? '' : 's'} from ${format(parseISO(prev), 'EEEE')}.` +
        (absentCopied ? ` ${absentCopied} need cover because of absence.` : ''),
    });
  };

  const assignTo = (staffId: string, userId: string) => {
    store.assign({ staff_id: staffId, service_user_id: userId, date });
    toast({
      title: "Assignment Updated",
      description: `Assigned ${staff.find(s => s.id === staffId)?.name} to ${users.find(u => u.id === userId)?.name}`,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && over.id.toString().startsWith('user-')) {
      assignTo(active.id.toString(), over.id.toString().replace('user-', ''));
    }
  };

  const removeAssignment = (userId: string) => {
    store.unassign(userId, date);
    toast({
      title: "Assignment Removed",
      description: "The staff member has been unassigned.",
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    await exportToPDF('rota-board', `daily-rota-${date}`);
    setIsExporting(false);
  };

  const getAssignmentForUser = (userId: string) => assignments.find(a => a.service_user_id === userId);

  const getStaffForUser = (userId: string) => {
    const assignment = getAssignmentForUser(userId);
    if (!assignment) return null;
    return staff.find(s => s.id === assignment.staff_id);
  };

  const openAbsenceModal = () => {
    setAbsenceStart(date);
    setAbsenceEnd(date);
    setAbsenceReason('sick');
    setSelectedStaffForEmergency(null);
    setIsEmergencyMode(true);
  };

  const handleMarkSick = (staffId: string) => {
    const member = staff.find(s => s.id === staffId);
    const end = absenceEnd < absenceStart ? absenceStart : absenceEnd;
    store.addAbsence({ staff_id: staffId, start_date: absenceStart, end_date: end, reason: absenceReason });
    setSelectedStaffForEmergency(null);
    setIsEmergencyMode(false);
    const range = absenceStart === end
      ? format(parseISO(absenceStart), 'EEE d MMM')
      : `${format(parseISO(absenceStart), 'EEE d MMM')} – ${format(parseISO(end), 'EEE d MMM')}`;
    toast({
      title: "Absence Logged",
      description: `${member?.name} is off ${range}. Affected shifts are highlighted.`,
    });
  };

  const uncovered = uncoveredAssignments(date, store.assignments, absences);
  const affectedUsers = users.filter(u => uncovered.some(a => a.service_user_id === u.id));

  const handleQuickReassign = () => {
    const { filled, unfilled } = planQuickReassign({ dateKey: date, staff, users, assignments, absences });
    filled.forEach(({ assignment, staff: s }) =>
      store.assign({
        staff_id: s.id,
        service_user_id: assignment.service_user_id,
        date,
        start_time: assignment.start_time,
        end_time: assignment.end_time,
      })
    );
    toast({
      title: unfilled.length === 0 ? "All shifts covered" : "Some shifts still need cover",
      description: [
        filled.length ? `Covered: ${filled.map(f => `${users.find(u => u.id === f.assignment.service_user_id)?.name} → ${f.staff.name}`).join(', ')}.` : '',
        unfilled.length ? `No suitable staff for ${unfilled.map(u => u.name).join(', ')}.` : '',
      ].filter(Boolean).join(' '),
    });
  };

  const getSuggestedReplacements = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return [];
    return suggestReplacements({ user, dateKey: date, staff, assignments, absences }).slice(0, 3);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Morning Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => shiftDate(-1)} aria-label="Previous day" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="text-slate-500 font-medium min-w-[11rem] text-center">{format(parseISO(date), 'EEEE, d MMMM yyyy')}</p>
            <button onClick={() => shiftDate(1)} aria-label="Next day" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
            {date !== todayKey() && (
              <button onClick={() => setDate(todayKey())} className="ml-1 px-3 py-1 text-xs font-bold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
                Today
              </button>
            )}
            <label className="relative p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer" aria-label="Pick a date">
              <CalendarDays className="w-5 h-5" />
              <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl font-semibold text-slate-700 calm-shadow hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <FileText className={cn("w-5 h-5 text-slate-400", isExporting && "animate-pulse")} />
            {isExporting ? 'Exporting...' : 'Print Daily Rota'}
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-2xl font-semibold calm-shadow hover:bg-primary-600 transition-colors">
            <Plus className="w-5 h-5" />
            New Assignment
          </button>
        </div>
      </header>

      {/* Emergency Alert Banner */}
      <AnimatePresence>
        {affectedUsers.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-rose-900">Staff Absence Alert</h3>
                  <p className="text-rose-600 font-medium">
                    {affectedUsers.length} service user{affectedUsers.length === 1 ? '' : 's'} need{affectedUsers.length === 1 ? 's' : ''} cover: {absentStaff.filter(s => uncovered.some(a => a.staff_id === s.id)).map(s => s.name).join(', ')} {absentStaff.filter(s => uncovered.some(a => a.staff_id === s.id)).length === 1 ? 'is' : 'are'} off.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleQuickReassign} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold calm-shadow hover:bg-rose-700 transition-colors flex items-center gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Quick Reassign
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickActions 
        onUnassignAll={handleUnassignAll}
        onAutoFill={handleAutoFill}
        onDuplicateYesterday={handleDuplicateYesterday}
        onPrint={handleExport}
      />

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Rota Board */}
          <div className="lg:col-span-8 space-y-6" id="rota-board">
            <div className="bg-white p-6 rounded-3xl calm-shadow border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-800">Assignment Board</h2>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <div className="w-3 h-3 bg-primary-400 rounded-full" />
                    Assigned
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <div className="w-3 h-3 bg-slate-200 rounded-full border-2 border-dashed border-slate-300" />
                    Empty
                  </div>
                </div>
              </div>

              {/* Service User Slots */}
            <div className="space-y-4">
              {users.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold">No service users found.</p>
                </div>
              )}
              {users.map((user) => {
                  const assignedStaff = getStaffForUser(user.id);
                  const assignment = getAssignmentForUser(user.id);
                  const isAffected = affectedUsers.some(u => u.id === user.id);

                  return (
                    <Droppable 
                      key={user.id} 
                      id={`user-${user.id}`}
                      className={cn(
                        "group p-5 rounded-2xl border-2 transition-all cursor-pointer relative",
                        assignedStaff && !isAffected 
                          ? "bg-white border-slate-100 calm-shadow" 
                          : isAffected
                          ? "bg-rose-50/50 border-rose-200 border-dashed animate-pulse"
                          : "bg-slate-50/50 border-dashed border-slate-200 hover:border-primary-200"
                      )}
                      isOverClassName="border-primary-500 bg-primary-50/50 scale-[1.01]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg",
                            user.support_level === 3 ? "bg-rose-100 text-rose-600" :
                            user.support_level === 2 ? "bg-amber-100 text-amber-600" :
                            "bg-sky-100 text-sky-600"
                          )}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">{user.name}</h3>
                            {isAffected && assignedStaff && (
                              <p className="text-[10px] font-bold text-rose-500 uppercase">{assignedStaff.name} off {getAbsenceOn(assignedStaff.id, date, absences)?.reason === 'sick' ? 'sick' : ''}</p>
                            )}
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ratio {user.required_ratio}</span>
                              {user.alerts.length > 0 && (
                                <span className="text-[10px] font-black uppercase text-rose-500 bg-rose-50 px-1.5 rounded flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {user.alerts[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {assignedStaff && !isAffected ? (
                            <motion.div 
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="flex items-center gap-3 bg-primary-50 px-4 py-2 rounded-xl border border-primary-100"
                            >
                              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                {assignedStaff.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-primary-900">{assignedStaff.name}</p>
                                <p className="text-[10px] font-bold text-primary-500 uppercase">{assignment?.start_time} - {assignment?.end_time}</p>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAssignment(user.id);
                                }}
                                className="ml-2 text-primary-300 hover:text-primary-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ) : isAffected ? (
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                                <AlertCircle className="w-4 h-4" />
                                Replacement Needed
                              </div>
                              <div className="flex flex-wrap justify-end items-center gap-1">
                                {store.mode === 'cloud' && (() => {
                                  const req = store.coverRequests.find(r => r.service_user_id === user.id && r.date === date && r.status === 'open');
                                  const offers = req ? store.coverOffers.filter(o => o.request_id === req.id) : [];
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCoverFor(user.id);
                                      }}
                                      className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors",
                                        req ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-rose-600 text-white hover:bg-rose-700"
                                      )}
                                    >
                                      {req ? <Clock className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                                      {req ? `Cover requested · ${offers.filter(o => o.response).length}/${offers.length} replied` : 'Request cover'}
                                    </button>
                                  );
                                })()}
                                {getSuggestedReplacements(user.id).length === 0 && (
                                  <span className="text-[10px] font-bold text-rose-400">No suitable staff free{(user.required_skills ?? []).length > 0 ? ` (needs ${user.required_skills!.join(', ')})` : ''}</span>
                                )}
                                {getSuggestedReplacements(user.id).map(({ staff: member, reasons }) => (
                                  <button
                                    key={member.id}
                                    title={reasons.join(' · ')}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      assignTo(member.id, user.id);
                                    }}
                                    className="px-2 py-1 bg-white border border-rose-200 rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    + {member.name.split(' ')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="h-12 px-6 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-sm font-bold text-slate-400 group-hover:text-primary-500 group-hover:border-primary-200 transition-colors">
                              Drag staff here
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Smart Suggestion Bubble */}
                      {!assignedStaff && !isAffected && (
                        <div className="absolute -bottom-2 right-12 bg-white px-3 py-1 rounded-full shadow-sm border border-primary-100 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Sparkles className="w-3 h-3 text-primary-500" />
                          <span className="text-[10px] font-bold text-primary-600">
                            {(() => {
                              const [best] = getSuggestedReplacements(user.id);
                              if (!best) return 'No suitable staff free';
                              return `${best.staff.name.split(' ')[0]}: ${best.reasons[0]}`;
                            })()}
                          </span>
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Staff Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl calm-shadow border border-slate-100 sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Available Staff</h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-32 focus:w-48 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {freeStaff.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-xs font-bold uppercase">All staff assigned or absent</p>
                  </div>
                )}
                {freeStaff.map((member) => (
                  <Draggable key={member.id} id={member.id}>
                    <div 
                      className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:scale-[1.02] hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-primary-500"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-bold text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{member.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{member.role}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-primary-400 transition-colors" />
                      </div>
                    </div>
                  </Draggable>
                ))}
              </div>

              {absentStaff.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Off today</p>
                  {absentStaff.map(member => {
                    const ab = getAbsenceOn(member.id, date, absences)!;
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-rose-50/60 border border-rose-100 rounded-xl">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{member.name}</p>
                          <p className="text-[10px] font-bold text-rose-500 uppercase">
                            {ab.reason} · until {format(parseISO(ab.end_date), 'EEE d MMM')}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            store.deleteAbsence(ab.id);
                            toast({ title: "Absence removed", description: `${member.name} is back on the rota.` });
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-white transition-colors"
                        >
                          Back early
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Absence Button */}
              <button 
                onClick={openAbsenceModal}
                className="w-full mt-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl border border-rose-100 transition-all group flex flex-col items-center gap-1"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Staff Called In Sick?
                </div>
                <span className="text-[10px] font-bold text-rose-400 uppercase">Click to mark absence</span>
              </button>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="p-4 bg-white border border-primary-500 rounded-2xl shadow-2xl opacity-90 scale-105">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold">
                  {staff.find(s => s.id === activeId)?.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{staff.find(s => s.id === activeId)?.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{staff.find(s => s.id === activeId)?.role}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {coverFor && (() => {
          const u = users.find(x => x.id === coverFor);
          const a = store.assignments.find(x => x.date === date && x.service_user_id === coverFor);
          if (!u) return null;
          return (
            <CoverRequestModal
              key={coverFor}
              user={u}
              date={date}
              startTime={a?.start_time ?? settings.default_shift_start}
              endTime={a?.end_time ?? settings.default_shift_end}
              onClose={() => setCoverFor(null)}
            />
          );
        })()}
      </AnimatePresence>

      {/* Emergency Modal */}
      <AnimatePresence>
        {isEmergencyMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEmergencyMode(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Mark Staff Absence</h2>
                    <p className="text-slate-500 font-medium">Who&apos;s off, and for how long?</p>
                  </div>
                  <button onClick={() => setIsEmergencyMode(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
                  {presentStaff.map(member => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedStaffForEmergency(member.id)}
                      className={cn(
                        "w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between",
                        selectedStaffForEmergency === member.id 
                          ? "border-rose-500 bg-rose-50" 
                          : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-500">
                          {member.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-900">{member.name}</p>
                          <p className="text-xs font-medium text-slate-400">{member.role}</p>
                        </div>
                      </div>
                      {selectedStaffForEmergency === member.id && (
                        <CheckCircle2 className="w-6 h-6 text-rose-500" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-500 mb-1">From</span>
                    <input
                      type="date"
                      value={absenceStart}
                      onChange={e => {
                        setAbsenceStart(e.target.value);
                        if (absenceEnd < e.target.value) setAbsenceEnd(e.target.value);
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-500 mb-1">Until (inclusive)</span>
                    <input
                      type="date"
                      value={absenceEnd}
                      min={absenceStart}
                      onChange={e => setAbsenceEnd(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  <button onClick={() => setAbsenceEnd(absenceStart)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors", absenceEnd === absenceStart ? "bg-rose-50 border-rose-200 text-rose-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                    Just this day
                  </button>
                  <button onClick={() => setAbsenceEnd(endOfWorkingWeek(absenceStart))} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors", absenceEnd !== absenceStart && absenceEnd === endOfWorkingWeek(absenceStart) ? "bg-rose-50 border-rose-200 text-rose-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                    Rest of the week
                  </button>
                  <select
                    value={absenceReason}
                    onChange={e => setAbsenceReason(e.target.value as Absence['reason'])}
                    className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 bg-white"
                  >
                    <option value="sick">Sick</option>
                    <option value="leave">Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsEmergencyMode(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!selectedStaffForEmergency}
                    onClick={() => selectedStaffForEmergency && handleMarkSick(selectedStaffForEmergency)}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Absence
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
