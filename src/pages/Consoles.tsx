import { useEffect, useState } from 'react';
import { usePodStore } from '@/store/useStore';
import { ConsoleFormModal } from '@/components/consoles/ConsoleFormModal';
import { Plus, Edit2, Gamepad2 } from 'lucide-react';
import type { Console } from '@/types';

const consoleTypes = [
  { value: 'ps5', label: 'PlayStation 5', color: 'bg-blue-500' },
  { value: 'xbox', label: 'Xbox Series X', color: 'bg-green-500' },
  { value: 'switch', label: 'Nintendo Switch', color: 'bg-red-500' },
  { value: 'pc', label: 'Gaming PC', color: 'bg-purple-500' },
];

export function ConsolesPage() {
  const { consoles, fetchConsoles } = usePodStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConsole, setEditingConsole] = useState<Console | null>(null);

  useEffect(() => {
    fetchConsoles();
  }, [fetchConsoles]);

  const getConsoleTypeInfo = (type: string) => {
    return consoleTypes.find(t => t.value === type) || { label: type, color: 'bg-gray-500' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-400 bg-green-400/10';
      case 'in_use': return 'text-cyan-400 bg-cyan-400/10';
      case 'maintenance': return 'text-red-400 bg-red-400/10';
      default: return 'text-slate-600 dark:text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Console Inventory</h1>
          <p className="text-slate-600 dark:text-gray-400">Manage gaming consoles and their status</p>
        </div>
        <button type="button"
          onClick={() => {
            setEditingConsole(null);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Console
        </button>
      </div>

      <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-white dark:bg-[#12121a] border-b border-slate-200 dark:border-gray-800">
            <tr>
              <th className="text-left text-slate-600 dark:text-gray-400 font-medium px-6 py-4">Console</th>
              <th className="text-left text-slate-600 dark:text-gray-400 font-medium px-6 py-4">Type</th>
              <th className="text-left text-slate-600 dark:text-gray-400 font-medium px-6 py-4">Status</th>
              <th className="text-right text-slate-600 dark:text-gray-400 font-medium px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {consoles.map((console) => {
              const typeInfo = getConsoleTypeInfo(console.type);
              return (
                <tr key={console.id} className="hover:bg-slate-100 dark:hover:bg-gray-800/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
                        <Gamepad2 className="w-5 h-5 text-slate-900 dark:text-white" />
                      </div>
                      <span className="text-slate-900 dark:text-white font-medium">{console.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700 dark:text-gray-300">{typeInfo.label}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(console.status)}`}>
                      {console.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button"
                        onClick={() => {
                          setEditingConsole(console);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-600 dark:text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {consoles.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-gray-400">No consoles added yet</p>
            <p className="text-slate-500 dark:text-gray-500 text-sm mt-1">Add your first console to get started</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ConsoleFormModal
          console={editingConsole}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchConsoles();
          }}
        />
      )}
    </div>
  );
}
