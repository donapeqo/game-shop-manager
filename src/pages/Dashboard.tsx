import { useEffect } from 'react';
import { usePodStore } from '@/store/useStore';
import { PodGrid } from '@/components/pods/PodGrid';
import { Loader2 } from 'lucide-react';

export function DashboardPage() {
  const { pods, consoles, sessions, isLoading, fetchPods, fetchConsoles, fetchSessions, subscribeToChanges } = usePodStore();

  useEffect(() => {
    fetchPods();
    fetchConsoles();
    fetchSessions();
    subscribeToChanges();
  }, [fetchPods, fetchConsoles, fetchSessions, subscribeToChanges]);

  const activeSessions = sessions.filter(s => s.status === 'active');
  const pendingPayments = sessions.filter(s => s.status === 'pending');
  const availablePods = pods.filter(p => p.status === 'available');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Real-time overview of all gaming pods</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-4">
          <p className="text-gray-400 text-sm mb-1">Total Pods</p>
          <p className="text-3xl font-bold text-white">{pods.length}</p>
        </div>
        <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-4">
          <p className="text-gray-400 text-sm mb-1">Available</p>
          <p className="text-3xl font-bold text-green-400">{availablePods.length}</p>
        </div>
        <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-4">
          <p className="text-gray-400 text-sm mb-1">Active Sessions</p>
          <p className="text-3xl font-bold text-cyan-400">{activeSessions.length}</p>
        </div>
        <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-4">
          <p className="text-gray-400 text-sm mb-1">Pending Payment</p>
          <p className="text-3xl font-bold text-amber-400">{pendingPayments.length}</p>
        </div>
      </div>

      {/* Pod Grid */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Pod Status</h2>
        <PodGrid pods={pods} consoles={consoles} sessions={sessions} />
      </div>
    </div>
  );
}
