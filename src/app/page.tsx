"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  Plus, 
  MoreHorizontal, 
  AlertCircle, 
  FileText,
  UserCheck,
  Search,
  ArrowRight,
  CheckCircle2,
  X,
  RefreshCcw,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockStaff, mockServiceUsers } from '@/lib/mockData';
import { Staff, ServiceUser, Assignment } from '@/types';

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
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Draggable } from '@/components/Draggable';
import { Droppable } from '@/components/Droppable';

import { QuickActions } from '@/components/QuickActions';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>(mockStaff);
  const [users, setUsers] = useState<ServiceUser[]>(mockServiceUsers);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [selectedStaffForEmergency, setSelectedStaffForEmergency] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const handleUnassignAll = () => {
    if (confirm('Are you sure you want to clear the entire board?')) {
      setAssignments([]);
      toast({
        title: "Board Cleared",
        description: "All assignments have been removed.",
      });
    }
  };

  const handleAutoFill = () => {
    // Simple auto-fill logic: assign first available compatible staff to each empty user
    setAssignments(prev => {
      const newAssignments = [...prev];
      let filledCount = 0;
      users.forEach(user => {
        if (!newAssignments.some(a => a.service_user_id === user.id)) {
          const compatibleStaff = staff.find(s => 
            s.status === 'available' && 
            s.support_level_max >= user.support_level &&
            !newAssignments.some(a => a.staff_id === s.id)
          );
          if (compatibleStaff) {
            filledCount++;
            newAssignments.push({
              id: `a-${Date.now()}-${user.id}`,
              staff_id: compatibleStaff.id,
              service_user_id: user.id,
              date: new Date().toISOString().split('T')[0],
              start_time: '09:00',
              end_time: '16:30',
              created_at: new Date().toISOString()
            });
          }
        }
      });
      
      if (filledCount > 0) {
        toast({
          title: "Auto-Fill Complete",
          description: `Automatically assigned ${filledCount} staff members.`,
        });
      } else {
        toast({
          title: "Auto-Fill",
          description: "No compatible staff found for remaining slots.",
        });
      }
      return newAssignments;
    });
  };

  const handleDuplicateYesterday = () => {
    // In a real app, this would fetch from DB. Here we just mock it.
    alert('Rota duplicated from Friday, May 8th');
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && over.id.toString().startsWith('user-')) {
      const staffId = active.id.toString();
      const userId = over.id.toString().replace('user-', '');

      // Check if staff is already assigned elsewhere and move them
      setAssignments(prev => {
        const otherAssignments = prev.filter(a => a.staff_id !== staffId);
        // If the user already has someone assigned, they will be replaced (one staff per user for now)
        const filteredAssignments = otherAssignments.filter(a => a.service_user_id !== userId);
        
        toast({
          title: "Assignment Updated",
          description: `Assigned ${staff.find(s => s.id === staffId)?.name} to ${users.find(u => u.id === userId)?.name}`,
        });

        return [
          ...filteredAssignments,
          {
            id: `a-${Date.now()}`,
            staff_id: staffId,
            service_user_id: userId,
            date: new Date().toISOString().split('T')[0],
            start_time: '09:00',
            end_time: '16:30',
            created_at: new Date().toISOString()
          }
        ];
      });
    }
  };

  const removeAssignment = (userId: string) => {
    setAssignments(prev => prev.filter(a => a.service_user_id !== userId));
    toast({
      title: "Assignment Removed",
      description: "The staff member has been unassigned.",
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    await exportToPDF('rota-board', `daily-rota-${new Date().toISOString().split('T')[0]}`);
    setIsExporting(false);
  };

  // Mock initial assignments
  useEffect(() => {
    const initialAssignments: Assignment[] = [
      { 
        id: 'a1', 
        staff_id: 's1', 
        service_user_id: 'u1', 
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00', 
        end_time: '16:30',
        created_at: new Date().toISOString()
      },
      { 
        id: 'a2', 
        staff_id: 's2', 
        service_user_id: 'u2', 
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00', 
        end_time: '16:30',
        created_at: new Date().toISOString()
      },
    ];
    setAssignments(initialAssignments);
  }, []);

  const getStaffForUser = (userId: string) => {
    const assignment = assignments.find(a => a.service_user_id === userId);
    if (!assignment) return null;
    return staff.find(s => s.id === assignment.staff_id);
  };

  const getMatchQuality = (staffId: string, userId: string) => {
    const member = staff.find(s => s.id === staffId);
    const user = users.find(u => u.id === userId);
    if (!member || !user) return { quality: 'neutral', message: '' };

    const reasons: string[] = [];
    let quality: 'good' | 'warning' | 'conflict' | 'neutral' = 'neutral';

    // Conflict: Support level mismatch
    if (member.support_level_max < user.support_level) {
      return { quality: 'conflict', message: `Level ${user.support_level} support required` };
    }

    // Good: Preferred match
    if (user.preferred_staff.includes(staffId) || member.preferred_users.includes(userId)) {
      return { quality: 'good', message: 'Preferred match' };
    }

    // Warning: Overbooked (if we had shift limits, but let's just check if they are already assigned today)
    const isAlreadyAssigned = assignments.some(a => a.staff_id === staffId);
    if (isAlreadyAssigned) {
      return { quality: 'warning', message: 'Already assigned today' };
    }

    return { quality: 'neutral', message: '' };
  };

  const handleMarkSick = (staffId: string) => {
    const member = staff.find(s => s.id === staffId);
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, status: 'sick' } : s));
    setSelectedStaffForEmergency(null);
    setIsEmergencyMode(false);
    toast({
      title: "Emergency Absence Logged",
      description: `${member?.name} marked as sick. Affected shifts highlighted.`,
      variant: "destructive" as any,
    });
  };

  const affectedUsers = assignments
    .filter(a => staff.find(s => s.id === a.staff_id)?.status === 'sick')
    .map(a => users.find(u => u.id === a.service_user_id))
    .filter(Boolean) as ServiceUser[];

  const getSuggestedReplacements = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return [];

    return staff
      .filter(s => s.status === 'available' && !assignments.some(a => a.staff_id === s.id))
      .filter(s => s.support_level_max >= user.support_level)
      .sort((a, b) => {
        const aPref = user.preferred_staff.includes(a.id) ? 1 : 0;
        const bPref = user.preferred_staff.includes(b.id) ? 1 : 0;
        return bPref - aPref;
      })
      .slice(0, 3);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Morning Dashboard</h1>
          <p className="text-slate-500 font-medium">Saturday, May 9, 2026</p>
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
                    {affectedUsers.length} service users currently have no assigned staff due to illness.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold calm-shadow hover:bg-rose-700 transition-colors flex items-center gap-2">
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
                                <p className="text-[10px] font-bold text-primary-500 uppercase">09:00 - 16:30</p>
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
                              <div className="flex gap-1">
                                {getSuggestedReplacements(user.id).map(staff => (
                                  <button
                                    key={staff.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDragEnd({ active: { id: staff.id }, over: { id: `user-${user.id}` } } as any);
                                    }}
                                    className="px-2 py-1 bg-white border border-rose-200 rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    + {staff.name.split(' ')[0]}
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
                            {user.preferred_staff.length > 0 
                              ? `${staff.find(s => s.id === user.preferred_staff[0])?.name.split(' ')[0]} is a preferred match`
                              : 'Recommended match available'}
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
                    className="pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-32 focus:w-48 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {staff.filter(s => s.status === 'available').length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-xs font-bold uppercase">All staff assigned or absent</p>
                  </div>
                )}
                {staff.filter(s => s.status === 'available').map((member) => (
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

              {/* Absence Button */}
              <button 
                onClick={() => setIsEmergencyMode(true)}
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
                    <p className="text-slate-500 font-medium">Who called in sick today?</p>
                  </div>
                  <button onClick={() => setIsEmergencyMode(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-3 mb-8">
                  {staff.filter(s => s.status === 'available').map(member => (
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
