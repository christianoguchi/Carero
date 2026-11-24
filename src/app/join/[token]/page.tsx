"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { rememberInvite, useCarero } from '@/lib/store';
import { Shell, SignInForm } from '@/components/AuthGate';

type InviteStatus = 'valid' | 'used' | 'expired' | 'revoked';

const PROBLEMS: Record<string, string> = {
  used: 'This invite link has already been used. Ask your manager for a new one.',
  expired: 'This invite link has expired (they last 7 days). Ask your manager for a new one.',
  revoked: 'This invite was cancelled. Ask your manager for a new one.',
  invalid: 'This invite link isn’t recognised. Check you opened the full link.',
  in_another_centre:
    'Your account already belongs to another centre. For now each account can be in one centre. Sign out and create a new account with a different email to join.',
};

export default function JoinPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { status, session, acceptInvitation, signOut, settings } = useCarero();
  const [invite, setInvite] = useState<{ centre: string; status: InviteStatus } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    rememberInvite(params.token); // so "Set up your centre" can offer it after email confirmation
    if (!supabase) {
      setProblem('Invites need the online version of Carero.');
      setLoading(false);
      return;
    }
    supabase.rpc('get_invitation', { invite_token: params.token }).then(({ data, error }) => {
      if (error || !data) setProblem(PROBLEMS.invalid);
      else setInvite(data as { centre: string; status: InviteStatus });
      setLoading(false);
    });
  }, [params.token]);

  const join = async () => {
    setBusy(true);
    const res = await acceptInvitation(params.token);
    if (res === 'joined' || res === 'already_member') {
      router.push('/');
      return;
    }
    setProblem(PROBLEMS[res] ?? res);
    setBusy(false);
  };

  const centre = invite?.centre ?? 'a centre';

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (problem || (invite && invite.status !== 'valid')) {
    return (
      <Shell title="Can’t use this invite" subtitle={invite ? `Invite to ${centre}` : ''}>
        <p className="font-medium text-slate-600">{problem ?? PROBLEMS[invite!.status]}</p>
        {session && (
          <button onClick={signOut} className="w-full mt-6 text-sm font-bold text-slate-500 hover:text-slate-800">
            Sign out
          </button>
        )}
      </Shell>
    );
  }

  // Already in this centre (e.g. clicked the link twice)
  if (status === 'ready' && settings.centre_name === invite?.centre) {
    return (
      <Shell title={`You’re in ${centre}`} subtitle="You already have access to this rota.">
        <button onClick={() => router.push('/')} className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition-colors">
          Open the rota
        </button>
      </Shell>
    );
  }

  if (!session) {
    return (
      <Shell title={`Join ${centre} on Carero`} subtitle="You’ve been invited to help manage the rota. Create an account or sign in to accept.">
        <SignInForm startWithSignUp />
      </Shell>
    );
  }

  return (
    <Shell title={`Join ${centre}`} subtitle={`Signed in as ${session.user.email}.`}>
      <div className="p-4 bg-primary-50 rounded-2xl flex items-start gap-3 mb-6">
        <Users className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
        <p className="text-sm font-medium text-primary-900">
          You’ll be a manager of {centre}: you can see and edit the rota, staff and service users.
        </p>
      </div>
      <button
        onClick={join}
        disabled={busy}
        className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Join {centre}
      </button>
      <button onClick={signOut} className="w-full mt-4 text-sm font-bold text-slate-500 hover:text-slate-800">
        Not you? Sign out
      </button>
    </Shell>
  );
}
