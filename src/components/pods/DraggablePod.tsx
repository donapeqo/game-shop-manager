import { useState, useRef, useEffect } from 'react';
import type { Pod, Console, Session } from '@/types';
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
  MoveDiagonal2
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
  plugState?: 'on' | 'off' | 'offline' | 'loading';
  showControls?: boolean;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const MIN_WIDTH = 140;
const MIN_HEIGHT = 100;

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
  plugState,
  showControls = false,
}: DraggablePodProps) {
  const { updatePod, updateSession, cancelSession, completeSession } = usePodStore();
  const [isDragging, setIsDragging] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({
    mouseX: 0,
    mouseY: 0,
    width: 0,
    height: 0,
  });
  const [currentSize, setCurrentSize] = useState({ width: 0, height: 0 });
  const [extendSession, setExtendSession] = useState<Session | null>(null);
  const podRef = useRef<HTMLDivElement>(null);

  // Use default position if canvas_x/canvas_y are null
  const positionX = pod.canvas_x ?? 50;
  const positionY = pod.canvas_y ?? 50;
  const width = pod.canvas_width ?? 200;
  const height = pod.canvas_height ?? 150;

  useEffect(() => {
    setCurrentSize({ width, height });
  }, [width, height]);

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

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      width,
      height,
    });
    setCurrentSize({ width, height });
  };

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

    setCurrentPos({ x: positionX, y: positionY });
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging || isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      
      // Calculate new position relative to canvas
      let newX = e.clientX - canvasRect.left - dragOffset.x;
      let newY = e.clientY - canvasRect.top - dragOffset.y;
      
      // Ensure pod stays within canvas bounds
      newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - width));
      newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - height));
      
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
      newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - width));
      newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - height));
      
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
  }, [isDragging, isResizing, dragOffset, canvasRef, width, height, onPositionChange]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.mouseX;
      const deltaY = e.clientY - resizeStart.mouseY;

      const maxWidth = CANVAS_WIDTH - positionX;
      const maxHeight = CANVAS_HEIGHT - positionY;

      const newWidth = Math.max(MIN_WIDTH, Math.min(resizeStart.width + deltaX, maxWidth));
      const newHeight = Math.max(MIN_HEIGHT, Math.min(resizeStart.height + deltaY, maxHeight));

      setCurrentSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onResize(currentSize.width, currentSize.height);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, positionX, positionY, currentSize.width, currentSize.height, onResize]);

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
        width: isResizing ? currentSize.width : width,
        height: isResizing ? currentSize.height : height,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: isDragging || isResizing ? 'none' : 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
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

      {pod.tuya_enabled && (
        <div className="mb-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border ${
            plugState === 'on'
              ? 'text-green-400 border-green-500/30 bg-green-500/10'
              : plugState === 'off'
                ? 'text-gray-300 border-gray-500/30 bg-gray-500/10'
                : plugState === 'loading'
                  ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
                  : 'text-red-400 border-red-500/30 bg-red-500/10'
          }`}>
            plug {plugState || 'loading'}
          </span>
        </div>
      )}

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
                  if (session) setExtendSession(session);
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

      {/* Resize Handle */}
      {showControls && showActions && (
        <button
          onMouseDown={handleResizeMouseDown}
          className={`absolute -bottom-2 -right-2 p-1.5 rounded-md border shadow-lg transition-colors ${
            isResizing
              ? 'bg-cyan-500 text-white border-cyan-400'
              : 'bg-[#1a1a24] text-gray-300 border-gray-700 hover:text-white hover:border-gray-500'
          }`}
          title="Drag to resize"
          aria-label="Drag to resize pod"
        >
          <MoveDiagonal2 className="w-3 h-3" />
        </button>
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
