import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Phone, Calendar, Clock, Gamepad2, DollarSign, Loader2 } from 'lucide-react';
import type { RentalHistory } from '@/types';

export function HistoryPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [rentals, setRentals] = useState<RentalHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!phoneNumber.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from('rental_history')
        .select('*')
        .eq('customer_phone', phoneNumber)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRentals(data || []);
    } catch (error) {
      console.error('Failed to fetch rental history:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const calculateTotalSpent = () => {
    return rentals.reduce((sum, rental) => sum + rental.amount_paid, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Rental History</h1>
        <p className="text-slate-600 dark:text-gray-400">Search rental history by customer phone number</p>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-4 sm:p-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            Customer Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-gray-500" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number"
              className="w-full bg-slate-50 dark:bg-[#0a0a0f] border border-slate-300 dark:border-gray-700 rounded-lg py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        <div className="mt-4 sm:mt-6">
          <button type="button"
            onClick={handleSearch}
            disabled={isLoading || !phoneNumber.trim()}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search History
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Rental Records</h2>
              {rentals.length > 0 && (
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-gray-400">Total Spent</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    ${calculateTotalSpent().toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {rentals.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {rentals.map((rental) => (
                <div key={rental.id} className="p-4 sm:p-6 hover:bg-slate-100 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(rental.start_time)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>
                            {formatTime(rental.start_time)} - {formatTime(rental.end_time)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
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
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-gray-400">No rental history found for this phone number</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
