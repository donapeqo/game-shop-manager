import { useMemo } from 'react';
import type { Session, Console } from '@/types';
import { Gamepad2 } from 'lucide-react';

interface ConsolePerformanceProps {
  sessions: Session[];
  consoles: Console[];
}

interface ConsoleStats {
  consoleId: string;
  consoleName: string;
  consoleType: string;
  revenue: number;
  sessionCount: number;
}

export function ConsolePerformance({ sessions, consoles }: ConsolePerformanceProps) {
  const consoleStats = useMemo(() => {
    // Create a map of console data
    const consoleMap = new Map<string, ConsoleStats>();

    // Initialize with all consoles
    consoles.forEach(console => {
      consoleMap.set(console.id, {
        consoleId: console.id,
        consoleName: console.name,
        consoleType: console.type,
        revenue: 0,
        sessionCount: 0
      });
    });

    // Aggregate session data
    sessions
      .filter(session => session.payment_status === 'paid')
      .forEach(session => {
        const stats = consoleMap.get(session.console_id);
        if (stats) {
          stats.revenue += session.payment_amount || 0;
          stats.sessionCount += 1;
        }
      });

    // Convert to array and sort by revenue
    return Array.from(consoleMap.values())
      .sort((a, b) => b.revenue - a.revenue);
  }, [sessions, consoles]);

  const totalRevenue = consoleStats.reduce((sum, c) => sum + c.revenue, 0);

  const getConsoleIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ps5': return '🎮';
      case 'xbox': return '🎯';
      case 'switch': return '🎪';
      case 'pc': return '💻';
      default: return '🎮';
    }
  };

  if (consoleStats.length === 0) {
    return (
      <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Console Performance</h3>
        <div className="text-center py-8 text-gray-500">
          <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No console data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Console Performance</h3>
        <span className="text-gray-400 text-sm">By revenue</span>
      </div>

      <div className="space-y-4">
        {consoleStats.map((console) => {
          const percentage = totalRevenue > 0 
            ? (console.revenue / totalRevenue) * 100 
            : 0;

          return (
            <div key={console.consoleId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getConsoleIcon(console.consoleType)}</span>
                  <span className="text-white font-medium">{console.consoleName}</span>
                </div>
                <div className="text-right">
                  <p className="text-cyan-400 font-bold">RM {console.revenue.toFixed(2)}</p>
                  <p className="text-gray-400 text-xs">{console.sessionCount} sessions</p>
                </div>
              </div>
              
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              <p className="text-gray-500 text-xs text-right">{percentage.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
