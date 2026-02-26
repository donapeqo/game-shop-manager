-- Migration: Add Tuya local control fields to pods table
-- Created: 2026-02-26

ALTER TABLE public.pods
ADD COLUMN IF NOT EXISTS tuya_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tuya_device_id TEXT,
ADD COLUMN IF NOT EXISTS tuya_ip_address TEXT,
ADD COLUMN IF NOT EXISTS tuya_protocol_version TEXT DEFAULT '3.5';

COMMENT ON COLUMN public.pods.tuya_enabled IS 'Whether local Tuya control is enabled for this pod';
COMMENT ON COLUMN public.pods.tuya_device_id IS 'Tuya device ID used by local gateway';
COMMENT ON COLUMN public.pods.tuya_ip_address IS 'Local IPv4 of the Tuya smart plug';
COMMENT ON COLUMN public.pods.tuya_protocol_version IS 'Tuya protocol version (e.g. 3.3, 3.4, 3.5)';

CREATE INDEX IF NOT EXISTS idx_pods_tuya_enabled ON public.pods(tuya_enabled);
