"use client";

import React from 'react';
import { useCarero } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { TeamSection } from '@/components/TeamSection';

export default function SettingsPage() {
  const { settings, updateSettings, resetDemoData, ready, mode } = useCarero();
  const { toast } = useToast();

  if (!ready) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 font-medium">Centre details and shift defaults</p>
      </header>

      <section className="bg-white p-6 rounded-3xl calm-shadow border border-slate-100 space-y-5">
        <label className="block">
          <span className="block text-sm font-bold text-slate-700 mb-1">Centre name</span>
          <input
            value={settings.centre_name}
            onChange={e => updateSettings({ centre_name: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-bold text-slate-700 mb-1">Default shift start</span>
            <input
              type="time"
              value={settings.default_shift_start}
              onChange={e => updateSettings({ default_shift_start: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-bold text-slate-700 mb-1">Default shift end</span>
            <input
              type="time"
              value={settings.default_shift_end}
              onChange={e => updateSettings({ default_shift_end: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </label>
        </div>
        <p className="text-xs text-slate-400">Used for new assignments. Changes save automatically.</p>
      </section>

      {mode === 'cloud' && <TeamSection />}

      <section className="bg-white p-6 rounded-3xl calm-shadow border border-slate-100 space-y-3">
        <h2 className="text-lg font-bold text-slate-800">Data</h2>
        <p className="text-sm text-slate-500">
          {mode === 'cloud'
            ? 'Your rota is saved securely online and shared with everyone in your centre.'
            : 'Demo mode: data is saved in this browser only.'}
        </p>
        <button
          onClick={() => {
            if (confirm('Delete ALL staff, service users and rota data for this centre and load demo data instead? This cannot be undone.')) {
              resetDemoData();
              toast({ title: 'Demo data restored' });
            }
          }}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
        >
          Reset to demo data
        </button>
      </section>
    </div>
  );
}
