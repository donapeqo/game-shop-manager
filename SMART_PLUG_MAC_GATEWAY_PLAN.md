# Local Tuya Smart Plug Plan (Mac First, Pi Later)

## Goal
Use your Mac as a temporary local gateway for Tuya smart plug control now, then move the same service to Raspberry Pi later with minimal code changes.

## Architecture (Recommended)
- Cloud app: existing frontend + Supabase (unchanged)
- Local gateway: Node.js service running on your Mac
- Device control path: App -> Supabase/API -> Mac gateway -> Tuya plug on LAN

## Why this approach
- Works before buying a Raspberry Pi
- Matches production design you will keep later
- Avoids exposing Tuya local keys to frontend clients

## Security rules
- Do not store `local_key` in `pods` table or frontend state
- Keep secrets in Mac gateway `.env` only
- Expose gateway using secure tunnel/VPN only (Cloudflare Tunnel, Tailscale, or ngrok for testing)

## Implementation plan

### Phase 1: Prepare before hardware arrives
1. Create a local gateway service on Mac
   - Runtime: Node.js
   - Tuya library: `tuyapi`
   - Endpoints:
     - `POST /register` (pod + device metadata)
     - `POST /control` (`on`/`off` by `pod_id`)
     - `GET /status/:pod_id`
     - `GET /health`
2. Add Supabase mapping table
   - Table: `pod_power_devices`
   - Columns:
     - `id` (uuid pk)
     - `pod_id` (uuid fk unique -> pods.id)
     - `provider` (`tuya_local`)
     - `device_id`
     - `ip_address`
     - `protocol_version` (default `3.3`)
     - `enabled` (bool)
     - `last_seen` (timestamptz)
     - `current_state` (bool)
     - timestamps
3. Add command logs table
   - Table: `plug_control_logs`
   - Track action, pod_id, success, error, latency, triggered_by, created_at
4. Update app integration points
   - Pod settings UI: add smart plug registration fields
   - Session lifecycle hooks:
     - session start -> `turn_on`
     - session end/cancel -> `turn_off`
5. Local dev operations
   - Disable Mac sleep during tests
   - Ensure Mac and plug are on same reachable LAN
   - Reserve DHCP IP for each plug

### Phase 2: When physical plug arrives
1. Pair plug using Tuya Smart app (2.4GHz network)
2. Extract:
   - `device_id`
   - `local_key`
   - plug IP address
   - protocol version (`3.3`/`3.4`)
3. Register device to a pod via gateway `POST /register`
4. Run connection test + manual toggle test
5. Validate automatic session on/off flow
6. Review logs and retry behavior

### Phase 3: Migrate to Raspberry Pi later
1. Copy gateway service + `.env` to Pi
2. Assign static IP to Pi
3. Run as systemd/PM2 service with auto-restart
4. Repoint cloud callback/tunnel from Mac to Pi
5. Re-run health check and control tests

## Definition of done
- Pod can be registered to one Tuya plug
- Manual `on/off` works from app
- Session start/end triggers plug automatically
- No Tuya secret is exposed in frontend or public DB reads
- Control activity is logged with success/failure

## Notes
- Keep this as the baseline design so Mac -> Pi migration is infrastructure-only.
