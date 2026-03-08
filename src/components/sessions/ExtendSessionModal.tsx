import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, DollarSign, Plus, Calendar } from 'lucide-react';
import { usePodStore } from '@/store/useStore';
import { useTimer } from '@/hooks/useTimer';
import type { Session } from '@/types';

interface ExtendSessionModalProps {
  session: Session;
  onClose: () => void;
  onSuccess: () => void;
}

const EXTENSION_OPTIONS = [30, 60, 90, 120];

export function ExtendSessionModal({ session, onClose, onSuccess }: ExtendSessionModalProps) {
  const { extendSession } = usePodStore();
  const { formattedTime } = useTimer(session.end_time);
  
  const [extensionMinutes, setExtensionMinutes] = useState(30);
  const [additionalPayment, setAdditionalPayment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate suggested payment ($5 per 30 minutes)
  const suggestedPayment = (extensionMinutes / 30) * 5;

  const calculateNewEndTime = () => {
    const currentEnd = new Date(session.end_time);
    const newEnd = new Date(currentEnd.getTime() + extensionMinutes * 60000);
    return newEnd.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payment = parseFloat(additionalPayment);
    if (isNaN(payment) || payment < 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    setIsLoading(true);
    
    try {
      await extendSession(session.id, extensionMinutes, payment);
      onSuccess();
      onClose();
    } catch {
      setError('Failed to extend session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Plus className="w-5 h-5 text-slate-900 dark:text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Extend Session</h3>
              <p className="text-sm text-slate-600 dark:text-gray-400">Add more time</p>
            </div>
          </div>
          <button type="button"
            onClick={onClose}
            className="p-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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

          {/* Current Status */}
          <div className="bg-slate-50 dark:bg-[#0a0a0f] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-gray-400 text-sm">Current Time Remaining</span>
              <span className="text-cyan-400 font-mono font-bold">{formattedTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-gray-400 text-sm">Current End Time</span>
              <span className="text-slate-900 dark:text-white text-sm">
                {new Date(session.end_time).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          {/* Extension Duration */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
              Extension Duration *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EXTENSION_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setExtensionMinutes(mins);
                    setAdditionalPayment(((mins / 30) * 5).toFixed(2));
                  }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    extensionMinutes === mins
                      ? 'text-white'
                      : 'bg-slate-50 dark:bg-[#0a0a0f] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-gray-700'
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Additional Payment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              Additional Payment ($) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-gray-500" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={additionalPayment}
                onChange={(e) => setAdditionalPayment(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0a0a0f] border border-slate-300 dark:border-gray-700 rounded-lg py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                placeholder="0.00"
                required
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">
              Suggested: ${suggestedPayment.toFixed(2)} for {extensionMinutes} minutes
            </p>
          </div>

          {/* New End Time Preview */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm text-amber-400 font-medium">New End Time</p>
                <p className="text-lg text-slate-900 dark:text-white font-bold">{calculateNewEndTime()}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !additionalPayment}
              className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>Processing...</>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Extend Session
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
