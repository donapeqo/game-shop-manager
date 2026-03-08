import { useEffect, useState, useMemo } from 'react';
import { usePodStore } from '@/store/useStore';
import { Loader2, ShoppingCart, DollarSign, Calendar, TrendingUp, Plus } from 'lucide-react';
import { DateTimeDisplay } from '@/components/dashboard/DateTimeDisplay';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActivePodsHorizontal } from '@/components/dashboard/ActivePodsHorizontal';
import { HourlyRevenueChart } from '@/components/dashboard/HourlyRevenueChart';
import { WeeklyRevenueChart } from '@/components/dashboard/WeeklyRevenueChart';
import { TopCustomers } from '@/components/dashboard/TopCustomers';
import { ConsolePerformance } from '@/components/dashboard/ConsolePerformance';
import { CreateSessionModal } from '@/components/sessions/CreateSessionModal';
import { PaymentModal } from '@/components/sessions/PaymentModal';
import type { Pod, Session } from '@/types';
import { startOfDay, subDays, startOfWeek, subWeeks, isSameDay, isWithinInterval } from 'date-fns';

export function DashboardPage() {
  const { 
    pods, 
    consoles, 
    sessions, 
    isLoading, 
    fetchPods, 
    fetchConsoles, 
    fetchSessions, 
    subscribeToChanges 
  } = usePodStore();

  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);
  const [paymentSession, setPaymentSession] = useState<Session | null>(null);

  useEffect(() => {
    fetchPods();
    fetchConsoles();
    fetchSessions();
    subscribeToChanges();
  }, [fetchPods, fetchConsoles, fetchSessions, subscribeToChanges]);

  // Calculate today's stats
  const todayStats = useMemo(() => {
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);

    const todaySessions = sessions.filter(s => 
      isSameDay(new Date(s.created_at), today)
    );

    const yesterdaySessions = sessions.filter(s => 
      isSameDay(new Date(s.created_at), yesterday)
    );

    const todayRevenue = todaySessions
      .filter(s => s.payment_status === 'paid')
      .reduce((sum, s) => sum + (s.payment_amount || 0), 0);

    const yesterdayRevenue = yesterdaySessions
      .filter(s => s.payment_status === 'paid')
      .reduce((sum, s) => sum + (s.payment_amount || 0), 0);

    const revenueChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0;

    const ordersChange = yesterdaySessions.length > 0 
      ? ((todaySessions.length - yesterdaySessions.length) / yesterdaySessions.length) * 100 
      : 0;

    return {
      orders: todaySessions.length,
      ordersChange,
      revenue: todayRevenue,
      revenueChange
    };
  }, [sessions]);

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const lastWeekStart = subWeeks(weekStart, 1);
    const lastWeekEnd = subDays(weekStart, 1);

    const thisWeekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.created_at);
      return isWithinInterval(sessionDate, { start: weekStart, end: today });
    });

    const lastWeekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.created_at);
      return isWithinInterval(sessionDate, { start: lastWeekStart, end: lastWeekEnd });
    });

    const thisWeekRevenue = thisWeekSessions
      .filter(s => s.payment_status === 'paid')
      .reduce((sum, s) => sum + (s.payment_amount || 0), 0);

    const lastWeekRevenue = lastWeekSessions
      .filter(s => s.payment_status === 'paid')
      .reduce((sum, s) => sum + (s.payment_amount || 0), 0);

    const revenueChange = lastWeekRevenue > 0 
      ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
      : 0;

    const ordersChange = lastWeekSessions.length > 0 
      ? ((thisWeekSessions.length - lastWeekSessions.length) / lastWeekSessions.length) * 100 
      : 0;

    return {
      orders: thisWeekSessions.length,
      ordersChange,
      revenue: thisWeekRevenue,
      revenueChange,
      dailyAverage: thisWeekSessions.length / 7
    };
  }, [sessions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date/Time and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <DateTimeDisplay />
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => {
              const availablePod = pods.find(p => p.status === 'available' && p.console_id);
              if (availablePod) {
                setSelectedPod(availablePod);
              }
            }}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Orders Today"
          value={todayStats.orders}
          comparison={Number(todayStats.ordersChange.toFixed(1))}
          comparisonLabel="vs yesterday"
          icon={<ShoppingCart className="w-5 h-5 text-cyan-400" />}
          color="cyan"
        />
        <StatsCard
          title="Revenue Today"
          value={`RM ${todayStats.revenue.toFixed(2)}`}
          comparison={Number(todayStats.revenueChange.toFixed(1))}
          comparisonLabel="vs yesterday"
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
          color="green"
        />
        <StatsCard
          title="Weekly Orders"
          value={weeklyStats.orders}
          comparison={Number(weeklyStats.ordersChange.toFixed(1))}
          comparisonLabel="vs last week"
          icon={<Calendar className="w-5 h-5 text-amber-400" />}
          color="amber"
        />
        <StatsCard
          title="Weekly Revenue"
          value={`RM ${weeklyStats.revenue.toFixed(2)}`}
          comparison={Number(weeklyStats.revenueChange.toFixed(1))}
          comparisonLabel="vs last week"
          icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
          color="cyan"
        />
      </div>

      {/* Active Pods Section */}
      <ActivePodsHorizontal
        pods={pods}
        consoles={consoles}
        sessions={sessions}
        onCreateSession={setSelectedPod}
        onPayment={setPaymentSession}
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HourlyRevenueChart sessions={sessions} />
        <WeeklyRevenueChart sessions={sessions} />
      </div>

      {/* Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCustomers sessions={sessions} />
        <ConsolePerformance sessions={sessions} consoles={consoles} />
      </div>

      {/* Modals */}
      {selectedPod && (
        <CreateSessionModal
          pod={selectedPod}
          console={consoles.find(c => c.id === selectedPod.console_id)!}
          onClose={() => setSelectedPod(null)}
          onSuccess={() => {
            fetchSessions();
            fetchPods();
            setSelectedPod(null);
          }}
        />
      )}

      {paymentSession && (
        <PaymentModal
          session={paymentSession}
          onClose={() => setPaymentSession(null)}
          onSuccess={() => {
            fetchSessions();
            fetchPods();
            setPaymentSession(null);
          }}
        />
      )}
    </div>
  );
}
