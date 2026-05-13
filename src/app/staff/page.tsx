"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockStaff } from '@/lib/mockData';
import { Staff } from '@/types';
import { StaffForm } from '@/components/StaffForm';

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>(mockStaff);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const filteredStaff = staff.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddStaff = (data: any) => {
    const newStaff: Staff = {
      ...data,
      id: `s-${Date.now()}`,
      status: 'available',
      created_at: new Date().toISOString(),
      preferred_users: [],
      compatibility_tags: [],
    };
    setStaff(prev => [...prev, newStaff]);
    setIsFormOpen(false);
  };

  const handleEditStaff = (data: any) => {
    if (!editingStaff) return;
    setStaff(prev => prev.map(s => s.id === editingStaff.id ? { ...s, ...data } : s));
    setEditingStaff(null);
  };

  const handleDeleteStaff = (id: string) => {
    if (confirm('Are you sure you want to remove this staff member?')) {
      setStaff(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Staff Team</h1>
          <p className="text-slate-500 font-medium">Manage your care team and their availability</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-2xl font-semibold calm-shadow hover:bg-primary-600 transition-colors self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Staff Member
        </button>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search staff by name, role or skills..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl calm-shadow focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-medium"
          />
        </div>
        <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-5 h-5 text-slate-400" />
          Filters
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStaff.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-3xl p-6 border border-slate-100 calm-shadow hover:border-primary-100 transition-all group relative"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center font-bold text-2xl text-primary-600 border border-primary-100">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{member.name}</h3>
                  <p className="text-sm font-semibold text-primary-500">{member.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setEditingStaff(member)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-primary-600"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeleteStaff(member.id)}
                  className="p-2 hover:bg-rose-50 rounded-xl transition-colors text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <Award className="w-4 h-4 text-slate-400" />
                <div className="flex flex-wrap gap-1">
                  {member.skills.map(skill => (
                    <span key={skill} className="px-2 py-0.5 bg-slate-50 rounded-md text-[10px] font-bold border border-slate-100">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Available: {member.availability.length} days / week</span>
              </div>

              <div className="flex items-center gap-3 text-sm font-medium">
                {member.status === 'available' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-bold">Available</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span className="text-rose-600 font-bold uppercase tracking-tight">Absent</span>
                  </>
                )}
                <div className="ml-auto px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-400">
                  LVL {member.support_level_max}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex gap-3">
              <button className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-bold transition-colors">
                View Profile
              </button>
              <button className="flex-1 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-sm font-bold transition-colors">
                Edit Rota
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {(isFormOpen || editingStaff) && (
          <StaffForm 
            staff={editingStaff || undefined}
            onSubmit={editingStaff ? handleEditStaff : handleAddStaff}
            onClose={() => {
              setIsFormOpen(false);
              setEditingStaff(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
