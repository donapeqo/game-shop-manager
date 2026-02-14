import { useState, useEffect } from 'react';
import { PodGrid } from '@/components/pods/PodGrid';
import { PodFormModal } from '@/components/pods/PodFormModal';
import { usePodStore } from '@/store/useStore';
import { Loader2, Plus, Settings } from 'lucide-react';
import type { Pod } from '@/types';

export function PodsPage() {
  const { pods, consoles, sessions, isLoading, fetchPods, fetchConsoles, fetchSessions } = usePodStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPod, setEditingPod] = useState<Pod | null>(null);

  useEffect(() => {
    fetchPods();
    fetchConsoles();
    fetchSessions();
  }, [fetchPods, fetchConsoles, fetchSessions]);

  const handleAddPod = () => {
    setEditingPod(null);
    setIsModalOpen(true);
  };

  const handleEditPod = (pod: Pod) => {
    setEditingPod(pod);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pod Management</h1>
          <p className="text-gray-400">Manage gaming pod layout and assignments</p>
        </div>
        <button
          onClick={handleAddPod}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Pod
        </button>
      </div>

      <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Grid Layout</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Settings className="w-4 h-4" />
            <span>Click on a pod to edit</span>
          </div>
        </div>
        <PodGrid 
          pods={pods} 
          consoles={consoles} 
          sessions={sessions} 
          showControls 
          onEditPod={handleEditPod}
        />
      </div>

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
    </div>
  );
}
