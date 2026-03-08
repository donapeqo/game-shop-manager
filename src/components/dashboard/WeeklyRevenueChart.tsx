import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import type { Session } from '@/types';
import { startOfWeek, addDays, isSameDay, subWeeks } from 'date-fns';

interface WeeklyRevenueChartProps {
  sessions: Session[];
}

export function WeeklyRevenueChart({ sessions }: WeeklyRevenueChartProps) {
  const data = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const lastWeekStart = subWeeks(weekStart, 1);
    
    const weeklyData = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Generate data for each day of the week
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayName = dayNames[i];
      
      // Calculate revenue for this day
      const revenue = sessions
        .filter(session => {
          const sessionDate = new Date(session.created_at);
          return isSameDay(sessionDate, day) && 
                 session.payment_status === 'paid';
        })
        .reduce((sum, session) => sum + (session.payment_amount || 0), 0);

      // Calculate last week's revenue for comparison
      const lastWeekDay = addDays(lastWeekStart, i);
      const lastWeekRevenue = sessions
        .filter(session => {
          const sessionDate = new Date(session.created_at);
          return isSameDay(sessionDate, lastWeekDay) && 
                 session.payment_status === 'paid';
        })
        .reduce((sum, session) => sum + (session.payment_amount || 0), 0);

      weeklyData.push({
        day: dayName,
        revenue: revenue,
        lastWeek: lastWeekRevenue,
        isToday: isSameDay(day, today)
      });
    }

    return weeklyData;
  }, [sessions]);

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalLastWeek = data.reduce((sum, item) => sum + item.lastWeek, 0);
  const weekOverWeekChange = totalLastWeek > 0 
    ? ((totalRevenue - totalLastWeek) / totalLastWeek) * 100 
    : 0;

  return (
    <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Weekly Revenue</h3>
          <p className="text-slate-600 dark:text-gray-400 text-sm">This week vs last week</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xl sm:text-2xl font-bold text-cyan-400">RM {totalRevenue.toFixed(2)}</p>
          <div className="flex items-center sm:justify-end gap-1">
            <span className={`text-xs ${weekOverWeekChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {weekOverWeekChange >= 0 ? '+' : ''}{weekOverWeekChange.toFixed(1)}%
            </span>
            <span className="text-slate-600 dark:text-gray-400 text-xs">vs last week</span>
          </div>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="day" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `RM${value}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1a1a24', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              formatter={(value) => [`RM ${Number(value).toFixed(2)}`, '']}
            />
            <Bar 
              dataKey="lastWeek" 
              fill="#374151" 
              name="Last Week"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="revenue" 
              fill="#06b6d4" 
              name="This Week"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-gray-600"></div>
          <span className="text-xs text-slate-600 dark:text-gray-400">Last Week</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
          <span className="text-xs text-slate-600 dark:text-gray-400">This Week</span>
        </div>
      </div>
    </div>
  );
}
