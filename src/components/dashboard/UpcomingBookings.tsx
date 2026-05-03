import { formatDistanceToNowStrict } from 'date-fns';
import { CalendarClock, Gamepad2, Phone, Timer } from 'lucide-react';
import type { Booking, Console, Pod } from '@/types';

interface UpcomingBookingsProps {
  bookings: Booking[];
  pods: Pod[];
  consoles: Console[];
}

export function UpcomingBookings({ bookings, pods, consoles }: UpcomingBookingsProps) {
  const upcomingBookings = bookings
    .filter((booking) => booking.status === 'confirmed' || booking.status === 'reserved')
    .slice(0, 6);

  const getPodName = (podId: string) => pods.find((pod) => pod.id === podId)?.name ?? 'Unknown pod';
  const getConsoleName = (consoleId: string) => consoles.find((console) => console.id === consoleId)?.name ?? 'Unknown console';

  return (
    <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Upcoming Bookings</h2>
          <p className="text-sm text-slate-600 dark:text-gray-400">Reserved pods that have not activated yet</p>
        </div>
        <span className="text-slate-600 dark:text-gray-400 text-sm">{upcomingBookings.length} queued</span>
      </div>

      {upcomingBookings.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-gray-500">
          <p>No upcoming bookings</p>
          <p className="text-sm mt-1">New customer reservations will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingBookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#0a0a0f] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{getPodName(booking.pod_id)}</span>
                    <span className="text-xs px-2 py-1 rounded-full font-medium uppercase tracking-wide bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                    <Gamepad2 className="w-4 h-4" />
                    <span>{getConsoleName(booking.console_id)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                    <Phone className="w-4 h-4" />
                    <span>{booking.customer_phone}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-2">
                  <div className="flex items-center justify-end gap-2 text-sm text-slate-700 dark:text-gray-300">
                    <CalendarClock className="w-4 h-4" />
                    <span>{new Date(booking.start_time).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs text-amber-600 dark:text-amber-300">
                    <Timer className="w-4 h-4" />
                    <span>Starts in {formatDistanceToNowStrict(new Date(booking.start_time), { addSuffix: false })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
