"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, Copy, Loader2, Mail, MessageCircle, Trash2, UserPlus, X } from 'lucide-react';
import { useCarero } from '@/lib/store';
import { Invitation, Member } from '@/lib/supabase';
import { whatsappUrl } from '@/lib/coverMessage';
import { useToast } from '@/hooks/use-toast';

export function TeamSection() {
  const { api, role, settings } = useCarero();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const isManager = role === 'manager';

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const [m, i] = await Promise.all([api.listMembers(), isManager ? api.listInvitations() : Promise.resolve([])]);
      setMembers(m);
      setInvites(i);
    } catch (e) {
      toast({ title: 'Could not load team', description: (e as Error).message });
    }
    setLoading(false);
  }, [api, isManager, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!api) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const linkFor = (inv: Invitation) => `${origin}/join/${inv.token}`;
  const messageFor = (inv: Invitation) =>
    `Hi, I've invited you to help manage the ${settings.centre_name} rota on Carero. ` +
    `Open this link to join (it works once and expires on ${format(parseISO(inv.expires_at), 'EEE d MMM')}): ${linkFor(inv)}`;

  const create = async () => {
    setCreating(true);
    try {
      const inv = await api.createInvitation(note.trim());
      setInvites(prev => [inv, ...prev]);
      setNote('');
    } catch (e) {
      toast({ title: 'Could not create invite', description: (e as Error).message });
    }
    setCreating(false);
  };

  const copy = async (inv: Invitation) => {
    try {
      await navigator.clipboard.writeText(messageFor(inv));
      setCopied(inv.id);
      setTimeout(() => setCopied(c => (c === inv.id ? null : c)), 2000);
    } catch {
      prompt('Copy this message:', messageFor(inv));
    }
  };

  const revoke = async (inv: Invitation) => {
    if (!confirm('Cancel this invite? The link will stop working.')) return;
    try {
      await api.revokeInvitation(inv.id);
      setInvites(prev => prev.filter(i => i.id !== inv.id));
    } catch (e) {
      toast({ title: 'Could not cancel invite', description: (e as Error).message });
    }
  };

  const remove = async (m: Member) => {
    if (!confirm(`Remove ${m.email} from ${settings.centre_name}? They will lose access to the rota.`)) return;
    try {
      const res = await api.removeMember(m.user_id);
      if (res === 'removed') setMembers(prev => prev.filter(x => x.user_id !== m.user_id));
      else if (res === 'last_manager') toast({ title: 'Can’t remove the last manager', description: 'Invite another manager first.' });
      else toast({ title: 'Not allowed', description: 'Only managers can remove people.' });
    } catch (e) {
      toast({ title: 'Could not remove', description: (e as Error).message });
    }
  };

  return (
    <section className="bg-white p-6 rounded-3xl calm-shadow border border-slate-100 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Team</h2>
        <p className="text-sm text-slate-500">People who can see and manage this centre’s rota.</p>
      </div>

      {loading ? (
        <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {members.map(m => (
            <li key={m.user_id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">
                  {m.email} {m.is_me && <span className="text-xs font-bold text-slate-400">(you)</span>}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{m.role}</p>
              </div>
              {isManager && !m.is_me && (
                <button onClick={() => remove(m)} aria-label={`Remove ${m.email}`} className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isManager && (
        <>
          <div className="pt-2 border-t border-slate-100">
            <p className="text-sm font-bold text-slate-700 mb-2">Invite a manager</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Who is it for? (optional, e.g. Anne)"
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
              />
              <button
                onClick={create}
                disabled={creating}
                className="px-5 py-3 bg-primary-500 text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Create invite link
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">Each link works once and expires after 7 days.</p>
          </div>

          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Pending invites</p>
              {invites.map(inv => (
                <div key={inv.id} className="p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{inv.note || 'Manager invite'}</p>
                      <p className="text-xs font-medium text-slate-400">Expires {format(parseISO(inv.expires_at), 'EEE d MMM')}</p>
                    </div>
                    <button onClick={() => revoke(inv)} aria-label="Cancel invite" className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a
                      href={whatsappUrl(null, messageFor(inv))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(`Join ${settings.centre_name} on Carero`)}&body=${encodeURIComponent(messageFor(inv))}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                    >
                      <Mail className="w-4 h-4" /> Email
                    </a>
                    <button
                      onClick={() => copy(inv)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      {copied === inv.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied === inv.id ? 'Copied' : 'Copy message'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
