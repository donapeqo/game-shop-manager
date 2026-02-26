import { useEffect, useState } from 'react';
import { X, Grid3X3, Plus, Trash2, Edit2 } from 'lucide-react';
import { usePodStore } from '@/store/useStore';
import type { Pod, Console } from '@/types';

const TUYA_GATEWAY_BASE_URL = (import.meta.env.VITE_TUYA_GATEWAY_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

interface PodFormModalProps {
  pod?: Pod | null;
  consoles: Console[];
  existingPods: Pod[];
  onClose: () => void;
  onSuccess: () => void;
}

interface GatewayPodConfig {
  device_id?: string;
  ip?: string;
  version?: string | number;
  enabled?: boolean;
}

export function PodFormModal({ pod, consoles, existingPods, onClose, onSuccess }: PodFormModalProps) {
  const { createPod, updatePod, deletePod } = usePodStore();
  const isEditing = !!pod;
  
  const [name, setName] = useState(pod?.name || '');
  const [consoleId, setConsoleId] = useState(pod?.console_id || '');
  const [tuyaEnabled, setTuyaEnabled] = useState(Boolean(pod?.tuya_enabled));
  const [tuyaDeviceId, setTuyaDeviceId] = useState(pod?.tuya_device_id || '');
  const [tuyaIpAddress, setTuyaIpAddress] = useState(pod?.tuya_ip_address || '');
  const [tuyaProtocolVersion, setTuyaProtocolVersion] = useState(pod?.tuya_protocol_version || '3.5');
  const [tuyaLocalKey, setTuyaLocalKey] = useState('');
  const [existingGatewayConfigs, setExistingGatewayConfigs] = useState<Record<string, GatewayPodConfig>>({});
  const [selectedExistingPodId, setSelectedExistingPodId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tuyaEnabled) {
      loadExistingGatewayConfigs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableConsoles = consoles.filter(c => 
    c.status === 'available' && (c.id === consoleId || !existingPods.some(p => p.console_id === c.id && p.id !== pod?.id))
  );

  const validateForm = () => {
    if (!name.trim()) return 'Pod name is required';
    if (!consoleId) return 'Console assignment is required';

    const nameTaken = existingPods.some(p =>
      p.name.toLowerCase() === name.trim().toLowerCase() && p.id !== pod?.id
    );
    if (nameTaken) return 'Pod name must be unique';

    if (tuyaEnabled) {
      if (!selectedExistingPodId && !tuyaLocalKey.trim() && isEditing) {
        return 'Provide Local Key or choose existing registered config for gateway sync';
      }
      if (!tuyaDeviceId.trim()) return 'Tuya Device ID is required when Tuya is enabled';
      if (!tuyaIpAddress.trim()) return 'Tuya IP Address is required when Tuya is enabled';
      if (!tuyaProtocolVersion.trim()) return 'Tuya protocol version is required when Tuya is enabled';
    }

    return '';
  };

  const registerPlugInGateway = async (podId: string) => {
    if (!tuyaEnabled) return;

    if (selectedExistingPodId) {
      const response = await fetch(`${TUYA_GATEWAY_BASE_URL}/api/pods/register-from-existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pod_id: podId,
          source_pod_id: selectedExistingPodId
        })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Gateway clone registration failed (${response.status}): ${body}`);
      }
      return;
    }

    if (!tuyaLocalKey.trim()) return;

    const response = await fetch(`${TUYA_GATEWAY_BASE_URL}/api/pods/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pod_id: podId,
        device_id: tuyaDeviceId.trim(),
        ip: tuyaIpAddress.trim(),
        local_key: tuyaLocalKey.trim(),
        version: tuyaProtocolVersion.trim(),
        enabled: true
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gateway registration failed (${response.status}): ${body}`);
    }
  };

  const loadExistingGatewayConfigs = async () => {
    try {
      const response = await fetch(`${TUYA_GATEWAY_BASE_URL}/api/pods`);
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.ok && payload?.data && typeof payload.data === 'object') {
        setExistingGatewayConfigs(payload.data as Record<string, GatewayPodConfig>);
      }
    } catch {
      // Optional helper data only; ignore fetch errors.
    }
  };

  const applyExistingConfig = (sourcePodId: string) => {
    setSelectedExistingPodId(sourcePodId);
    const cfg = existingGatewayConfigs[sourcePodId];
    if (!cfg) return;
    if (cfg.device_id) setTuyaDeviceId(cfg.device_id);
    if (cfg.ip) setTuyaIpAddress(cfg.ip);
    if (cfg.version) setTuyaProtocolVersion(String(cfg.version));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      if (isEditing && pod) {
        await updatePod(pod.id, {
          name: name.trim(),
          console_id: consoleId,
          tuya_enabled: tuyaEnabled,
          tuya_device_id: tuyaEnabled ? tuyaDeviceId.trim() : null,
          tuya_ip_address: tuyaEnabled ? tuyaIpAddress.trim() : null,
          tuya_protocol_version: tuyaEnabled ? tuyaProtocolVersion.trim() : null
        });
        await registerPlugInGateway(pod.id);
      } else {
        const createdPod = await createPod({
          name: name.trim(),
          row: 1,
          col: 1,
          console_id: consoleId,
          status: 'available',
          canvas_x: 0,
          canvas_y: 0,
          canvas_width: 200,
          canvas_height: 150,
          tuya_enabled: tuyaEnabled,
          tuya_device_id: tuyaEnabled ? tuyaDeviceId.trim() : null,
          tuya_ip_address: tuyaEnabled ? tuyaIpAddress.trim() : null,
          tuya_protocol_version: tuyaEnabled ? tuyaProtocolVersion.trim() : null
        });
        await registerPlugInGateway(createdPod.id);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pod. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pod) return;
    
    if (pod.status !== 'available') {
      setError('Cannot delete pod with active or pending session');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this pod?')) return;
    
    setIsLoading(true);
    try {
      await deletePod(pod.id);
      onSuccess();
      onClose();
    } catch {
      setError('Failed to delete pod. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a24] rounded-xl border border-gray-800 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                {isEditing ? 'Edit Pod' : 'Add New Pod'}
              </h3>
              <p className="text-sm text-gray-400">
                {isEditing ? 'Update pod details' : 'Create a new gaming pod'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pod Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., VIP Station 1"
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Assigned Console *
            </label>
            <select
              value={consoleId}
              onChange={(e) => setConsoleId(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              required
            >
              <option value="">Select a console...</option>
              {availableConsoles.map((console) => (
                <option key={console.id} value={console.id}>
                  {console.name} ({console.type})
                </option>
              ))}
            </select>
            {availableConsoles.length === 0 && (
              <p className="text-amber-400 text-xs mt-2">
                No available consoles. All consoles are assigned to other pods.
              </p>
            )}
          </div>

          <div className="border border-gray-800 rounded-lg p-4 space-y-4 bg-[#12121a]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">Local Tuya Smart Plug</h4>
                <p className="text-xs text-gray-400">Enable pod power automation via local gateway</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={tuyaEnabled}
                  onChange={(e) => {
                    setTuyaEnabled(e.target.checked);
                    if (e.target.checked) {
                      loadExistingGatewayConfigs();
                    }
                  }}
                  className="accent-cyan-500"
                />
                Enabled
              </label>
            </div>

            {tuyaEnabled && (
              <>
                {Object.keys(existingGatewayConfigs).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Use Existing Registered Plug (optional)
                    </label>
                    <select
                      value={selectedExistingPodId}
                      onChange={(e) => applyExistingConfig(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select existing pod config...</option>
                      {Object.entries(existingGatewayConfigs).map(([sourcePodId, cfg]) => (
                        <option key={sourcePodId} value={sourcePodId}>
                          {sourcePodId} - {cfg.device_id || 'unknown'} @ {cfg.ip || 'unknown'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Selecting one reuses gateway credentials; no local key re-entry required.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Device ID *</label>
                  <input
                    type="text"
                    value={tuyaDeviceId}
                    onChange={(e) => setTuyaDeviceId(e.target.value)}
                    placeholder="e.g. a331aba7306ca3dfb6dvma"
                    className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2.5 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">IP Address *</label>
                    <input
                      type="text"
                      value={tuyaIpAddress}
                      onChange={(e) => setTuyaIpAddress(e.target.value)}
                      placeholder="192.168.100.216"
                      className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2.5 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Protocol *</label>
                    <input
                      type="text"
                      value={tuyaProtocolVersion}
                      onChange={(e) => setTuyaProtocolVersion(e.target.value)}
                      placeholder="3.5"
                      className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2.5 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Local Key {isEditing ? '(optional if using existing registered config)' : '(optional now, can add later)'}
                  </label>
                  <input
                    type="password"
                    value={tuyaLocalKey}
                    onChange={(e) => setTuyaLocalKey(e.target.value)}
                    placeholder="Paste local key to register with local gateway"
                    className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg py-2.5 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </>
            )}
          </div>



          <div className="flex gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !consoleId}
              className="flex-1 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>Processing...</>
              ) : (
                <>
                  {isEditing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isEditing ? 'Update Pod' : 'Create Pod'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
