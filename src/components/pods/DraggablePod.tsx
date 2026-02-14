import { useState, useRef, useCallback, useEffect } from 'react';
import type { Pod, Console, Session } from '@/types';
import { SessionTimer } from '@/components/sessions/SessionTimer';
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
  Maximize2,
  Minimize2
} from 'lucide-react';
import { usePodStore } from '@/store/useStore';

interface DraggablePodProps {
  pod: Pod;
  console: Console | undefined;
  session: Session | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onPositionChange: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onEdit: () => void;
  onCreateSession: () => void;
  onPayment: () => void;
  showControls?: boolean;
}

const SIZE_PRESETS = {
  small: { width: 160, height: 120 },
  medium: { width: 200, height: 150 },
  large: { width: 240, height: 180 },
};

export function DraggablePod({
  pod,
  console,
  session,
  canvasRef,
  onPositionChange,
  onResize,
  onEdit,
  onCreateSession,
  onPayment,
  showControls = false,
}: DraggablePodProps) {
  const { updatePod, updateSession, cancelSession, completeSession } = usePodStore();
  const [isDragging, setIsDragging] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const podRef = useRef<HTMLDivElement>(null);

  // Use default position if canvas_x/canvas_y are null
  const positionX = pod.canvas_x ?? 50;
  const positionY = pod.canvas_y ?? 50;
  const width = pod.canvas_width ?? 200;
  const height = pod.canvas_height ?? 150;

  // Update current position when pod position changes
  useEffect(() => {
    setCurrentPos({ x: positionX, y: positionY });
  }, [positionX, positionY]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'border-green-500/50 bg-green-500/5 hover:border-green-500';
      case 'occupied': return 'border-cyan-500/50 bg-cyan-500/5 hover:border-cyan-500';
      case 'payment_pending': return 'border-amber-500/50 bg-amber-500/5 hover:border-amber-500';
      case 'maintenance': return 'border-red-500/50 bg-red-500/5 hover:border-red-500';
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

  const handleStartSession = async () => {
    if (session) {
      await updateSession(session.id, { status: 'active' });
      await updatePod(pod.id, { status: 'occupied' });
    }
  };

  const handleEndSession = async () => {
    if (session) {
      await completeSession(session.id, pod.id);
    }
  };

  const handleCancelSession = async () => {
    if (session && confirm('Are you sure you want to cancel this session?')) {
      await cancelSession(session.id, pod.id);
    }
  };

  const handleResize = useCallback((size: 'small' | 'medium' | 'large') => {
    const { width, height } = SIZE_PRESETS[size];
    onResize(width, height);
  }, [onResize]);

  // Custom mouse drag implementation
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only left mouse button
    if (e.button !== 0) return;
    
    // Don't start drag if clicking on a button
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    
    e.preventDefault();
    
    const rect = podRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Calculate offset from mouse to pod's top-left corner
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      
      // Calculate new position relative to canvas
      let newX = e.clientX - canvasRect.left - dragOffset.x;
      let newY = e.clientY - canvasRect.top - dragOffset.y;
      
      // Ensure pod stays within canvas bounds
      newX = Math.max(0, Math.min(newX, 1200 - width));
      newY = Math.max(0, Math.min(newY, 800 - height));
      
      // Update current position in real-time (follows pointer)
      setCurrentPos({ x: newX, y: newY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      
      // Calculate final position
      let newX = e.clientX - canvasRect.left - dragOffset.x;
      let newY = e.clientY - canvasRect.top - dragOffset.y;
      
      // Ensure pod stays within canvas bounds
      newX = Math.max(0, Math.min(newX, 1200 - width));
      newY = Math.max(0, Math.min(newY, 800 - height));
      
      // Save final position
      onPositionChange(newX, newY);
    };

    // Add global mouse listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, canvasRef, width, height, onPositionChange]);

  return (
    <div
      ref={podRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onDoubleClick={onEdit}
      className={`absolute rounded-xl border-2 p-3 transition-shadow select-none ${getStatusColor(pod.status)} ${
        isDragging ? 'z-50 shadow-2xl cursor-grabbing' : 'z-10 cursor-grab'
      }`}
      style={{
        left: isDragging ? currentPos.x : positionX,
        top: isDragging ? currentPos.y : positionY,
        width: width,
        height: height,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {getStatusIcon(pod.status)}
          <span className="font-bold text-white text-sm truncate">{pod.name}</span>
        </div>
      </div>

      {/* Console Info */}
      <div className="flex items-center gap-1.5 mb-2">
        <Gamepad2 className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-300 truncate">
          {console ? console.name : 'No console'}
        </span>
      </div>

      {/* Session Info */}
      {session && (
        <div className="space-y-1 mb-2">
          <div className="text-xs text-gray-400 truncate">
            {session.customer_phone}
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
      {showControls && showActions && (
        <div className="flex flex-wrap gap-1 mt-auto">
          {pod.status === 'available' && console && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSession();
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-400 text-white text-xs rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              New
            </button>
          )}
          {session?.status === 'pending' && session?.payment_status === 'pending' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPayment();
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-white text-xs rounded transition-colors"
            >
              <DollarSign className="w-3 h-3" />
              Pay
            </button>
          )}
          {session?.status === 'pending' && session?.payment_status === 'paid' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartSession();
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-white text-xs rounded transition-colors"
            >
              <Play className="w-3 h-3" />
              Start
            </button>
          )}
          {session?.status === 'active' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Open extend modal
                }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-white text-xs rounded transition-colors"
              >
                <Timer className="w-3 h-3" />
                Extend
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEndSession();
                }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-400 text-white text-xs rounded transition-colors"
              >
                <Pause className="w-3 h-3" />
                End
              </button>
            </>
          )}
          {(session?.status === 'pending' || session?.status === 'active') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelSession();
              }}
              className="px-2 py-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/30 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Resize Controls */}
      {showControls && showActions && (
        <div className="absolute -bottom-8 left-0 flex items-center gap-1 bg-[#1a1a24] border border-gray-800 rounded-lg p-1 shadow-lg"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleResize('small');
            }}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Small"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleResize('medium');
            }}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Medium"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleResize('large');
            }}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Large"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Badge */}
      <div className="absolute top-1 right-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${
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
}
