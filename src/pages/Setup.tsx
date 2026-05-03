import { Power, PlugZap, ShieldAlert } from 'lucide-react';
import { useAppSettingsStore } from '@/store/useStore';

export function SetupPage() {
  const tuyaConnectivityEnabled = useAppSettingsStore((state) => state.tuyaConnectivityEnabled);
  const setTuyaConnectivityEnabled = useAppSettingsStore((state) => state.setTuyaConnectivityEnabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Setup</h1>
        <p className="text-slate-600 dark:text-gray-400">
          Configure shop-wide app behavior and integrations.
        </p>
      </div>

      <section className="bg-white dark:bg-[#1a1a24] rounded-xl border border-slate-200 dark:border-gray-800 p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <PlugZap className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Tuya Connectivity</h2>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
              Turn this off to stop all gateway polling and automated power actions without deleting pod-level Tuya settings.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-[#12121a] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Power className={`w-4 h-4 ${tuyaConnectivityEnabled ? 'text-green-500' : 'text-amber-500'}`} />
              <span className="font-medium text-slate-900 dark:text-white">
                {tuyaConnectivityEnabled ? 'Connected features enabled' : 'Connected features disabled'}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
              {tuyaConnectivityEnabled
                ? 'The app can talk to the Tuya gateway for status checks and session-based power control.'
                : 'The app will ignore the Tuya gateway until you switch this back on.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTuyaConnectivityEnabled(!tuyaConnectivityEnabled)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              tuyaConnectivityEnabled
                ? 'bg-amber-500 text-white hover:bg-amber-400'
                : 'bg-cyan-500 text-white hover:bg-cyan-400'
            }`}
          >
            <Power className="w-4 h-4" />
            {tuyaConnectivityEnabled ? 'Turn Off Tuya' : 'Turn On Tuya'}
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-gray-800 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-slate-500 dark:text-gray-400 mt-0.5" />
            <div className="space-y-1 text-sm text-slate-600 dark:text-gray-400">
              <p>This switch is saved in this browser, so it works well as an operations toggle for the device you use at the counter.</p>
              <p>Existing Tuya pod assignments are preserved and will work again when you re-enable connectivity.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
