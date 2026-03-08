import { useEffect, useState } from 'react';
import type { Pod, Console, Session, SortField, SortDirection } from '@/types';
import { SessionTimer } from '@/components/sessions/SessionTimer';
import { ExtendSessionModal } from '@/components/sessions/ExtendSessionModal';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Gamepad2,
  Plus,
  DollarSign,
  Play,
  Timer,
  Pause,
  X,
  Search,
  ChevronUp,
  ChevronDown,
  Filter,
  Settings
} from 'lucide-react';
import { usePodStore } from '@/store/useStore';

const TUYA_GATEWAY_BASE_URL = (import.meta.env.VITE_TUYA_GATEWAY_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
type PlugState = 'on' | 'off' | 'offline' | 'loading';

interface PodListViewProps {
  pods: Pod[];
  consoles: Console[];
  sessions: Session[];
  onEditPod: (pod: Pod) => void;
  onCreateSession: (pod: Pod) => void;
  onPayment: (session: Session) => void;
  showControls?: boolean;
}

interface SortHeaderProps {
  field: SortField;
  children: React.ReactNode;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function SortHeader({ field, children, sortField, sortDirection, onSort }: SortHeaderProps) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );
}

export function PodListView({ pods, consoles, sessions, onEditPod, onCreateSession, onPayment, showControls = false }: PodListViewProps) {
  const { updatePod, updateSession, cancelSession, completeSession } = usePodStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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

  const getPodConsole = (pod: Pod) => {
    return consoles.find(c => c.id === pod.console_id);
  };

  const getPodSession = (pod: Pod) => {
    if (!pod.current_session_id) return null;
    return sessions.find(s => s.id === pod.current_session_id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'occupied': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'payment_pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'maintenance': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-600 dark:text-gray-400 bg-slate-200/60 dark:bg-gray-500/10 border-slate-300 dark:border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle2 className="w-4 h-4" />;
      case 'occupied': return <Clock className="w-4 h-4" />;
      case 'payment_pending': return <AlertCircle className="w-4 h-4" />;
      case 'maintenance': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort pods
  let filteredAndSortedPods = [...pods];

  // Filter by search term
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredAndSortedPods = filteredAndSortedPods.filter(pod => {
      const console = getPodConsole(pod);
      const session = getPodSession(pod);
      return (
        pod.name.toLowerCase().includes(term) ||
        console?.name.toLowerCase().includes(term) ||
        session?.customer_phone.toLowerCase().includes(term)
      );
    });
  }

  // Filter by status
  if (statusFilter !== 'all') {
    filteredAndSortedPods = filteredAndSortedPods.filter(pod => pod.status === statusFilter);
  }

  // Sort
  filteredAndSortedPods.sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'console': {
        const consoleA = getPodConsole(a)?.name || '';
        const consoleB = getPodConsole(b)?.name || '';
        comparison = consoleA.localeCompare(consoleB);
        break;
      }
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'customer': {
        const customerA = getPodSession(a)?.customer_phone || '';
        const customerB = getPodSession(b)?.customer_phone || '';
        comparison = customerA.localeCompare(customerB);
        break;
      }
      case 'timeLeft': {
        const sessionA = getPodSession(a);
        const sessionB = getPodSession(b);
        const timeA = sessionA ? new Date(sessionA.end_time).getTime() : 0;
        const timeB = sessionB ? new Date(sessionB.end_time).getTime() : 0;
        comparison = timeA - timeB;
        break;
      }
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

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
    if (!pod.tuya_enabled) return <span className="text-slate-500 dark:text-gray-500">-</span>;
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
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
        plug {state}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-slate-200 dark:border-gray-800 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search pods, consoles, customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#0a0a0f] border border-slate-300 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-600 dark:text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 dark:bg-[#0a0a0f] border border-slate-300 dark:border-gray-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="payment_pending">Payment Pending</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="text-sm text-slate-600 dark:text-gray-400 sm:ml-auto">
          {filteredAndSortedPods.length} of {pods.length} pods
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50 dark:bg-[#0a0a0f]">
            <tr>
              <SortHeader field="name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Pod Name</SortHeader>
              <SortHeader field="console" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Console</SortHeader>
              <SortHeader field="status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Status</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">Plug</th>
              <SortHeader field="customer" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Customer</SortHeader>
              <SortHeader field="timeLeft" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Time Left</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
	          <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
            {filteredAndSortedPods.map((pod) => {
              const console = getPodConsole(pod);
              const session = getPodSession(pod);

              return (
	                <tr 
	                  key={pod.id} 
	                  className="hover:bg-slate-100 dark:hover:bg-gray-800/30 transition-colors"
	                  onDoubleClick={() => onEditPod(pod)}
	                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(pod.status)}
                      <span className="font-medium text-slate-900 dark:text-white">{pod.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-gray-300">
                      <Gamepad2 className="w-4 h-4 text-slate-500 dark:text-gray-500" />
                      {console ? console.name : <span className="text-slate-500 dark:text-gray-500">No console</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(pod.status)}`}>
                      {pod.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {getPlugBadge(pod)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-slate-700 dark:text-gray-300">
                      {session?.customer_phone || <span className="text-slate-500 dark:text-gray-500">-</span>}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {session?.status === 'active' ? (
                      <SessionTimer 
                        session={session}
                        onWarning={() => {}}
                        onExpired={() => {}}
                      />
                    ) : (
                      <span className="text-slate-500 dark:text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {showControls && pod.status === 'available' && console && (
                        <button type="button"
                          onClick={() => onCreateSession(pod)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white text-xs rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          New
                        </button>
                      )}
                      {session?.status === 'pending' && session?.payment_status === 'pending' && (
                        <button type="button"
                          onClick={() => onPayment(session)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs rounded-lg transition-colors"
                        >
                          <DollarSign className="w-3 h-3" />
                          Pay
                        </button>
                      )}
                      {session?.status === 'pending' && session?.payment_status === 'paid' && (
                        <button type="button"
                          onClick={() => handleStartSession(pod)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs rounded-lg transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </button>
                      )}
                      {session?.status === 'active' && (
                        <>
                          <button type="button"
                            onClick={() => setExtendSession(session)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs rounded-lg transition-colors"
                          >
                            <Timer className="w-3 h-3" />
                            Extend
                          </button>
                          <button type="button"
                            onClick={() => handleEndSession(pod)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs rounded-lg transition-colors"
                          >
                            <Pause className="w-3 h-3" />
                            End
                          </button>
                        </>
                      )}
                      {(session?.status === 'pending' || session?.status === 'active') && (
                        <button type="button"
                          onClick={() => handleCancelSession(pod)}
                          className="p-1.5 text-slate-600 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-300 dark:border-gray-700 hover:border-red-500/30 rounded-lg transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {showControls && pod.status === 'available' && (
                        <button type="button"
                          onClick={() => onEditPod(pod)}
                          className="p-1.5 text-slate-600 dark:text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-slate-300 dark:border-gray-700 hover:border-cyan-500/30 rounded-lg transition-colors"
                          title="Edit Pod Settings"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredAndSortedPods.length === 0 && (
        <div className="p-8 text-center text-slate-500 dark:text-gray-500">
          No pods found matching your criteria
        </div>
      )}

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
