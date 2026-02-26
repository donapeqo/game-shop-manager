import { useEffect, useRef, useState } from 'react';
import type { Pod, Console, Session, CanvasSettings } from '@/types';
import { DraggablePod } from './DraggablePod';
import { ImagePlus, X, Grid3X3 } from 'lucide-react';

const TUYA_GATEWAY_BASE_URL = (import.meta.env.VITE_TUYA_GATEWAY_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
type PlugState = 'on' | 'off' | 'offline' | 'loading';

interface CanvasViewProps {
  pods: Pod[];
  consoles: Console[];
  sessions: Session[];
  canvasSettings: CanvasSettings | null;
  onPodPositionChange: (podId: string, x: number, y: number) => void;
  onPodResize: (podId: string, width: number, height: number) => void;
  onPodEdit: (pod: Pod) => void;
  onCreateSession: (pod: Pod) => void;
  onPayment: (session: Session) => void;
  onBackgroundUpload: (base64Image: string) => void;
  onBackgroundRemove: () => void;
  showControls?: boolean;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const GRID_SIZE = 20;

export function CanvasView({
  pods,
  consoles,
  sessions,
  canvasSettings,
  onPodPositionChange,
  onPodResize,
  onPodEdit,
  onCreateSession,
  onPayment,
  onBackgroundUpload,
  onBackgroundRemove,
  showControls = false,
}: CanvasViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
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
    return sessions.find(s => s.id === pod.current_session_id) || null;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);

    const img = new Image();
    img.onload = () => {
      // Resize image to max 1200px width
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const scale = Math.min(1, 1200 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to base64 JPEG at 80% quality
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      onBackgroundUpload(base64);
      setIsUploading(false);
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
  };

  const backgroundImage = canvasSettings?.background_image;

  return (
    <div className="relative bg-[#0a0a0f] rounded-xl border border-gray-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showGrid
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-[#1a1a24] text-gray-400 border border-gray-800 hover:text-white'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="text-sm">Grid</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {backgroundImage && (
            <button
              onClick={onBackgroundRemove}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="text-sm">Remove Background</span>
            </button>
          )}
          <label className="flex items-center gap-2 px-3 py-2 bg-[#1a1a24] text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
          >
            <ImagePlus className="w-4 h-4" />
            <span className="text-sm">{isUploading ? 'Uploading...' : 'Upload Background'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="overflow-auto p-4">
        <div
          ref={canvasRef}
          className="relative mx-auto"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: backgroundImage ? undefined : '#1a1a24',
          }}
        >
          {/* Grid Overlay */}
          {showGrid && !backgroundImage && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
                `,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              }}
            />
          )}

          {/* Pods */}
          {pods.map((pod) => (
            <DraggablePod
              key={pod.id}
              pod={pod}
              console={getPodConsole(pod)}
              session={getPodSession(pod)}
              canvasRef={canvasRef}
              onPositionChange={(x: number, y: number) => onPodPositionChange(pod.id, x, y)}
              onResize={(width: number, height: number) => onPodResize(pod.id, width, height)}
              onEdit={() => onPodEdit(pod)}
              onCreateSession={() => onCreateSession(pod)}
              onPayment={() => {
                const session = getPodSession(pod);
                if (session) onPayment(session);
              }}
              plugState={plugStates[pod.id]}
              showControls={showControls}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
