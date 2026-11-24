"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Check, CheckCircle2, Copy, Loader2, MessageCircle, MessageSquare, PhoneOff, Send, X, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCarero } from '@/lib/store';
import { suggestReplacements } from '@/lib/cover';
import { coverLink, coverMessage, smsUrl, toInternational, whatsappUrl } from '@/lib/coverMessage';
import { ServiceUser } from '@/types';

interface Props {
  user: ServiceUser;
  date: string;
  startTime: string;
  endTime: string;
  onClose: () => void;
}

export function CoverRequestModal({ user, date, startTime, endTime, onClose }: Props) {
  const store = useCarero();
  const { staff, assignments, absences, coverRequests, coverOffers, settings } = store;

  const openRequest = coverRequests.find(r => r.service_user_id === user.id && r.date === date && r.status === 'open');
  const filledRequest = coverRequests.find(r => r.service_user_id === user.id && r.date === date && r.status === 'filled');
  const activeRequest = openRequest ?? filledRequest;

  const eligible = useMemo(
    () => suggestReplacements({ user, dateKey: date, staff, assignments: assignments.filter(a => a.date === date), absences }),
    [user, date, staff, assignments, absences]
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(eligible.map(e => e.staff.id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const dayLabel = format(parseISO(date), 'EEEE d MMMM');

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const create = async () => {
    setBusy(true);
    setError(null);
    const res = await store.createCoverRequest(
      { service_user_id: user.id, date, start_time: startTime, end_time: endTime },
      Array.from(selected)
    );
    if ('error' in res) setError(res.error);
    setBusy(false);
  };

  const offers = activeRequest ? coverOffers.filter(o => o.request_id === activeRequest.id) : [];
  const replied = offers.filter(o => o.response).length;

  const copy = async (token: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(token);
      setTimeout(() => setCopied(c => (c === token ? null : c)), 2000);
    } catch {
      prompt('Copy this message:', text);
    }
  };

  const markSent = (staffId: string) => setSent(prev => new Set(prev).add(staffId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-6 sm:p-8 overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Request cover</h2>
              <p className="text-slate-500 font-medium">
                {user.name} · {dayLabel} · {startTime}–{endTime}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {!activeRequest && (
            <>
              <p className="text-sm font-bold text-slate-700 mb-3">Who should we ask?</p>
              {eligible.length === 0 ? (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-sm font-medium text-rose-700">
                  Nobody suitable is free that day
                  {(user.required_skills ?? []).length > 0 && <> (needs {user.required_skills!.join(', ')})</>}.
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  {eligible.map(({ staff: s, reasons }) => {
                    const on = selected.has(s.id);
                    const hasPhone = Boolean(toInternational(s.phone));
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggle(s.id)}
                        className={cn(
                          'w-full p-3 rounded-2xl border-2 transition-all flex items-center justify-between text-left',
                          on ? 'border-primary-400 bg-primary-50/50' : 'border-slate-100 hover:border-slate-200'
                        )}
                      >
                        <div>
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-xs font-medium text-slate-500">{reasons.join(' · ')}</p>
                          {!hasPhone && (
                            <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                              <PhoneOff className="w-3 h-3" /> No mobile number saved
                            </p>
                          )}
                        </div>
                        <div className={cn('w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0', on ? 'bg-primary-500 border-primary-500' : 'border-slate-300')}>
                          {on && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {error && <p className="text-sm font-bold text-rose-600 mb-3">{error}</p>}
              <button
                onClick={create}
                disabled={busy || selected.size === 0}
                className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Create links for {selected.size} {selected.size === 1 ? 'person' : 'people'}
              </button>
              <p className="text-xs text-slate-400 mt-3 text-center">The first person to accept gets the shift. Everyone else&apos;s link closes.</p>
            </>
          )}

          {activeRequest && (
            <>
              <div
                className={cn(
                  'p-4 rounded-2xl mb-5 flex items-center gap-3',
                  activeRequest.status === 'filled' ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'
                )}
              >
                {activeRequest.status === 'filled' ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <p className="font-bold text-emerald-800">
                      Covered by {staff.find(s => s.id === activeRequest.filled_by)?.name ?? 'a staff member'}
                    </p>
                  </>
                ) : (
                  <>
                    <Clock className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-bold text-amber-800">Waiting for replies ({replied}/{offers.length})</p>
                      <p className="text-xs font-medium text-amber-700">Send each person their link below. This updates automatically.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {offers.map(o => {
                  const s = staff.find(x => x.id === o.staff_id);
                  if (!s) return null;
                  const phone = toInternational(s.phone);
                  const text = coverMessage({
                    staffFirstName: s.name.split(' ')[0],
                    centre: settings.centre_name,
                    date,
                    start: activeRequest.start_time,
                    end: activeRequest.end_time,
                    link: coverLink(origin, o.token),
                  });
                  return (
                    <div key={o.id} className="p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{s.name}</p>
                          <p className="text-xs font-bold">
                            {o.response === 'accepted' && <span className="text-emerald-600">Accepted</span>}
                            {o.response === 'declined' && <span className="text-slate-400">Declined</span>}
                            {!o.response && (
                              <span className="text-amber-600">{sent.has(s.id) ? 'Sent · no reply yet' : 'Not sent yet'}</span>
                            )}
                          </p>
                        </div>
                        {o.response === 'accepted' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {o.response === 'declined' && <XCircle className="w-5 h-5 text-slate-300" />}
                      </div>
                      {activeRequest.status === 'open' && !o.response && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <a
                            href={whatsappUrl(phone, text)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => markSent(s.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" /> WhatsApp
                          </a>
                          {phone && (
                            <a
                              href={smsUrl(phone, text)}
                              onClick={() => markSent(s.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" /> Text
                            </a>
                          )}
                          <button
                            onClick={() => {
                              copy(o.token, text);
                              markSent(s.id);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            {copied === o.token ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied === o.token ? 'Copied' : 'Copy message'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {activeRequest.status === 'open' && (
                <button
                  onClick={() => {
                    if (confirm('Cancel this cover request? Links already sent will stop working.')) {
                      store.cancelCoverRequest(activeRequest.id);
                      onClose();
                    }
                  }}
                  className="w-full mt-5 py-3 text-sm font-bold text-slate-500 hover:text-rose-600 transition-colors"
                >
                  Cancel request
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
