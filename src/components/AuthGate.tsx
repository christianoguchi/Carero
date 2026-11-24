"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Loader2, Users } from 'lucide-react';
import { pendingInvite, useCarero } from '@/lib/store';

const input =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-medium';

export function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-[2rem] calm-shadow border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">CARERO</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
        <p className="text-slate-500 font-medium mb-6">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function SignInForm({
  startWithSignUp = false,
  onModeChange,
}: {
  startWithSignUp?: boolean;
  onModeChange?: (signUp: boolean) => void;
}) {
  const { signIn, signUp } = useCarero();
  const [isSignUp, setIsSignUpState] = useState(startWithSignUp);
  const toggleMode = () => {
    const next = !isSignUp;
    setIsSignUpState(next);
    onModeChange?.(next);
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (isSignUp) {
      const res = await signUp(email, password);
      if (res.error) setError(res.error);
      else if (res.needsConfirmation) setNotice('Check your email and click the link to confirm your account, then sign in.');
    } else {
      const err = await signIn(email, password);
      if (err) setError(err);
    }
    setBusy(false);
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="block text-sm font-bold text-slate-700 mb-1">Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="block text-sm font-bold text-slate-700 mb-1">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={input}
          />
          {isSignUp && <span className="block text-xs text-slate-400 mt-1">At least 8 characters.</span>}
        </label>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        {notice && <p className="text-sm font-bold text-primary-700 bg-primary-50 p-3 rounded-xl">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <button
        onClick={() => {
          toggleMode();
          setError(null);
          setNotice(null);
        }}
        className="w-full mt-4 text-sm font-bold text-slate-500 hover:text-slate-800"
      >
        {isSignUp ? 'Already have an account? Sign in' : 'New to Carero? Create an account'}
      </button>
    </>
  );
}

function SignIn() {
  const [isSignUp, setIsSignUp] = useState(false);
  return (
    <Shell
      title={isSignUp ? 'Create your account' : 'Welcome back'}
      subtitle={isSignUp ? 'Start managing your rota in minutes.' : 'Sign in to your centre’s rota.'}
    >
      <SignInForm onModeChange={setIsSignUp} />
    </Shell>
  );
}

function CreateCentre() {
  const { createOrganisation, signOut, session } = useCarero();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invite = typeof window !== 'undefined' ? pendingInvite() : null;

  return (
    <Shell title="Set up your centre" subtitle={`Signed in as ${session?.user.email ?? ''}. What’s your centre called?`}>
      <form
        onSubmit={async e => {
          e.preventDefault();
          setBusy(true);
          setError(await createOrganisation(name.trim()));
          setBusy(false);
        }}
        className="space-y-4"
      >
        <input required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Oakwood Day Centre" className={input} />
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Create centre
        </button>
      </form>
      {invite && (
        <Link
          href={`/join/${invite}`}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-primary-200 text-primary-700 font-bold hover:bg-primary-50 transition-colors"
        >
          <Users className="w-4 h-4" /> Join the centre you were invited to
        </Link>
      )}
      <p className="text-xs text-slate-400 mt-4 text-center">
        Joining an existing centre? Open the invite link your manager sent you.
      </p>
      <button onClick={signOut} className="w-full mt-4 text-sm font-bold text-slate-500 hover:text-slate-800">
        Sign out
      </button>
    </Shell>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useCarero();
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }
  if (status === 'signed-out') return <SignIn />;
  if (status === 'no-organisation') return <CreateCentre />;
  return <>{children}</>;
}
