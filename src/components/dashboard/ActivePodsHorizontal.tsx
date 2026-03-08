import { useEffect, useState } from 'react';
import type { Pod, Console, Session } from '@/types';
import { SessionTimer } from '@/components/sessions/SessionTimer';
import { ExtendSessionModal } from '@/components/sessions/ExtendSessionModal';
import { usePodStore } from '@/store/useStore';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Gamepad2,
  Plus,
  DollarSign,
  X,
  Timer
} from 'lucide-react';

const TUYA_GATEWAY_BASE_URL = (import.meta.env.VITE_TUYA_GATEWAY_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
type PlugState = 'on' | 'off' | 'offline' | 'loading';

interface ActivePodsHorizontalProps {
  pods: Pod[];
  consoles: Console[];
  sessions: Session[];
  onCreateSession: (pod: Pod) => void;
  onPayment: (session: Session) => void;
}

export function ActivePodsHorizontal({ 
  pods, 
  consoles, 
  sessions,
  onCreateSession,
  onPayment
}: ActivePodsHorizontalProps) {
  const { updatePod, updateSession, cancelSession, completeSession } = usePodStore();
  const [extendSession, setExtendSession] = useState<Session | null>(null);
  const [plugStates, setPlugStates] = useState<Record<string, PlugState>>({});

  useEffect(() => {
    let cancelled = false;

    const fetchPlugStates = async () => {
      const tuyaPods = pods.filter((pod) => pod.tuya_enabled);
      if (tuyaPods.length === 0) {
        if (!cancelled) setPlugStates({});
        return;
      }

      if (!cancelled) {
        setPlugStates((prev) => {
          const next = { ...prev };
          tuyaPods.forEach((pod) => {
            if (!next[pod.id]) next[pod.id] = 'loading';
          });
          return next;
        });
      }

      const results = await Promise.all(
        tuyaPods.map(async (pod) => {
          try {
            const response = await fetch(`${TUYA_GATEWAY_BASE_URL}/api/pods/${pod.id}/status`);
            if (!response.ok) return [pod.id, 'offline'] as const;
            const payload = await response.json();
            const dps = payload?.data?.dps ?? {};
            const switchOne = dps['1'] ?? dps[1];
            if (switchOne === true) return [pod.id, 'on'] as const;
            if (switchOne === false) return [pod.id, 'off'] as const;
            return [pod.id, 'offline'] as const;
          } catch {
            return [pod.id, 'offline'] as const;
          }
        })
      );

      if (!cancelled) {
        setPlugStates((prev) => {
          const next = { ...prev };
          results.forEach(([podId, state]) => {
            next[podId] = state;
          });
          return next;
        });
      }
    };

    fetchPlugStates();
    const interval = setInterval(fetchPlugStates, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pods]);

  // Get only active and pending pods
  const activePods = pods.filter(pod => 
    pod.status === 'occupied' || 
    pod.status === 'payment_pending' ||
    (pod.status === 'available' && pod.console_id)
  );

  const getPodConsole = (pod: Pod) => {
    return consoles.find(c => c.id === pod.console_id);
  };

  const getPodSession = (pod: Pod) => {
    if (!pod.current_session_id) return null;
    return sessions.find(s => s.id === pod.current_session_id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'border-green-500/50 bg-green-500/5';
      case 'occupied': return 'border-cyan-500/50 bg-cyan-500/5';
      case 'payment_pending': return 'border-amber-500/50 bg-amber-500/5';
      case 'maintenance': return 'border-red-500/50 bg-red-500/5';
      default: return 'border-slate-300 dark:border-gray-700 bg-slate-100 dark:bg-gray-800/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'occupied': return <Clock className="w-4 h-4 text-cyan-400" />;
      case 'payment_pending': return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'maintenance': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };

  const handleStartSession = async (pod: Pod) => {
    const session = getPodSession(pod);
    if (session) {
      await updateSession(session.id, { status: 'active' });
      await updatePod(pod.id, { status: 'occupied' });
    }
  };

  const handleEndSession = async (pod: Pod) => {
    const session = getPodSession(pod);
    if (session) {
      await completeSession(session.id, pod.id);
    }
  };

  const handleCancelSession = async (pod: Pod) => {
    const session = getPodSession(pod);
    if (session && confirm('Are you sure you want to cancel this session?')) {
      await cancelSession(session.id, pod.id);
    }
  };

  const getPlugBadge = (pod: Pod) => {
    if (!pod.tuya_enabled) return null;
    const state = plugStates[pod.id] ?? 'loading';
    const color =
      state === 'on'
        ? 'text-green-400 bg-green-500/10 border-green-500/20'
        : state === 'off'
          ? 'text-slate-700 dark:text-gray-300 bg-slate-200/60 dark:bg-gray-500/10 border-slate-300 dark:border-gray-500/20'
          : state === 'loading'
            ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
            : 'text-red-400 bg-red-500/10 border-red-500/20';

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${color}`}>
        plug {state}
      </span>
    );
  };

  if (activePods.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Active Pods</h2>
          <span className="text-slate-600 dark:text-gray-400 text-sm">0 active</span>
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-gray-500">
          <p>No active sessions</p>
          <p className="text-sm mt-1">Create a new session to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Active Pods</h2>
        <span className="text-slate-600 dark:text-gray-400 text-sm">{activePods.length} active</span>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {activePods.map((pod) => {
          const console = getPodConsole(pod);
          const session = getPodSession(pod);

          return (
            <div
              key={pod.id}
              className={`flex-shrink-0 w-[280px] rounded-xl border-2 p-4 ${getStatusColor(pod.status)}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(pod.status)}
                  <span className="font-bold text-slate-900 dark:text-white">{pod.name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                  pod.status === 'available' ? 'bg-green-500/20 text-green-400' :
                  pod.status === 'occupied' ? 'bg-cyan-500/20 text-cyan-400' :
                  pod.status === 'payment_pending' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {pod.status.replace('_', ' ')}
                </span>
              </div>

              {/* Console & Customer */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                  <Gamepad2 className="w-4 h-4 text-slate-500 dark:text-gray-500" />
                  {console ? console.name : 'No console'}
                </div>
                {getPlugBadge(pod)}
                
                {session && (
                  <>
                    <div className="text-sm text-slate-600 dark:text-gray-400">
                      {session.customer_phone}
                    </div>
                    {session.status === 'active' && (
                      <SessionTimer 
                        session={session}
                        onWarning={() => {}}
                        onExpired={() => {}}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {pod.status === 'available' && console && (
                  <button type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onCreateSession(pod);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-400 text-white text-sm rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                )}
                
                {session?.status === 'pending' && session?.payment_status === 'pending' && (
                  <button type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onPayment(session);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm rounded-lg transition-colors"
                  >
                    <DollarSign className="w-4 h-4" />
                    Pay
                  </button>
                )}
                
                {session?.status === 'pending' && session?.payment_status === 'paid' && (
                  <button type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleStartSession(pod);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}
                
                {session?.status === 'active' && (
                  <>
                    <button type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setExtendSession(session);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm rounded-lg transition-colors"
                    >
                      <Timer className="w-4 h-4" />
                      Extend
                    </button>
                    <button type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleEndSession(pod);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-400 text-white text-sm rounded-lg transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      End
                    </button>
                  </>
                )}
                
                {(session?.status === 'pending' || session?.status === 'active') && (
                  <button type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCancelSession(pod);
                    }}
                    className="px-3 py-2 text-slate-600 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-300 dark:border-gray-700 hover:border-red-500/30 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {extendSession && (
        <ExtendSessionModal
          session={extendSession}
          onClose={() => setExtendSession(null)}
          onSuccess={() => setExtendSession(null)}
        />
      )}
    </div>
  );
}
