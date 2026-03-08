import { useState } from 'react';
import { usePodStore } from '@/store/useStore';
import { SessionTimer } from '@/components/sessions/SessionTimer';
import { CreateSessionModal } from '@/components/sessions/CreateSessionModal';
import { PaymentModal } from '@/components/sessions/PaymentModal';
import { ExtendSessionModal } from '@/components/sessions/ExtendSessionModal';
import type { Pod, Console, Session } from '@/types';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  MoreVertical,
  Gamepad2,
  Plus,
  DollarSign,
  X,
  Timer
} from 'lucide-react';

interface PodGridProps {
  pods: Pod[];
  consoles: Console[];
  sessions: Session[];
  showControls?: boolean;
  onEditPod?: (pod: Pod) => void;
}

export function PodGrid({ pods, consoles, sessions, showControls = false, onEditPod }: PodGridProps) {
  const { updatePod, updateSession, cancelSession, completeSession, fetchPods, fetchSessions } = usePodStore();
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);
  const [paymentSession, setPaymentSession] = useState<Session | null>(null);
  const [extendSession, setExtendSession] = useState<Session | null>(null);

  // Group pods by row
  const podsByRow = pods.reduce((acc, pod) => {
    if (!acc[pod.row]) acc[pod.row] = [];
    acc[pod.row].push(pod);
    return acc;
  }, {} as Record<number, Pod[]>);

  // Sort rows and pods within rows
  const sortedRows = Object.keys(podsByRow)
    .map(Number)
    .sort((a, b) => a - b);

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

  return (
    <div className="space-y-4">
      {sortedRows.map(row => (
        <div key={row} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {podsByRow[row]
            .sort((a, b) => a.col - b.col)
            .map(pod => {
              const console = getPodConsole(pod);
              const session = getPodSession(pod);

              return (
                <div
                  key={pod.id}
                  className={`relative rounded-xl border-2 p-4 transition-all duration-200 ${getStatusColor(pod.status)}`}
                >
                  {/* Pod Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(pod.status)}
                      <span className="font-bold text-slate-900 dark:text-white text-lg">{pod.name}</span>
                    </div>
                    {showControls && onEditPod && pod.status === 'available' && (
                      <button type="button" 
                        onClick={() => onEditPod(pod)}
                        className="text-slate-600 dark:text-gray-400 hover:text-cyan-400 p-1 hover:bg-cyan-400/10 rounded transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Console Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <Gamepad2 className="w-4 h-4 text-slate-600 dark:text-gray-400" />
                    <span className="text-sm text-slate-700 dark:text-gray-300">
                      {console ? console.name : 'No console assigned'}
                    </span>
                  </div>

                  {/* Session Info */}
                  {session && (
                    <div className="space-y-2 mb-3">
                      <div className="text-xs text-slate-600 dark:text-gray-400">
                        Customer: {session.customer_phone}
                      </div>
                      {session.status === 'active' && (
                        <SessionTimer 
                          session={session}
                          onWarning={() => {}}
                          onExpired={() => {}}
                        />
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {showControls && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {pod.status === 'available' && console && (
                        <button type="button"
                          onClick={() => setSelectedPod(pod)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-400 text-white text-sm rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          New Session
                        </button>
                      )}
                      {session?.status === 'pending' && session?.payment_status === 'pending' && (
                        <button type="button"
                          onClick={() => setPaymentSession(session)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm rounded-lg transition-colors"
                        >
                          <DollarSign className="w-4 h-4" />
                          Pay
                        </button>
                      )}
                      {session?.status === 'pending' && session?.payment_status === 'paid' && (
                        <button type="button"
                          onClick={() => handleStartSession(pod)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </button>
                      )}
                      {session?.status === 'active' && (
                        <>
                          <button type="button"
                            onClick={() => setExtendSession(session)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm rounded-lg transition-colors"
                          >
                            <Timer className="w-4 h-4" />
                            Extend
                          </button>
                          <button type="button"
                            onClick={() => handleEndSession(pod)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-400 text-white text-sm rounded-lg transition-colors"
                          >
                            <Pause className="w-4 h-4" />
                            End
                          </button>
                        </>
                      )}
                      {(session?.status === 'pending' || session?.status === 'active') && (
                        <button type="button"
                          onClick={() => handleCancelSession(pod)}
                          className="px-3 py-2 text-slate-600 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-300 dark:border-gray-700 hover:border-red-500/30 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                      pod.status === 'available' ? 'bg-green-500/20 text-green-400' :
                      pod.status === 'occupied' ? 'bg-cyan-500/20 text-cyan-400' :
                      pod.status === 'payment_pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {pod.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      ))}

      {/* Create Session Modal */}
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

      {/* Payment Modal */}
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

      {/* Extend Session Modal */}
      {extendSession && (
        <ExtendSessionModal
          session={extendSession}
          onClose={() => setExtendSession(null)}
          onSuccess={() => {
            fetchSessions();
            fetchPods();
            setExtendSession(null);
          }}
        />
      )}
    </div>
  );
}
