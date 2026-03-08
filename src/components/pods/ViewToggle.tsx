import { LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '@/types';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-gray-800 rounded-lg p-1 w-full sm:w-auto">
      <button type="button"
        onClick={() => onViewChange('grid')}
        className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentView === 'grid'
            ? 'text-white shadow-lg shadow-cyan-500/25'
            : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Grid View</span>
        <span className="sm:hidden">Grid</span>
      </button>
      <button type="button"
        onClick={() => onViewChange('list')}
        className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentView === 'list'
            ? 'text-white shadow-lg shadow-cyan-500/25'
            : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800'
        }`}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">List View</span>
        <span className="sm:hidden">List</span>
      </button>
    </div>
  );
}
