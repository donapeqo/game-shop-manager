import { LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '@/types';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-[#1a1a24] border border-gray-800 rounded-lg p-1">
      <button
        onClick={() => onViewChange('grid')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentView === 'grid'
            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        Grid View
      </button>
      <button
        onClick={() => onViewChange('list')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentView === 'list'
            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        <List className="w-4 h-4" />
        List View
      </button>
    </div>
  );
}
