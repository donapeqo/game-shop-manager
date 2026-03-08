import { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePodStore, useAuthStore } from '@/store/useStore';
import { X, Phone } from 'lucide-react';
import type { Pod, Console } from '@/types';

interface CreateSessionModalProps {
  pod: Pod;
  console: Console;
  onClose: () => void;
  onSuccess: () => void;
}

const TIME_INCREMENTS = [30, 60, 90, 120, 150, 180, 240, 300];

export function CreateSessionModal({ pod, console, onClose, onSuccess }: CreateSessionModalProps) {
  const { createSession } = usePodStore();
  const { user } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [duration, setDuration] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  const handleDurationChange = (mins: number) => {
    setDuration(mins);
  };

  const handleCreateSession = async () => {
    if (!user) return;

    setIsLoading(true);
    
    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60000);

    try {
      await createSession({
        pod_id: pod.id,
        console_id: console.id,
        customer_phone: phoneNumber,
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: duration,
        payment_status: 'pending',
        payment_amount: 0,
        status: 'pending',
        created_by: user.id,
      });

      onSuccess();
      onClose();
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-800">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">New Session</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400">{pod.name} - {console.name}</p>
          </div>
          <button type="button"
            onClick={onClose}
            className="p-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleCreateSession();
          }}
          className="p-6 space-y-6"
        >
          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              Customer Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-gray-500" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full bg-slate-50 dark:bg-[#0a0a0f] border border-slate-300 dark:border-gray-700 rounded-lg py-3 pl-10 pr-4 text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_INCREMENTS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleDurationChange(mins)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    duration === mins
                      ? 'text-white'
                      : 'bg-slate-50 dark:bg-[#0a0a0f] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-gray-700'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <p className="text-sm text-amber-400 font-medium mb-1">Payment Required</p>
            <p className="text-xs text-slate-600 dark:text-gray-400">
              Payment will be recorded after session creation. Suggested amount: ${(duration / 30 * 5).toFixed(2)}
            </p>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 dark:bg-[#0a0a0f] rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-gray-400">Pod:</span>
              <span className="text-slate-900 dark:text-white">{pod.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-gray-400">Console:</span>
              <span className="text-slate-900 dark:text-white">{console.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-gray-400">Duration:</span>
              <span className="text-slate-900 dark:text-white">{duration} minutes</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-gray-800">
              <span className="text-slate-600 dark:text-gray-400">Suggested Payment:</span>
              <span className="text-cyan-400 font-bold">${(duration / 30 * 5).toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void handleCreateSession();
              }}
              disabled={isLoading || !phoneNumber}
              className="flex-1 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
