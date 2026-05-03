import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Loader2, Phone, RefreshCw, Search, Timer, XCircle } from 'lucide-react';
import { usePodStore } from '@/store/useStore';

const FILTERS = ['all', 'reserved', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'] as const;
type BookingFilter = typeof FILTERS[number];

export function BookingsPage() {
  const {
    bookings,
    pods,
    consoles,
    isLoading,
    error,
    fetchBookings,
    fetchPods,
    fetchConsoles,
    activateDueBookings,
    updateBookingStatus,
  } = usePodStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchBookings();
    void fetchPods();
    void fetchConsoles();
  }, [fetchBookings, fetchPods, fetchConsoles]);

  function getPodName(podId: string) {
    return pods.find((pod) => pod.id === podId)?.name ?? 'Unknown pod';
  }

  function getConsoleName(consoleId: string) {
    return consoles.find((console) => console.id === consoleId)?.name ?? 'Unknown console';
  }

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesFilter = filter === 'all' || booking.status === filter;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        booking.customer_name.toLowerCase().includes(term) ||
        booking.customer_phone.toLowerCase().includes(term) ||
        getPodName(booking.pod_id).toLowerCase().includes(term) ||
        getConsoleName(booking.console_id).toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [bookings, filter, search, pods, consoles]);

  const upcomingCount = bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'reserved').length;

  async function handleRefresh() {
    setIsRefreshing(true);
    await activateDueBookings();
    await Promise.all([fetchBookings(), fetchPods()]);
    setIsRefreshing(false);
  }

  async function handleStatusUpdate(bookingId: string, status: 'confirmed' | 'cancelled' | 'no_show') {
    setUpdatingBookingId(bookingId);
    try {
      await updateBookingStatus(bookingId, status);
    } finally {
      setUpdatingBookingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Bookings</h1>
          <p className="text-slate-600 dark:text-gray-400">
            Review customer reservations, confirm arrivals, and handle cancellations before sessions go live.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleRefresh();
          }}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-white transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Activate Due Bookings
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600 dark:text-gray-400">Queued Reservations</span>
            <CalendarClock className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{upcomingCount}</p>
        </div>

        <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600 dark:text-gray-400">Checked In</span>
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {bookings.filter((booking) => booking.status === 'checked_in').length}
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600 dark:text-gray-400">Cancelled / No-show</span>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {bookings.filter((booking) => booking.status === 'cancelled' || booking.status === 'no_show').length}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-gray-800 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by customer, phone, pod, or console"
                className="w-full bg-slate-50 dark:bg-[#0a0a0f] border border-slate-300 dark:border-gray-700 rounded-lg py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    filter === option
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#0a0a0f] dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {option.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-gray-500">
            No bookings match this view yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-gray-800">
            {filteredBookings.map((booking) => {
              const isUpdating = updatingBookingId === booking.id;

              return (
                <div key={booking.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{booking.customer_name}</h2>
                        <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 dark:text-gray-400 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{booking.customer_phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Timer className="w-4 h-4" />
                          <span>{booking.duration_minutes} minutes</span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-700 dark:text-gray-300">Pod:</span> {getPodName(booking.pod_id)}
                        </div>
                        <div>
                          <span className="font-medium text-slate-700 dark:text-gray-300">Console:</span> {getConsoleName(booking.console_id)}
                        </div>
                        <div className="sm:col-span-2">
                          <span className="font-medium text-slate-700 dark:text-gray-300">Window:</span>{' '}
                          {new Date(booking.start_time).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })} to{' '}
                          {new Date(booking.end_time).toLocaleTimeString('en-MY', { timeStyle: 'short' })}
                        </div>
                        {booking.notes && (
                          <div className="sm:col-span-2">
                            <span className="font-medium text-slate-700 dark:text-gray-300">Notes:</span> {booking.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {booking.status === 'reserved' && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleStatusUpdate(booking.id, 'confirmed');
                          }}
                          disabled={isUpdating}
                          className="rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Confirm
                        </button>
                      )}

                      {(booking.status === 'reserved' || booking.status === 'confirmed') && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleStatusUpdate(booking.id, 'cancelled');
                          }}
                          disabled={isUpdating}
                          className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                          Cancel
                        </button>
                      )}

                      {(booking.status === 'confirmed' || booking.status === 'checked_in') && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleStatusUpdate(booking.id, 'no_show');
                          }}
                          disabled={isUpdating}
                          className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/10"
                        >
                          Mark No-show
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
