import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock3, Gamepad2, Loader2, LogOut, Phone, Search, UserRound } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useCustomerStore } from '@/store/useCustomerStore';

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180];

function getNextRoundedSlot() {
  const date = new Date();
  date.setMinutes(Math.ceil(date.getMinutes() / 30) * 30, 0, 0);
  if (date.getMinutes() === 0 && date.getTime() < Date.now()) {
    date.setHours(date.getHours() + 1);
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function CustomerPortalPage() {
  const {
    customer,
    bookings,
    availablePods,
    isSearchingAvailability,
    isCreatingBooking,
    error,
    clearError,
    fetchBookings,
    searchAvailability,
    createBooking,
    signOut,
  } = useCustomerStore();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState(getNextRoundedSlot);
  const [durationMinutes, setDurationMinutes] = useState(60);

  useEffect(() => {
    if (customer) {
      setCustomerName(customer.full_name);
      setCustomerPhone(customer.phone);
    }
  }, [customer]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const bookingEnd = useMemo(() => {
    const start = new Date(startTime);
    return new Date(start.getTime() + durationMinutes * 60000);
  }, [durationMinutes, startTime]);

  const handleAvailabilitySearch = async () => {
    clearError();
    await searchAvailability(new Date(startTime).toISOString(), durationMinutes);
  };

  const handleBooking = async (podId: string) => {
    clearError();
    await createBooking(podId, {
      customerName,
      customerPhone,
      notes,
      startTime: new Date(startTime).toISOString(),
      durationMinutes,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_34%,#fff7ed_100%)] px-4 py-6 dark:bg-[radial-gradient(circle_at_top,#164e63_0%,#0a0a0f_32%,#111827_100%)]">
      <ThemeToggle className="absolute right-4 top-4" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-2xl shadow-slate-300/30 backdrop-blur dark:border-slate-800 dark:bg-slate-950/55">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-cyan-50/80 px-3 py-1 text-sm font-medium text-cyan-900 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200">
                <Gamepad2 className="h-4 w-4" />
                Customer booking portal
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-950 dark:text-white">Reserve your slot and get a pod assigned immediately</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Pick your date, start time, and duration. We will only show pods that are genuinely available for that window.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/80">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{customer?.full_name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{customer?.email}</p>
              <button
                type="button"
                onClick={() => {
                  void signOut();
                }}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-8 2xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-xl shadow-slate-300/20 backdrop-blur dark:border-slate-800 dark:bg-slate-950/55">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-cyan-500 text-slate-950">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Find an available slot</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">Search first, then confirm the pod you want.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Your name</span>
                <span className="relative block">
                  <UserRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
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
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-10 py-3 text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Start time</span>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <div>
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Duration</span>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDurationMinutes(option)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                        durationMinutes === option
                          ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      }`}
                    >
                      {option} min
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Notes for staff</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Optional requests, preferred games, or special setup notes"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <span className="font-semibold">Booking window:</span>{' '}
                {format(new Date(startTime), 'EEE, d MMM yyyy h:mm a')} to {format(bookingEnd, 'h:mm a')}
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleAvailabilitySearch();
                }}
                disabled={isSearchingAvailability || !customerName || !customerPhone || !startTime}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                {isSearchingAvailability ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking pods
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Check availability
                  </>
                )}
              </button>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">Available pods</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{availablePods.length} option(s)</p>
              </div>

              {availablePods.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                  Search availability to see pods that match your chosen time slot.
                </div>
              ) : (
                <div className="grid gap-3">
                  {availablePods.map((pod) => (
                    <div
                      key={pod.pod_id}
                      className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-lg font-bold text-slate-950 dark:text-white">{pod.pod_name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{pod.console_name}</p>
                          <p className="mt-2 inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-200">
                            {pod.console_type}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            void handleBooking(pod.pod_id);
                          }}
                          disabled={isCreatingBooking}
                          className="inline-flex items-center justify-center rounded-2xl bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isCreatingBooking ? 'Reserving...' : 'Reserve this pod'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-xl shadow-slate-300/20 backdrop-blur dark:border-slate-800 dark:bg-slate-950/55">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">My upcoming bookings</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">Confirmed reservations stay tied to their pod.</p>
              </div>
            </div>

            <div className="space-y-3">
              {bookings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                  No bookings yet. Once you reserve a pod, it will appear here with its confirmed time window.
                </div>
              ) : (
                bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-800 dark:bg-slate-900/80"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-bold text-slate-950 dark:text-white">{booking.pod_name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{booking.console_name} • {booking.console_type}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
                        {booking.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      <p>
                        <span className="font-semibold">Booked for:</span> {booking.customer_name} ({booking.customer_phone})
                      </p>
                      <p>
                        <span className="font-semibold">Start:</span> {format(new Date(booking.start_time), 'EEE, d MMM yyyy h:mm a')}
                      </p>
                      <p>
                        <span className="font-semibold">End:</span> {format(new Date(booking.end_time), 'h:mm a')}
                      </p>
                      <p>
                        <span className="font-semibold">Duration:</span> {booking.duration_minutes} minutes
                      </p>
                      <p>
                        <span className="font-semibold">Payment:</span> {booking.payment_status}
                      </p>
                      {booking.notes && (
                        <p>
                          <span className="font-semibold">Notes:</span> {booking.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
