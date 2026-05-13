"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield,
  Activity,
  Heart,
  AlertTriangle,
  FileText,
  Edit,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockServiceUsers } from '@/lib/mockData';
import { ServiceUser } from '@/types';
import { UserForm } from '@/components/UserForm';

export default function UsersPage() {
  const [users, setUsers] = useState<ServiceUser[]>(mockServiceUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ServiceUser | null>(null);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.alerts.some(alert => alert.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddUser = (data: any) => {
    const newUser: ServiceUser = {
      ...data,
      id: `u-${Date.now()}`,
      created_at: new Date().toISOString(),
      preferred_staff: [],
    };
    setUsers(prev => [...prev, newUser]);
    setIsFormOpen(false);
  };

  const handleEditUser = (data: any) => {
    if (!editingUser) return;
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...data } : u));
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to remove this service user?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Service Users</h1>
          <p className="text-slate-500 font-medium">Manage support profiles and care requirements</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-2xl font-semibold calm-shadow hover:bg-primary-600 transition-colors self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Service User
        </button>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, support level or notes..." 
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

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-3xl p-6 border border-slate-100 calm-shadow hover:border-primary-100 transition-all group relative"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl border",
                  user.support_level === 3 ? "bg-rose-50 text-rose-600 border-rose-100" :
                  user.support_level === 2 ? "bg-amber-50 text-amber-600 border-amber-100" :
                  "bg-sky-50 text-sky-600 border-sky-100"
                )}>
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{user.name}</h3>
                  <p className="text-sm font-bold text-slate-400">Level {user.support_level} Support</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setEditingUser(user)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-primary-600"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeleteUser(user.id)}
                  className="p-2 hover:bg-rose-50 rounded-xl transition-colors text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <Shield className="w-4 h-4 text-slate-400" />
                <span>Ratio: <span className="font-bold text-slate-900">{user.required_ratio}</span></span>
              </div>

              <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="line-clamp-1">{user.sensory_notes || 'No sensory notes'}</span>
              </div>

              {user.alerts.length > 0 && (
                <div className="flex items-center gap-3 text-sm font-bold text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{user.alerts[0]}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex gap-3">
              <button className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Profile
              </button>
              <button className="flex-1 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                <Heart className="w-4 h-4" />
                Preferences
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {(isFormOpen || editingUser) && (
          <UserForm 
            user={editingUser || undefined}
            onSubmit={editingUser ? handleEditUser : handleAddUser}
            onClose={() => {
              setIsFormOpen(false);
              setEditingUser(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
