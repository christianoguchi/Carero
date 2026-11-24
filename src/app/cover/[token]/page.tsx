"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, CheckCircle2, Clock, Heart, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Offer {
  centre: string;
  staff_first_name: string;
  service_user_first_name: string;
  date: string;
  start_time: string;
  end_time: string;
  request_status: 'open' | 'filled' | 'cancelled';
  filled_by_me: boolean | null;
  my_response: 'accepted' | 'declined' | null;
}

type Outcome = 'accepted' | 'declined' | 'already_filled' | 'cancelled' | 'already_booked' | 'not_found';

const OUTCOME_TEXT: Record<Outcome, { title: string; body: string; good: boolean }> = {
  accepted: { title: 'Shift confirmed. Thank you!', body: 'You’re on the rota. Your manager can see this now.', good: true },
  declined: { title: 'No problem', body: 'We’ve let your manager know you can’t make it.', good: false },
  already_filled: { title: 'Already covered', body: 'Someone else has taken this shift. Thanks for replying!', good: false },
  cancelled: { title: 'No longer needed', body: 'Your manager has cancelled this request.', good: false },
  already_booked: { title: 'You’re already on shift that day', body: 'Speak to your manager if you’d like to swap.', good: false },
  not_found: { title: 'Link not recognised', body: 'Check you opened the full link from your message.', good: false },
};

export default function CoverOfferPage({ params }: { params: { token: string } }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setError('Cover links need the online version of Carero.');
      setLoading(false);
      return;
    }
    const { data, error: e } = await supabase.rpc('get_cover_offer', { offer_token: params.token });
    if (e) setError('Something went wrong. Please try again.');
    else if (!data) setOutcome('not_found');
    else setOffer(data as Offer);
    setLoading(false);
  }, [params.token]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (accept: boolean) => {
    if (!supabase) return;
    setBusy(true);
    const { data, error: e } = await supabase.rpc('respond_cover_offer', { offer_token: params.token, accept });
    if (e) setError('Something went wrong. Please try again.');
    else setOutcome(data as Outcome);
    setBusy(false);
  };

  // Work out what to show if they've been here before.
  let shown: Outcome | null = outcome;
  if (!shown && offer) {
    if (offer.request_status === 'filled') shown = offer.filled_by_me ? 'accepted' : 'already_filled';
    else if (offer.request_status === 'cancelled') shown = 'cancelled';
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-[2rem] calm-shadow border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">CARERO</span>
        </div>

        {loading && <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />}

        {!loading && error && <p className="font-bold text-rose-600">{error}</p>}

        {!loading && !error && offer && (
          <div className="mb-6">
            <p className="text-slate-500 font-medium">Hi {offer.staff_first_name},</p>
            <h1 className="text-2xl font-black text-slate-900 mb-4">Can you cover a shift at {offer.centre}?</h1>
            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl">
              <p className="flex items-center gap-3 font-bold text-slate-700">
                <CalendarDays className="w-5 h-5 text-slate-400" /> {format(parseISO(offer.date), 'EEEE d MMMM')}
              </p>
              <p className="flex items-center gap-3 font-bold text-slate-700">
                <Clock className="w-5 h-5 text-slate-400" /> {offer.start_time}–{offer.end_time}
              </p>
              <p className="flex items-center gap-3 font-medium text-slate-600">
                <Heart className="w-5 h-5 text-slate-400" /> Supporting {offer.service_user_first_name}
              </p>
            </div>
          </div>
        )}

        {!loading && !error && shown && (
          <div className={`p-5 rounded-2xl ${OUTCOME_TEXT[shown].good ? 'bg-emerald-50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-3 mb-1">
              {OUTCOME_TEXT[shown].good ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <XCircle className="w-6 h-6 text-slate-400" />}
              <h2 className="text-lg font-black text-slate-900">{OUTCOME_TEXT[shown].title}</h2>
            </div>
            <p className="text-slate-600 font-medium">{OUTCOME_TEXT[shown].body}</p>
          </div>
        )}

        {!loading && !error && offer && !shown && (
          <>
            {offer.my_response === 'declined' && (
              <p className="text-sm font-medium text-slate-500 mb-3">You said you can’t make it. Changed your mind? You can still accept.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => respond(false)}
                disabled={busy}
                className="py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Can’t do it
              </button>
              <button
                onClick={() => respond(true)}
                disabled={busy}
                className="py-4 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, I’ll cover
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">First to accept gets the shift.</p>
          </>
        )}
      </div>
    </div>
  );
}
