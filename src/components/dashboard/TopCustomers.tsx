import { useMemo } from 'react';
import type { Session } from '@/types';
import { Crown, User } from 'lucide-react';

interface TopCustomersProps {
  sessions: Session[];
}

interface CustomerStats {
  phone: string;
  totalSpent: number;
  visitCount: number;
}

export function TopCustomers({ sessions }: TopCustomersProps) {
  const topCustomers = useMemo(() => {
    // Aggregate customer data
    const customerMap = new Map<string, CustomerStats>();

    sessions
      .filter(session => session.payment_status === 'paid')
      .forEach(session => {
        const existing = customerMap.get(session.customer_phone);
        if (existing) {
          existing.totalSpent += session.payment_amount || 0;
          existing.visitCount += 1;
        } else {
          customerMap.set(session.customer_phone, {
            phone: session.customer_phone,
            totalSpent: session.payment_amount || 0,
            visitCount: 1
          });
        }
      });

    // Convert to array and sort by total spent
    return Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [sessions]);

  const maskPhone = (phone: string) => {
    if (phone.length < 8) return phone;
    return `${phone.slice(0, 3)}-****-${phone.slice(-4)}`;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-4 h-4 text-amber-400" />;
    return <span className="text-slate-500 dark:text-gray-500 font-bold w-4 text-center">#{index + 1}</span>;
  };

  if (topCustomers.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Customers</h3>
        <div className="text-center py-8 text-slate-500 dark:text-gray-500">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No customer data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Top Customers</h3>
        <span className="text-slate-600 dark:text-gray-400 text-sm">By lifetime spend</span>
      </div>

      <div className="space-y-3">
        {topCustomers.map((customer, index) => (
          <div
            key={customer.phone}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0a0a0f] rounded-lg border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:border-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              {getRankIcon(index)}
              <div>
                <p className="text-slate-900 dark:text-white font-medium">{maskPhone(customer.phone)}</p>
                <p className="text-slate-600 dark:text-gray-400 text-xs">{customer.visitCount} visits</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-cyan-400 font-bold">RM {customer.totalSpent.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
