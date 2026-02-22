import { useState } from 'react';
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
      default: return 'border-gray-700 bg-gray-800/30';
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

  if (activePods.length === 0) {
    return (
      <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Active Pods</h2>
          <span className="text-gray-400 text-sm">0 active</span>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>No active sessions</p>
          <p className="text-sm mt-1">Create a new session to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Active Pods</h2>
        <span className="text-gray-400 text-sm">{activePods.length} active</span>
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
                  <span className="font-bold text-white">{pod.name}</span>
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
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Gamepad2 className="w-4 h-4 text-gray-500" />
                  {console ? console.name : 'No console'}
                </div>
                
                {session && (
                  <>
                    <div className="text-sm text-gray-400">
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
                  <button
                    onClick={() => onCreateSession(pod)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-400 text-white text-sm rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                )}
                
                {session?.status === 'pending' && session?.payment_status === 'pending' && (
                  <button
                    onClick={() => onPayment(session)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm rounded-lg transition-colors"
                  >
                    <DollarSign className="w-4 h-4" />
                    Pay
                  </button>
                )}
                
                {session?.status === 'pending' && session?.payment_status === 'paid' && (
                  <button
                    onClick={() => handleStartSession(pod)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}
                
                {session?.status === 'active' && (
                  <>
                    <button
                      onClick={() => setExtendSession(session)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm rounded-lg transition-colors"
                    >
                      <Timer className="w-4 h-4" />
                      Extend
                    </button>
                    <button
                      onClick={() => handleEndSession(pod)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-400 text-white text-sm rounded-lg transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      End
                    </button>
                  </>
                )}
                
                {(session?.status === 'pending' || session?.status === 'active') && (
                  <button
                    onClick={() => handleCancelSession(pod)}
                    className="px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/30 rounded-lg transition-colors"
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
