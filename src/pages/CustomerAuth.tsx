import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, Loader2, Lock, Mail, Phone, UserRound } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useCustomerStore } from '@/store/useCustomerStore';

type Mode = 'signin' | 'signup';

export function CustomerAuthPage() {
  const navigate = useNavigate();
  const {
    customer,
    isCheckingSession,
    isSubmittingAuth,
    error,
    checkSession,
    signIn,
    signUp,
    clearError,
  } = useCustomerStore();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (customer) {
      navigate('/customer/portal');
    }
  }, [customer, navigate]);

  const handleSubmit = async () => {
    clearError();

    if (mode === 'signin') {
      await signIn(email, password);
      return;
    }

    await signUp({
      email,
      password,
      fullName,
      phone,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_30%,#fff7ed_100%)] px-4 py-6 dark:bg-[radial-gradient(circle_at_top,#164e63_0%,#0a0a0f_32%,#111827_100%)]">
      <ThemeToggle className="absolute right-4 top-4" />

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-2xl shadow-slate-300/30 backdrop-blur dark:border-slate-800 dark:bg-slate-950/55 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden bg-slate-950 px-10 py-12 text-white xl:flex xl:flex-col xl:justify-between">
            <div className="space-y-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-cyan-400 text-slate-950">
                <Gamepad2 className="h-7 w-7" />
              </div>
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Customer portal</p>
                <h1 className="text-4xl font-black leading-tight">
                  Sign in, reserve a slot, and let the system tie it to a real pod.
                </h1>
                <p className="max-w-md text-sm leading-7 text-slate-300">
                  Customers get a clear booking journey while your staff team keeps using the existing internal dashboard.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-500/20 bg-white/5 p-6">
              <p className="text-sm font-semibold text-cyan-300">Best for launch</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Ask customers to create their own account once, then let them manage future bookings from the same portal.
              </p>
            </div>
          </section>

          <section className="px-6 py-8 sm:px-10 sm:py-12">
            <div className="mb-8 flex items-center justify-between">
              <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
                Back to landing
              </Link>
              <div className="rounded-full bg-slate-100 p-1 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === 'signin'
                      ? 'bg-white text-slate-950 shadow dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === 'signup'
                      ? 'bg-white text-slate-950 shadow dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Sign up
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-950 dark:text-white">
                  {mode === 'signin' ? 'Welcome back' : 'Create your booking account'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {mode === 'signin'
                    ? 'Use your customer account to manage upcoming sessions.'
                    : 'We will use these details on your booking confirmations and check-in flow.'}
                </p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Full name</span>
                      <span className="relative block">
                        <UserRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          placeholder="Player name"
                          className="w-full rounded-2xl border border-slate-300 bg-white px-10 py-3 text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </span>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Phone</span>
                      <span className="relative block">
                        <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="+60 12-345 6789"
                          className="w-full rounded-2xl border border-slate-300 bg-white px-10 py-3 text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </span>
                    </label>
                  </>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
                  <span className="relative block">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-10 py-3 text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
                  <span className="relative block">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void handleSubmit();
                        }
                      }}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-10 py-3 text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit();
                  }}
                  disabled={isSubmittingAuth || isCheckingSession}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                >
                  {isSubmittingAuth || isCheckingSession ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Please wait
                    </>
                  ) : mode === 'signin' ? (
                    'Sign in to booking portal'
                  ) : (
                    'Create account and continue'
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
