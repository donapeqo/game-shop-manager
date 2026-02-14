import { useState, useEffect, useCallback } from 'react';
import { PodFormModal } from '@/components/pods/PodFormModal';
import { CanvasView } from '@/components/pods/CanvasView';
import { PodListView } from '@/components/pods/PodListView';
import { ViewToggle } from '@/components/pods/ViewToggle';
import { CreateSessionModal } from '@/components/sessions/CreateSessionModal';
import { PaymentModal } from '@/components/sessions/PaymentModal';
import { usePodStore } from '@/store/useStore';
import { Loader2, Plus } from 'lucide-react';
import type { Pod, ViewMode, Session } from '@/types';

export function PodsPage() {
  const { 
    pods, 
    consoles, 
    sessions, 
    canvasSettings,
    isLoading, 
    fetchPods, 
    fetchConsoles, 
    fetchSessions,
    fetchCanvasSettings,
    updatePodPosition, 
    updatePodSize,
    updateCanvasBackground
  } = usePodStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPod, setEditingPod] = useState<Pod | null>(null);
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);
  const [paymentSession, setPaymentSession] = useState<Session | null>(null);

  // Load saved view preference
  useEffect(() => {
    const savedView = localStorage.getItem('pods-view-mode') as ViewMode;
    if (savedView && (savedView === 'grid' || savedView === 'list')) {
      requestAnimationFrame(() => {
        setViewMode(savedView);
      });
    }
  }, []);

  // Save view preference
  useEffect(() => {
    localStorage.setItem('pods-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    fetchPods();
    fetchConsoles();
    fetchSessions();
    fetchCanvasSettings();
  }, [fetchPods, fetchConsoles, fetchSessions, fetchCanvasSettings]);

  const handleAddPod = () => {
    setEditingPod(null);
    setIsModalOpen(true);
  };

  const handleEditPod = (pod: Pod) => {
    setEditingPod(pod);
    setIsModalOpen(true);
  };

  const handlePodPositionChange = useCallback(async (podId: string, x: number, y: number) => {
    await updatePodPosition(podId, x, y);
  }, [updatePodPosition]);

  const handlePodResize = useCallback(async (podId: string, width: number, height: number) => {
    await updatePodSize(podId, width, height);
  }, [updatePodSize]);

  const handleBackgroundUpload = useCallback(async (base64Image: string) => {
    await updateCanvasBackground(base64Image);
  }, [updateCanvasBackground]);

  const handleBackgroundRemove = useCallback(async () => {
    await updateCanvasBackground(null);
  }, [updateCanvasBackground]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pod Management</h1>
          <p className="text-gray-400">Manage gaming pod layout and assignments</p>
        </div>
        <div className="flex items-center gap-4">
          <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
          <button
            onClick={handleAddPod}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Pod
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <CanvasView
          pods={pods}
          consoles={consoles}
          sessions={sessions}
          canvasSettings={canvasSettings}
          onPodPositionChange={handlePodPositionChange}
          onPodResize={handlePodResize}
          onPodEdit={handleEditPod}
          onCreateSession={setSelectedPod}
          onPayment={setPaymentSession}
          onBackgroundUpload={handleBackgroundUpload}
          onBackgroundRemove={handleBackgroundRemove}
          showControls
        />
      ) : (
        <PodListView
          pods={pods}
          consoles={consoles}
          sessions={sessions}
          onEditPod={handleEditPod}
          onCreateSession={setSelectedPod}
          onPayment={setPaymentSession}
          showControls
        />
      )}

      {/* Pod Form Modal */}
      {isModalOpen && (
        <PodFormModal
          pod={editingPod}
          consoles={consoles}
          existingPods={pods}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchPods();
          }}
        />
      )}

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
    </div>
  );
}
