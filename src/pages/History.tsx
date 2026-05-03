import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Search,
  Phone,
  Calendar,
  Clock,
  Gamepad2,
  DollarSign,
  Loader2,
  Users,
  ChevronRight,
  Receipt,
  Trophy,
} from 'lucide-react';
import type { RentalHistory } from '@/types';

interface CustomerSummary {
  phone: string;
  totalSpent: number;
  visitCount: number;
  totalMinutes: number;
  lastVisit: string;
}

export function HistoryPage() {
  const [rentals, setRentals] = useState<RentalHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { data, error: historyError } = await supabase
        .from('rental_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      const rows = data || [];
      setRentals(rows);
      if (rows.length > 0) {
        setSelectedPhone((current) => current ?? rows[0].customer_phone);
      }
    } catch (loadError) {
      console.error('Failed to fetch customer history:', loadError);
      setError('Failed to load customer details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const customerMap = new Map<string, CustomerSummary>();

  rentals.forEach((rental) => {
    const existing = customerMap.get(rental.customer_phone);

    if (existing) {
      existing.totalSpent += rental.amount_paid;
      existing.visitCount += 1;
      existing.totalMinutes += rental.duration_minutes;
      if (new Date(rental.created_at) > new Date(existing.lastVisit)) {
        existing.lastVisit = rental.created_at;
      }
      return;
    }

    customerMap.set(rental.customer_phone, {
      phone: rental.customer_phone,
      totalSpent: rental.amount_paid,
      visitCount: 1,
      totalMinutes: rental.duration_minutes,
      lastVisit: rental.created_at,
    });
  });

  const customers = Array.from(customerMap.values()).sort((a, b) => {
    if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
    return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
  });

  const filteredCustomers = customers.filter((customer) =>
    customer.phone.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const selectedCustomer =
    filteredCustomers.find((customer) => customer.phone === selectedPhone) ??
    customers.find((customer) => customer.phone === selectedPhone) ??
    filteredCustomers[0] ??
    null;

  useEffect(() => {
    if (!selectedCustomer && filteredCustomers.length > 0) {
      setSelectedPhone(filteredCustomers[0].phone);
    }
  }, [filteredCustomers, selectedCustomer]);

  const selectedRentals = selectedCustomer
    ? rentals.filter((rental) => rental.customer_phone === selectedCustomer.phone)
    : [];

  const totalCustomerRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Customer Details</h1>
        <p className="text-slate-600 dark:text-gray-400">
          Rank customers by total paid and click in to view their visit history.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600 dark:text-gray-400">Total Customers</span>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{customers.length}</p>
        </div>

        <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600 dark:text-gray-400">Lifetime Revenue</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="break-words text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">RM {totalCustomerRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600 dark:text-gray-400">Top Customer</span>
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{customers[0]?.phone || '-'}</p>
          <p className="text-sm text-cyan-400 mt-1">
            {customers[0] ? `RM ${customers[0].totalSpent.toFixed(2)}` : 'No data yet'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Customers</h2>
                <p className="text-sm text-slate-600 dark:text-gray-400">Sorted by total paid</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void loadHistory();
                }}
                disabled={isLoading}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-gray-500" />
              <input
                type="tel"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer phone"
                className="w-full bg-slate-50 dark:bg-[#0a0a0f] border border-slate-300 dark:border-gray-700 rounded-lg py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-gray-800 max-h-[65vh] overflow-auto">
              {filteredCustomers.map((customer, index) => {
                const isSelected = selectedCustomer?.phone === customer.phone;

                return (
                  <button
                    key={customer.phone}
                    type="button"
                    onClick={() => setSelectedPhone(customer.phone)}
                    className={`w-full text-left p-4 transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/10'
                        : 'hover:bg-slate-100 dark:hover:bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-slate-100 dark:bg-[#0a0a0f] text-xs font-semibold text-slate-700 dark:text-gray-300">
                            {index + 1}
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{customer.phone}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-gray-400">
                          <span>{customer.visitCount} visits</span>
                          <span>{customer.totalMinutes} mins</span>
                          <span>Last {formatDate(customer.lastVisit)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-cyan-400 font-bold">RM {customer.totalSpent.toFixed(2)}</p>
                        <ChevronRight className={`w-4 h-4 ml-auto mt-2 ${isSelected ? 'text-cyan-400' : 'text-slate-400 dark:text-gray-500'}`} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <Users className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-gray-400">No customers match this search.</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
          {selectedCustomer ? (
            <>
              <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-gray-800">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Customer Overview</h2>
                    <div className="mt-3 flex items-center gap-2 text-slate-700 dark:text-gray-300">
                      <Phone className="w-4 h-4 text-slate-500 dark:text-gray-500" />
                      <span className="font-medium">{selectedCustomer.phone}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:min-w-[320px]">
                    <div className="rounded-lg bg-slate-50 dark:bg-[#0a0a0f] border border-slate-200 dark:border-gray-800 p-3">
                      <p className="text-xs text-slate-600 dark:text-gray-400">Total Paid</p>
                      <p className="text-lg font-bold text-cyan-400 mt-1">RM {selectedCustomer.totalSpent.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-[#0a0a0f] border border-slate-200 dark:border-gray-800 p-3">
                      <p className="text-xs text-slate-600 dark:text-gray-400">Visits</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{selectedCustomer.visitCount}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-[#0a0a0f] border border-slate-200 dark:border-gray-800 p-3">
                      <p className="text-xs text-slate-600 dark:text-gray-400">Play Time</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{selectedCustomer.totalMinutes} mins</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-[#0a0a0f] border border-slate-200 dark:border-gray-800 p-3">
                      <p className="text-xs text-slate-600 dark:text-gray-400">Last Visit</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{formatDate(selectedCustomer.lastVisit)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Visit Details</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Every completed rental recorded for this customer.
                </p>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-gray-800">
                {selectedRentals.map((rental) => (
                  <div key={rental.id} className="p-4 sm:p-6 hover:bg-slate-100 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <Gamepad2 className="w-5 h-5 text-slate-900 dark:text-white" />
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-white font-medium">{rental.pod_name}</p>
                            <p className="text-sm text-slate-600 dark:text-gray-400">{rental.console_name}</p>
                          </div>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(rental.start_time)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(rental.start_time)} - {formatTime(rental.end_time)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-cyan-400 font-bold text-lg">
                          <DollarSign className="w-5 h-5" />
                          {rental.amount_paid.toFixed(2)}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-gray-500 mt-1">
                          {rental.duration_minutes} minutes
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 px-4">
              <Phone className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-slate-900 dark:text-white font-medium">No customer selected</p>
              <p className="text-slate-600 dark:text-gray-400 mt-1">
                Pick a customer from the list to view details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
