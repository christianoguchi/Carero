import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';
import { ServiceUser } from '@/types';

const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  support_level: z.number().min(1).max(3),
  required_ratio: z.string().min(1, 'Ratio is required'),
  sensory_notes: z.string().optional(),
  behaviour_notes: z.string().optional(),
  notes: z.string().optional(),
  alerts: z.string().transform(val => val.split(',').map(s => s.trim()).filter(Boolean)),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: ServiceUser;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

export function UserForm({ user, onSubmit, onClose }: UserFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: user ? {
      ...user,
      alerts: user.alerts.join(', '),
    } as any : {
      support_level: 2,
      required_ratio: '1:1',
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{user ? 'Edit Service User' : 'Add Service User'}</h2>
              <p className="text-slate-500 font-medium">Service user care profile</p>
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
                placeholder="e.g. Alex Rivera"
              />
              {errors.name && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Support Level</label>
                <select 
                  {...register('support_level', { valueAsNumber: true })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value={1}>Level 1</option>
                  <option value={2}>Level 2</option>
                  <option value={3}>Level 3 (High)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Ratio</label>
                <input 
                  {...register('required_ratio')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="e.g. 1:1, 2:1, 1:3"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Alerts (comma separated)</label>
              <input 
                {...register('alerts')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-bold text-rose-600"
                placeholder="e.g. Nut Allergy, Epilepsy"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Sensory Notes</label>
              <textarea 
                {...register('sensory_notes')}
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="Sensitivity to noise, lights, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Behaviour Notes</label>
              <textarea 
                {...register('behaviour_notes')}
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="Triggers, calming strategies..."
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
                {user ? 'Save Changes' : 'Add Service User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
