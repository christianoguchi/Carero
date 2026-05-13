import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';
import { Staff } from '@/types';

const staffSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  role: z.enum(['Manager', 'Support Worker', 'Senior Support Worker', 'Volunteer']),
  skills: z.string().transform(val => val.split(',').map(s => s.trim()).filter(Boolean)),
  availability: z.array(z.string()).min(1, 'Select at least one day'),
  support_level_max: z.number().min(1).max(3),
  notes: z.string().optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface StaffFormProps {
  staff?: Staff;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

export function StaffForm({ staff, onSubmit, onClose }: StaffFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: staff ? {
      ...staff,
      skills: staff.skills,
    } as any : {
      role: 'Support Worker',
      availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      support_level_max: 2,
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{staff ? 'Edit Staff' : 'Add New Staff'}</h2>
              <p className="text-slate-500 font-medium">Care team member details</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
              <input 
                {...register('name')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="e.g. John Smith"
              />
              {errors.name && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                <select 
                  {...register('role')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="Support Worker">Support Worker</option>
                  <option value="Senior Support Worker">Senior Support Worker</option>
                  <option value="Manager">Manager</option>
                  <option value="Volunteer">Volunteer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Max Support Level</label>
                <select 
                  {...register('support_level_max', { valueAsNumber: true })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value={1}>Level 1</option>
                  <option value={2}>Level 2</option>
                  <option value={3}>Level 3 (High)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Skills (comma separated)</label>
              <input 
                {...register('skills')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="e.g. First Aid, Makaton, MAPA"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Notes</label>
              <textarea 
                {...register('notes')}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="Any special considerations..."
              />
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-4 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition-colors"
              >
                {staff ? 'Save Changes' : 'Add Staff Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
