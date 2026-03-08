import { useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import type { Session } from '@/types';
import { format, startOfDay, addHours, isSameDay } from 'date-fns';

interface HourlyRevenueChartProps {
  sessions: Session[];
}

export function HourlyRevenueChart({ sessions }: HourlyRevenueChartProps) {
  const data = useMemo(() => {
    const today = startOfDay(new Date());
    const hourlyData = [];

    // Generate all 24 hours
    for (let i = 0; i < 24; i++) {
      const hour = addHours(today, i);
      const hourStr = format(hour, 'HH:00');
      
      // Calculate revenue for this hour
      const revenue = sessions
        .filter(session => {
          const sessionDate = new Date(session.created_at);
          return isSameDay(sessionDate, today) && 
                 sessionDate.getHours() === i &&
                 session.payment_status === 'paid';
        })
        .reduce((sum, session) => sum + (session.payment_amount || 0), 0);

      hourlyData.push({
        hour: hourStr,
        revenue: revenue,
        isCurrentHour: new Date().getHours() === i
      });
    }

    return hourlyData;
  }, [sessions]);

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hourly Revenue Today</h3>
          <p className="text-slate-600 dark:text-gray-400 text-sm">Revenue breakdown by hour</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xl sm:text-2xl font-bold text-cyan-400">RM {totalRevenue.toFixed(2)}</p>
          <p className="text-slate-600 dark:text-gray-400 text-xs">Total today</p>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="hour" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              interval={2}
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
              formatter={(value) => [`RM ${Number(value).toFixed(2)}`, 'Revenue']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#06b6d4" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
