import { Link } from 'react-router-dom';
import { CalendarClock, Gamepad2, ShieldCheck, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const highlights = [
  {
    title: 'Book by time slot',
    description: 'Customers choose a start time and duration before they arrive.',
    icon: CalendarClock,
  },
  {
    title: 'Pod tied instantly',
    description: 'Each confirmed booking is attached to a real pod, not a vague queue.',
    icon: Gamepad2,
  },
  {
    title: 'Cleaner operations',
    description: 'Staff keep their internal dashboard while customers use a separate flow.',
    icon: ShieldCheck,
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_34%,#fff7ed_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,#164e63_0%,#0a0a0f_32%,#111827_100%)] dark:text-white">
      <ThemeToggle className="absolute right-4 top-4 z-20" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/50 bg-white/70 px-4 py-2 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-cyan-500/20 dark:bg-slate-950/40 dark:shadow-cyan-950/30">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-cyan-500 text-slate-950">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-slate-600 uppercase dark:text-cyan-200">Game Shop</p>
              <p className="text-base font-semibold">Pod Booking</p>
            </div>
          </div>

          <Link
            to="/login"
            className="rounded-full border border-slate-300/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:border-cyan-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-cyan-400"
          >
            Staff sign in
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-12 py-14 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/70 bg-orange-50/80 px-4 py-2 text-sm font-medium text-orange-900 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-200">
              <Sparkles className="h-4 w-4" />
              Customers can log in, reserve a slot, and get a pod assigned immediately
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl dark:text-white">
                Let players lock in their gaming pod before they walk through the door.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
                This customer-facing flow keeps booking simple on the front end while your existing staff dashboard stays focused on live sessions, payments, and floor operations.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/customer/auth"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:shadow-cyan-950/30 dark:hover:bg-cyan-400"
              >
                Customer login / sign up
              </Link>
              <Link
                to="/customer/portal"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white/75 px-6 py-4 text-base font-semibold text-slate-800 backdrop-blur transition hover:border-cyan-400 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:border-cyan-400"
              >
                View booking portal
              </Link>
            </div>
          </section>

          <section className="relative">
            <div className="absolute -left-10 top-12 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/20" />
            <div className="absolute -right-8 bottom-10 h-44 w-44 rounded-full bg-orange-300/40 blur-3xl dark:bg-orange-500/20" />
            <div className="relative space-y-5 rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-2xl shadow-slate-300/30 backdrop-blur dark:border-slate-800 dark:bg-slate-950/55 dark:shadow-cyan-950/20">
              {highlights.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-900/80"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-cyan-500 text-slate-950">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
