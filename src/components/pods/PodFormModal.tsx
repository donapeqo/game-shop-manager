import { useState } from 'react';
import { X, Grid3X3, Plus, Trash2, Edit2 } from 'lucide-react';
import { usePodStore } from '@/store/useStore';
import type { Pod, Console } from '@/types';

interface PodFormModalProps {
  pod?: Pod | null;
  consoles: Console[];
  existingPods: Pod[];
  onClose: () => void;
  onSuccess: () => void;
}

export function PodFormModal({ pod, consoles, existingPods, onClose, onSuccess }: PodFormModalProps) {
  const { createPod, updatePod, deletePod } = usePodStore();
  const isEditing = !!pod;
  
  const [name, setName] = useState(pod?.name || '');
  const [consoleId, setConsoleId] = useState(pod?.console_id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const availableConsoles = consoles.filter(c => 
    c.status === 'available' && (c.id === consoleId || !existingPods.some(p => p.console_id === c.id && p.id !== pod?.id))
  );

  const validateForm = () => {
    if (!name.trim()) return 'Pod name is required';
    if (!consoleId) return 'Console assignment is required';

    const nameTaken = existingPods.some(p =>
      p.name.toLowerCase() === name.trim().toLowerCase() && p.id !== pod?.id
    );
    if (nameTaken) return 'Pod name must be unique';

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      if (isEditing && pod) {
        await updatePod(pod.id, {
          name: name.trim(),
          console_id: consoleId
        });
      } else {
        await createPod({
          name: name.trim(),
          row: 1,
          col: 1,
          console_id: consoleId,
          status: 'available',
          canvas_x: 0,
          canvas_y: 0,
          canvas_width: 200,
          canvas_height: 150
        });
      }
      onSuccess();
      onClose();
    } catch {
      setError('Failed to save pod. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pod) return;
    
    if (pod.status !== 'available') {
      setError('Cannot delete pod with active or pending session');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this pod?')) return;
    
    setIsLoading(true);
    try {
      await deletePod(pod.id);
      onSuccess();
      onClose();
    } catch {
      setError('Failed to delete pod. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a24] rounded-xl border border-gray-800 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                {isEditing ? 'Edit Pod' : 'Add New Pod'}
              </h3>
              <p className="text-sm text-gray-400">
                {isEditing ? 'Update pod details' : 'Create a new gaming pod'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pod Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., VIP Station 1"
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Assigned Console *
            </label>
            <select
              value={consoleId}
              onChange={(e) => setConsoleId(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              required
            >
              <option value="">Select a console...</option>
              {availableConsoles.map((console) => (
                <option key={console.id} value={console.id}>
                  {console.name} ({console.type})
                </option>
              ))}
            </select>
            {availableConsoles.length === 0 && (
              <p className="text-amber-400 text-xs mt-2">
                No available consoles. All consoles are assigned to other pods.
              </p>
            )}
          </div>



          <div className="flex gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !consoleId}
              className="flex-1 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>Processing...</>
              ) : (
                <>
                  {isEditing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isEditing ? 'Update Pod' : 'Create Pod'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
