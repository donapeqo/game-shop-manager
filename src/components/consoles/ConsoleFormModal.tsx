import { useState } from 'react';
import { X, Gamepad2, Plus, Trash2, Edit2 } from 'lucide-react';
import { usePodStore } from '@/store/useStore';
import type { Console } from '@/types';

interface ConsoleFormModalProps {
  console?: Console | null;
  onClose: () => void;
  onSuccess: () => void;
}

const consoleTypes = [
  { value: 'ps5', label: 'PlayStation 5' },
  { value: 'xbox', label: 'Xbox Series X' },
  { value: 'switch', label: 'Nintendo Switch' },
  { value: 'pc', label: 'Gaming PC' },
];

const consoleStatuses = [
  { value: 'available', label: 'Available' },
  { value: 'in_use', label: 'In Use' },
  { value: 'maintenance', label: 'Maintenance' },
];

export function ConsoleFormModal({ console: editingConsole, onClose, onSuccess }: ConsoleFormModalProps) {
  const { createConsole, updateConsole, deleteConsole } = usePodStore();
  const isEditing = !!editingConsole;
  
  const [name, setName] = useState(editingConsole?.name || '');
  const [type, setType] = useState(editingConsole?.type || 'ps5');
  const [status, setStatus] = useState<'available' | 'in_use' | 'maintenance'>(editingConsole?.status || 'available');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Console name is required');
      return;
    }

    setIsLoading(true);
    
    try {
      if (isEditing && editingConsole) {
        await updateConsole(editingConsole.id, {
          name: name.trim(),
          type,
          status
        });
      } else {
        await createConsole({
          name: name.trim(),
          type,
          status
        });
      }
      onSuccess();
      onClose();
    } catch {
      setError('Failed to save console. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingConsole) return;
    
    if (!confirm('Are you sure you want to delete this console?')) return;
    
    setIsLoading(true);
    try {
      await deleteConsole(editingConsole.id);
      onSuccess();
      onClose();
    } catch {
      setError('Failed to delete console. It may be assigned to a pod.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a24] rounded-xl border border-gray-800 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                {isEditing ? 'Edit Console' : 'Add New Console'}
              </h3>
              <p className="text-sm text-gray-400">
                {isEditing ? 'Update console details' : 'Add a gaming console'}
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
              Console Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., PlayStation 5 #1"
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Console Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              required
            >
              {consoleTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'available' | 'in_use' | 'maintenance')}
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              required
            >
              {consoleStatuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
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
              disabled={isLoading || !name.trim()}
              className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>Processing...</>
              ) : (
                <>
                  {isEditing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isEditing ? 'Update Console' : 'Create Console'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
