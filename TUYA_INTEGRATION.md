# Tuya Smart Plug Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Hardware Requirements](#hardware-requirements)
3. [Initial Setup Guide](#initial-setup-guide)
4. [Architecture](#architecture)
5. [Database Schema](#database-schema)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Session Lifecycle Integration](#session-lifecycle-integration)
9. [Testing Guide](#testing-guide)
10. [Security Considerations](#security-considerations)
11. [Cost Breakdown](#cost-breakdown)
12. [Alternative Options](#alternative-options)
13. [Troubleshooting](#troubleshooting)
14. [Next Steps](#next-steps)

---

## Overview

### What This Integration Does

The Tuya Smart Plug Integration enables automated power control for gaming pods in the game shop management system. Each gaming station (pod) can be equipped with a Tuya-compatible smart plug that:

- **Automatically turns on** when a gaming session starts
- **Automatically turns off** when a session ends or timer expires
- **Provides manual override** for staff to control power remotely
- **Logs all power events** for monitoring and troubleshooting
- **Supports real-time status monitoring** to verify device state

### Why Tuya Was Chosen

| Feature | Tuya | Competitors |
|---------|------|-------------|
| **Local Network Control** | ✅ Direct LAN communication | ❌ Often cloud-only |
| **Price** | $8-15 per plug | $15-30 per plug |
| **Protocol** | Standardized, well-documented | Proprietary |
| **Availability** | Widely available globally | Region-limited |
| **No Hub Required** | ✅ WiFi direct | ❌ Often requires hub |
| **Deno/Edge Function Support** | ✅ UDP/TCP support | ❌ Limited |

**Key Advantages:**
- Local control without internet dependency
- Affordable for scaling to 20+ pods
- Works with Deno runtime in Supabase Edge Functions
- Large ecosystem of compatible devices
- No subscription fees

---

## Hardware Requirements

### Recommended Tuya Smart Plugs

#### Option 1: Gosund EP2 (Best Value)
- **Model:** Gosund EP2 or EP10
- **Price:** $8-12 per unit
- **Specs:** 10A/2200W, WiFi, compact design
- **Where to Buy:** Amazon, AliExpress, local electronics stores
- **Pros:** Reliable, affordable, easy to set up
- **Cons:** Basic features only

#### Option 2: BlitzWolf BW-SHP6
- **Model:** BW-SHP6 or BW-SHP13
- **Price:** $10-15 per unit
- **Specs:** 15A/3300W, power monitoring, WiFi
- **Where to Buy:** Banggood, AliExpress
- **Pros:** Power usage monitoring, higher capacity
- **Cons:** Slightly more expensive

#### Option 3: Tuya Generic (Budget)
- **Model:** Generic Tuya WiFi Plug (various brands)
- **Price:** $6-10 per unit
- **Specs:** 10A/2200W, WiFi
- **Where to Buy:** AliExpress, Temu
- **Pros:** Cheapest option
- **Cons:** Quality varies by manufacturer

### Required Equipment Per Pod

```
Per Gaming Pod:
├── 1x Tuya Smart Plug ($8-15)
├── Power cable from plug to PC/monitor
└── WiFi coverage (2.4GHz required)

For 10 Pods:
├── 10x Smart Plugs ($80-150)
├── 1x Dedicated 2.4GHz WiFi router/AP ($30-50)
└── Optional: UPS for network equipment ($50-100)
```

### Network Requirements

- **WiFi:** 2.4GHz network (5GHz not supported by most Tuya plugs)
- **Bandwidth:** Minimal (< 1KB per command)
- **Latency:** < 100ms for responsive control
- **IP Range:** Static IPs recommended (DHCP reservations)
- **Firewall:** Allow UDP port 6666 and TCP port 6668

---

## Initial Setup Guide

### Step 1: Physical Installation

1. **Unpack the smart plug**
2. **Plug into wall outlet** near the gaming pod
3. **Connect gaming PC/monitor** to the smart plug
4. **Ensure WiFi coverage** - test with phone at plug location

### Step 2: Tuya Smart App Setup

1. **Download Tuya Smart App**
   - iOS: App Store
   - Android: Google Play

2. **Create Account**
   - Sign up with email or phone
   - Verify account

3. **Add Device**
   ```
   App Flow:
   Home → + (Add Device) → Electrical → Socket (WiFi)
   → Hold plug button for 5 seconds (rapid blinking)
   → Enter WiFi credentials (2.4GHz only)
   → Wait for connection (30-60 seconds)
   → Name device (e.g., "Pod-01")
   ```

4. **Test in App**
   - Toggle on/off from app
   - Verify device responds

### Step 3: Extract Device Credentials

This is the most critical step for local control.

#### Method 1: Tuya IoT Platform (Recommended)

1. **Create Tuya Developer Account**
   - Visit: https://iot.tuya.com
   - Sign up and verify

2. **Create Cloud Project**
   ```
   Steps:
   1. Cloud → Create Cloud Project
   2. Project Name: "GameShop Plugs"
   3. Industry: Smart Home
   4. Development Method: Smart Home
   5. Data Center: Select your region
   ```

3. **Link Tuya Smart App Account**
   ```
   Cloud → Projects → GameShop Plugs
   → Devices → Link Tuya App Account
   → QR Code → Scan with Tuya Smart App
   → Accept linking request
   ```

4. **Get Device Information**
   ```
   Cloud → Projects → GameShop Plugs → Devices
   → Click on device → Device Details
   
   Required fields:
   - Device ID (e.g., "bf1234567890abcdef1234")
   - Device Key/Secret (e.g., "1234567890abcdef")
   - Local Key (under "Device Information")
   ```

5. **Get Device IP Address**
   ```bash
   # From your router admin panel
   # Look for devices named "ESP_*" or "Tuya-*"
   # Or use network scanner app
   
   # Example router page:
   Connected Devices:
   - 192.168.1.45: ESP_GOSUND_01 (Pod-01)
   - 192.168.1.46: ESP_GOSUND_02 (Pod-02)
   ```

#### Method 2: Local Network Scanning (Advanced)

```bash
# Install tuya-cli (requires Node.js)
npm install -g @tuya/cli

# Scan local network for Tuya devices
tuya-cli list

# Output example:
# Device ID: bf1234567890abcdef1234
# Product Key: key1234567890abcdef
# IP: 192.168.1.45
```

### Step 4: Document Credentials

Create a secure record for each device:

```yaml
Pod-01:
  device_id: "bf1234567890abcdef1234"
  local_key: "fedcba0987654321"
  ip_address: "192.168.1.45"
  name: "Pod-01"
  
Pod-02:
  device_id: "bf1234567890abcdef5678"
  local_key: "abcdef1234567890"
  ip_address: "192.168.1.46"
  name: "Pod-02"
```

**⚠️ Security Warning:** Store these credentials securely. Never commit to Git.

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   PodGrid    │  │ SessionTimer │  │ SmartPlug    │          │
│  │   Component  │  │   Component  │  │ Toggle       │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                    ┌──────▼──────┐                             │
│                    │  Supabase   │                             │
│                    │   Client    │                             │
│                    └──────┬──────┘                             │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTPS/WSS
┌───────────────────────────┼─────────────────────────────────────┐
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              SUPABASE EDGE FUNCTIONS                    │   │
│  │  ┌─────────────────┐    ┌──────────────────────────┐   │   │
│  │  │  control-plug   │    │ session-plug-automation  │   │   │
│  │  │  (Manual/API)   │    │     (Webhooks)           │   │   │
│  │  └────────┬────────┘    └────────────┬─────────────┘   │   │
│  │           │                          │                  │   │
│  │           └────────────┬─────────────┘                  │   │
│  │                        ▼                                │   │
│  │              ┌──────────────────┐                       │   │
│  │              │  Tuya Protocol   │                       │   │
│  │              │  (UDP/TCP)       │                       │   │
│  │              └────────┬─────────┘                       │   │
│  └───────────────────────┼─────────────────────────────────┘   │
└──────────────────────────┼─────────────────────────────────────┘
                           │ Local Network
┌──────────────────────────┼─────────────────────────────────────┐
│                          ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    LOCAL NETWORK                        │   │
│  │                                                         │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │   │  Tuya Plug  │  │  Tuya Plug  │  │  Tuya Plug  │    │   │
│  │   │  Pod-01     │  │  Pod-02     │  │  Pod-NN     │    │   │
│  │   │ 192.168.1.45│  │ 192.168.1.46│  │ 192.168.1.NN│    │   │
│  │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │   │
│  │          │                │                │            │   │
│  │          └────────────────┴────────────────┘            │   │
│  │                    WiFi Router                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Examples

#### Manual Toggle Flow
```
1. User clicks toggle in SmartPlugToggle component
2. Frontend calls Supabase Edge Function: control-plug
3. Edge Function validates request
4. Edge Function sends Tuya protocol command via UDP
5. Smart plug toggles power
6. Edge Function logs action to database
7. Response returns to frontend
8. UI updates to reflect new state
```

#### Session Automation Flow
```
1. Session starts (timer begins)
2. Supabase webhook triggers session-plug-automation
3. Edge Function looks up pod's smart plug
4. Sends "turn on" command to plug
5. Logs automation action
6. PC/monitor receives power

[Session ends]
1. Timer expires or user ends session
2. Webhook triggers automation function
3. Sends "turn off" command
4. Logs action
5. PC/monitor powers down
```

---

## Database Schema

### Migration: Add Tuya Fields to Pods Table

```sql
-- Migration: add_tuya_fields_to_pods.sql
-- Run this in Supabase SQL Editor

-- Add Tuya smart plug configuration fields to pods table
ALTER TABLE pods 
ADD COLUMN IF NOT EXISTS tuya_device_id TEXT,
ADD COLUMN IF NOT EXISTS tuya_local_key TEXT,
ADD COLUMN IF NOT EXISTS tuya_ip_address INET,
ADD COLUMN IF NOT EXISTS tuya_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tuya_last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tuya_current_state BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN pods.tuya_device_id IS 'Tuya device ID (e.g., bf1234567890abcdef1234)';
COMMENT ON COLUMN pods.tuya_local_key IS 'Tuya local encryption key for device communication';
COMMENT ON COLUMN pods.tuya_ip_address IS 'Local IP address of the smart plug';
COMMENT ON COLUMN pods.tuya_enabled IS 'Whether Tuya integration is active for this pod';
COMMENT ON COLUMN pods.tuya_last_seen IS 'Last successful communication timestamp';
COMMENT ON COLUMN pods.tuya_current_state IS 'Current power state (TRUE = ON, FALSE = OFF)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pods_tuya_enabled ON pods(tuya_enabled) 
WHERE tuya_enabled = TRUE;
```

### Migration: Create Plug Control Logs Table

```sql
-- Migration: create_plug_control_logs.sql

-- Create table for logging all plug control actions
CREATE TABLE IF NOT EXISTS plug_control_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'turn_on', 'turn_off', 'toggle', 'status_check'
    triggered_by VARCHAR(100) NOT NULL, -- 'manual', 'session_start', 'session_end', 'timer_expire', 'system'
    user_id UUID REFERENCES auth.users(id), -- NULL for automated actions
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    device_state_before BOOLEAN,
    device_state_after BOOLEAN,
    response_time_ms INTEGER, -- Network response time
    ip_address INET, -- IP at time of action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- Additional context (session_id, etc.)
);

-- Add comments
COMMENT ON TABLE plug_control_logs IS 'Audit log for all smart plug control actions';
COMMENT ON COLUMN plug_control_logs.action IS 'Type of control action performed';
COMMENT ON COLUMN plug_control_logs.triggered_by IS 'What triggered this action';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_plug_logs_pod_id ON plug_control_logs(pod_id);
CREATE INDEX IF NOT EXISTS idx_plug_logs_created_at ON plug_control_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plug_logs_action ON plug_control_logs(action);
CREATE INDEX IF NOT EXISTS idx_plug_logs_triggered_by ON plug_control_logs(triggered_by);

-- Index for querying recent logs per pod
CREATE INDEX IF NOT EXISTS idx_plug_logs_pod_created 
ON plug_control_logs(pod_id, created_at DESC);
```

### Migration: Row Level Security Policies

```sql
-- Migration: add_plug_rls_policies.sql

-- Enable RLS on plug_control_logs
ALTER TABLE plug_control_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for pods they have access to
CREATE POLICY "Users can view plug logs for accessible pods"
ON plug_control_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM pods 
        WHERE pods.id = plug_control_logs.pod_id
        AND pods.shop_id IN (
            SELECT shop_id FROM user_shops 
            WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Only admins can insert logs (Edge Functions bypass RLS)
CREATE POLICY "Only system can insert plug logs"
ON plug_control_logs
FOR INSERT
TO authenticated
WITH CHECK (
    -- Edge functions use service role, bypassing this
    -- Direct inserts blocked for regular users
    FALSE
);

-- Policy: Only admins can delete logs
CREATE POLICY "Only admins can delete plug logs"
ON plug_control_logs
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_shops 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Update pods table RLS for Tuya fields
CREATE POLICY "Staff can update Tuya config for their pods"
ON pods
FOR UPDATE
TO authenticated
USING (
    shop_id IN (
        SELECT shop_id FROM user_shops 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    shop_id IN (
        SELECT shop_id FROM user_shops 
        WHERE user_id = auth.uid()
    )
);
```

### Migration: Helper Functions

```sql
-- Migration: create_plug_helper_functions.sql

-- Function to get recent plug activity for a pod
CREATE OR REPLACE FUNCTION get_pod_plug_activity(
    p_pod_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    action VARCHAR(50),
    triggered_by VARCHAR(100),
    success BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        action,
        triggered_by,
        success,
        created_at,
        metadata
    FROM plug_control_logs
    WHERE pod_id = p_pod_id
    ORDER BY created_at DESC
    LIMIT p_limit;
$$;

-- Function to get pods with Tuya enabled
CREATE OR REPLACE FUNCTION get_tuya_enabled_pods(
    p_shop_id UUID
)
RETURNS TABLE (
    pod_id UUID,
    pod_name TEXT,
    device_id TEXT,
    ip_address INET,
    current_state BOOLEAN,
    last_seen TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        id AS pod_id,
        name AS pod_name,
        tuya_device_id AS device_id,
        tuya_ip_address AS ip_address,
        tuya_current_state AS current_state,
        tuya_last_seen
    FROM pods
    WHERE shop_id = p_shop_id
    AND tuya_enabled = TRUE;
$$;

-- Function to bulk update plug states (for maintenance)
CREATE OR REPLACE FUNCTION bulk_update_plug_states(
    p_shop_id UUID,
    p_new_state BOOLEAN
)
RETURNS INTEGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE pods
    SET 
        tuya_current_state = p_new_state,
        tuya_last_seen = NOW()
    WHERE shop_id = p_shop_id
    AND tuya_enabled = TRUE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;
```

---

## Backend Implementation

### Edge Function: control-plug

**File:** `supabase/functions/control-plug/index.ts`

```typescript
// supabase/functions/control-plug/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TuyaDevice } from '../_shared/tuya-protocol.ts'

interface ControlPlugRequest {
  pod_id: string
  action: 'turn_on' | 'turn_off' | 'toggle' | 'status'
  triggered_by?: string
  user_id?: string
}

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    // Parse request
    const { pod_id, action, triggered_by = 'manual', user_id }: ControlPlugRequest = await req.json()

    if (!pod_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pod_id, action' }),
        { status: 400, headers }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch pod details
    const { data: pod, error: podError } = await supabaseClient
      .from('pods')
      .select('*')
      .eq('id', pod_id)
      .single()

    if (podError || !pod) {
      return new Response(
        JSON.stringify({ error: 'Pod not found' }),
        { status: 404, headers }
      )
    }

    // Check if Tuya is enabled for this pod
    if (!pod.tuya_enabled) {
      return new Response(
        JSON.stringify({ error: 'Tuya not enabled for this pod' }),
        { status: 400, headers }
      )
    }

    // Validate required fields
    if (!pod.tuya_device_id || !pod.tuya_local_key || !pod.tuya_ip_address) {
      return new Response(
        JSON.stringify({ error: 'Incomplete Tuya configuration' }),
        { status: 400, headers }
      )
    }

    // Initialize Tuya device
    const device = new TuyaDevice({
      ip: pod.tuya_ip_address,
      deviceId: pod.tuya_device_id,
      localKey: pod.tuya_local_key,
    })

    const startTime = Date.now()
    let result: { success: boolean; state?: boolean; error?: string }

    // Execute action
    switch (action) {
      case 'turn_on':
        result = await device.turnOn()
        break
      case 'turn_off':
        result = await device.turnOff()
        break
      case 'toggle':
        result = await device.toggle()
        break
      case 'status':
        result = await device.getStatus()
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers }
        )
    }

    const responseTime = Date.now() - startTime

    // Log the action
    await supabaseClient.from('plug_control_logs').insert({
      pod_id,
      action,
      triggered_by,
      user_id: user_id || null,
      success: result.success,
      error_message: result.error || null,
      device_state_before: pod.tuya_current_state,
      device_state_after: result.state ?? pod.tuya_current_state,
      response_time_ms: responseTime,
      ip_address: pod.tuya_ip_address,
    })

    // Update pod state if successful
    if (result.success && result.state !== undefined) {
      await supabaseClient
        .from('pods')
        .update({
          tuya_current_state: result.state,
          tuya_last_seen: new Date().toISOString(),
        })
        .eq('id', pod_id)
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        state: result.state,
        response_time_ms: responseTime,
        error: result.error,
      }),
      { status: result.success ? 200 : 500, headers }
    )

  } catch (error) {
    console.error('Control plug error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers }
    )
  }
})
```

### Edge Function: session-plug-automation

**File:** `supabase/functions/session-plug-automation/index.ts`

```typescript
// supabase/functions/session-plug-automation/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: {
    id: string
    pod_id: string
    status: string
    ended_at?: string
  }
  old_record?: {
    id: string
    status: string
  }
}

serve(async (req) => {
  const headers = {
    'Content-Type': 'application/json',
  }

  try {
    const payload: WebhookPayload = await req.json()
    
    // Only process sessions table changes
    if (payload.table !== 'sessions') {
      return new Response(JSON.stringify({ message: 'Ignored' }), { headers })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const session = payload.record
    const oldSession = payload.old_record

    // Determine what action to take
    let action: 'turn_on' | 'turn_off' | null = null
    let triggeredBy = ''

    if (payload.type === 'INSERT' && session.status === 'active') {
      // New session started
      action = 'turn_on'
      triggeredBy = 'session_start'
    } else if (payload.type === 'UPDATE') {
      if (session.status === 'completed' && oldSession?.status === 'active') {
        // Session ended
        action = 'turn_off'
        triggeredBy = 'session_end'
      } else if (session.status === 'expired' && oldSession?.status === 'active') {
        // Timer expired
        action = 'turn_off'
        triggeredBy = 'timer_expire'
      }
    }

    if (!action) {
      return new Response(JSON.stringify({ message: 'No action needed' }), { headers })
    }

    // Call control-plug function
    const controlResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/control-plug`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pod_id: session.pod_id,
          action,
          triggered_by: triggeredBy,
          metadata: { session_id: session.id },
        }),
      }
    )

    const result = await controlResponse.json()

    return new Response(
      JSON.stringify({
        success: result.success,
        action,
        triggered_by: triggeredBy,
        result,
      }),
      { status: 200, headers }
    )

  } catch (error) {
    console.error('Session automation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    )
  }
})
```

### Shared Module: Tuya Protocol Implementation

**File:** `supabase/functions/_shared/tuya-protocol.ts`

```typescript
// supabase/functions/_shared/tuya-protocol.ts

/**
 * Tuya Local Protocol Implementation for Deno
 * 
 * This module implements the Tuya local control protocol v3.3
 * for direct LAN communication with smart plugs.
 */

import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

// Protocol constants
const TUYA_PORT = 6668
const TUYA_UDP_PORT = 6666
const PROTOCOL_VERSION = '3.3'

// Command types
const CommandType = {
  UDP: 0,
  AP_CONFIG: 1,
  ACTIVE: 2,
  SESS_KEY_NEG_START: 3,
  SESS_KEY_NEG_RESP: 4,
  SESS_KEY_NEG_FINISH: 5,
  UNBIND: 6,
  CONTROL: 7,
  STATUS: 8,
  HEART_BEAT: 9,
  DP_QUERY: 10,
  QUERY_WIFI: 11,
  TOKEN_BIND: 12,
  CONTROL_NEW: 13,
  ENABLE_WIFI: 14,
  DP_QUERY_NEW: 16,
  SCENE_EXECUTE: 17,
  UPDATEDPS: 18,
  UDP_NEW: 19,
  AP_CONFIG_NEW: 20,
  LAN_GW_ACTIVE: 240,
  LAN_SUB_DEV_REQUEST: 241,
  LAN_DELETE_SUB_DEV: 242,
  LAN_REPORT_SUB_DEV: 243,
  LAN_SCENE: 244,
  LAN_PUBLISH_CLOUD_CONFIG: 245,
  LAN_PUBLISH_APP_CONFIG: 246,
  LAN_EXPORT_APP_CONFIG: 247,
  LAN_PUBLISH_SCENE_PANEL: 248,
  LAN_REMOVE_GW: 249,
  LAN_CHECK_GW_UPDATE: 250,
  LAN_GW_UPDATE: 251,
  LAN_SET_GW_CHANNEL: 252,
} as const

interface TuyaDeviceConfig {
  ip: string
  deviceId: string
  localKey: string
  version?: string
  port?: number
}

interface TuyaResponse {
  success: boolean
  state?: boolean
  error?: string
}

export class TuyaDevice {
  private ip: string
  private deviceId: string
  private localKey: string
  private version: string
  private port: number
  private seqNo: number = 0

  constructor(config: TuyaDeviceConfig) {
    this.ip = config.ip
    this.deviceId = config.deviceId
    this.localKey = config.localKey
    this.version = config.version || PROTOCOL_VERSION
    this.port = config.port || TUYA_PORT
  }

  /**
   * Turn the device on
   */
  async turnOn(): Promise<TuyaResponse> {
    return this.setState(true)
  }

  /**
   * Turn the device off
   */
  async turnOff(): Promise<TuyaResponse> {
    return this.setState(false)
  }

  /**
   * Toggle device state
   */
  async toggle(): Promise<TuyaResponse> {
    const status = await this.getStatus()
    if (!status.success) return status
    return this.setState(!status.state)
  }

  /**
   * Get current device status
   */
  async getStatus(): Promise<TuyaResponse> {
    try {
      const payload = this.buildPayload(CommandType.DP_QUERY, {})
      const response = await this.sendCommand(payload)
      
      if (!response.success) {
        return { success: false, error: response.error }
      }

      // Parse response to extract state
      const state = this.parseStatusResponse(response.data)
      return { success: true, state }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Set device state (on/off)
   */
  private async setState(turnOn: boolean): Promise<TuyaResponse> {
    try {
      // DPS 1 is typically the main switch on Tuya plugs
      const dps = { '1': turnOn }
      const payload = this.buildPayload(CommandType.CONTROL, dps)
      
      const response = await this.sendCommand(payload)
      
      if (!response.success) {
        return { success: false, error: response.error }
      }

      return { success: true, state: turnOn }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Build encrypted payload for Tuya protocol
   */
  private buildPayload(command: number, data: Record<string, unknown>): Uint8Array {
    // Increment sequence number
    this.seqNo = (this.seqNo + 1) % 0xFFFFFFFF

    // Convert data to JSON string
    const jsonData = JSON.stringify(data)
    
    // Encrypt data using local key
    const encrypted = this.encrypt(jsonData)
    
    // Build packet
    const header = new Uint8Array([
      0x00, 0x00, 0x55, 0xAA,  // Magic bytes
      0x00, 0x00,              // Version
      ...this.intToBytes(command, 4),  // Command type
      ...this.intToBytes(this.seqNo, 4), // Sequence number
      ...this.intToBytes(encrypted.length + 8, 4), // Length
    ])

    // Calculate CRC32
    const crc = this.crc32(new Uint8Array([...header.slice(4), ...encrypted]))
    const crcBytes = this.intToBytes(crc, 4)

    // Combine all parts
    return new Uint8Array([
      ...header,
      ...encrypted,
      ...crcBytes,
      0x00, 0x00, 0xAA, 0x55,  // End magic
    ])
  }

  /**
   * Send command to device via TCP
   */
  private async sendCommand(payload: Uint8Array): Promise<{ success: boolean; data?: Uint8Array; error?: string }> {
    try {
      const conn = await Deno.connect({
        hostname: this.ip,
        port: this.port,
      })

      // Set timeout
      conn.setKeepAlive(true)

      // Send payload
      await conn.write(payload)

      // Read response with timeout
      const buffer = new Uint8Array(1024)
      conn.setReadTimeout(5000) // 5 second timeout
      
      const bytesRead = await conn.read(buffer)
      conn.close()

      if (bytesRead === null) {
        return { success: false, error: 'No response from device' }
      }

      const response = buffer.slice(0, bytesRead)
      
      // Parse and validate response
      if (!this.validateResponse(response)) {
        return { success: false, error: 'Invalid response from device' }
      }

      return { success: true, data: response }
    } catch (error) {
      if (error instanceof Deno.errors.TimedOut) {
        return { success: false, error: 'Connection timeout' }
      }
      return { success: false, error: error.message }
    }
  }

  /**
   * Encrypt data using AES-ECB
   */
  private encrypt(data: string): Uint8Array {
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)
    const keyBytes = encoder.encode(this.localKey)

    // Pad data to 16-byte boundary (PKCS7)
    const blockSize = 16
    const padding = blockSize - (dataBytes.length % blockSize)
    const paddedData = new Uint8Array(dataBytes.length + padding)
    paddedData.set(dataBytes)
    paddedData.fill(padding, dataBytes.length)

    // Encrypt using Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-ECB' },
      false,
      ['encrypt']
    )

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-ECB' },
      cryptoKey,
      paddedData
    )

    return new Uint8Array(encrypted)
  }

  /**
   * Decrypt response data
   */
  private decrypt(data: Uint8Array): string {
    // Implementation similar to encrypt but with decrypt operation
    // Omitted for brevity - full implementation needed
    const decoder = new TextDecoder()
    return decoder.decode(data)
  }

  /**
   * Parse status response to extract on/off state
   */
  private parseStatusResponse(data: Uint8Array): boolean {
    try {
      const decrypted = this.decrypt(data)
      const response = JSON.parse(decrypted)
      // DPS 1 typically controls the main switch
      return response.dps?.['1'] === true
    } catch {
      return false
    }
  }

  /**
   * Validate response packet structure
   */
  private validateResponse(data: Uint8Array): boolean {
    // Check magic bytes
    if (data.length < 8) return false
    if (data[0] !== 0x00 || data[1] !== 0x00 || data[2] !== 0x55 || data[3] !== 0xAA) {
      return false
    }
    // Check end magic
    const len = data.length
    if (data[len - 4] !== 0x00 || data[len - 3] !== 0x00 || 
        data[len - 2] !== 0xAA || data[len - 1] !== 0x55) {
      return false
    }
    return true
  }

  /**
   * Convert integer to byte array
   */
  private intToBytes(value: number, length: number): number[] {
    const bytes: number[] = []
    for (let i = length - 1; i >= 0; i--) {
      bytes.push((value >> (i * 8)) & 0xFF)
    }
    return bytes
  }

  /**
   * Calculate CRC32 checksum
   */
  private crc32(data: Uint8Array): number {
    const table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      }
      table[i] = c
    }

    let crc = 0xFFFFFFFF
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
    }
    return (crc ^ 0xFFFFFFFF) >>> 0
  }
}

// Export for use in other modules
export { CommandType, TUYA_PORT, TUYA_UDP_PORT, PROTOCOL_VERSION }
export type { TuyaDeviceConfig, TuyaResponse }
```

### Environment Variables

Add to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Tuya Configuration (if needed for cloud fallback)
TUYA_CLIENT_ID=your-tuya-client-id
TUYA_CLIENT_SECRET=your-tuya-client-secret

# Network Configuration
PLUG_CONTROL_TIMEOUT_MS=5000
PLUG_MAX_RETRIES=3
```

---

## Frontend Implementation

### Component: SmartPlugConfigModal

**File:** `src/components/SmartPlugConfigModal.tsx`

```typescript
// src/components/SmartPlugConfigModal.tsx

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

interface SmartPlugConfigModalProps {
  open: boolean
  onClose: () => void
  podId: string
  podName: string
  existingConfig?: {
    tuya_enabled: boolean
    tuya_device_id?: string
    tuya_local_key?: string
    tuya_ip_address?: string
  }
  onSave: () => void
}

export const SmartPlugConfigModal: React.FC<SmartPlugConfigModalProps> = ({
  open,
  onClose,
  podId,
  podName,
  existingConfig,
  onSave,
}) => {
  const supabase = useSupabaseClient()
  
  const [enabled, setEnabled] = useState(existingConfig?.tuya_enabled ?? false)
  const [deviceId, setDeviceId] = useState(existingConfig?.tuya_device_id ?? '')
  const [localKey, setLocalKey] = useState(existingConfig?.tuya_local_key ?? '')
  const [ipAddress, setIpAddress] = useState(existingConfig?.tuya_ip_address ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (existingConfig) {
      setEnabled(existingConfig.tuya_enabled)
      setDeviceId(existingConfig.tuya_device_id ?? '')
      setLocalKey(existingConfig.tuya_local_key ?? '')
      setIpAddress(existingConfig.tuya_ip_address ?? '')
    }
  }, [existingConfig, open])

  const handleTestConnection = async () => {
    setTestStatus('testing')
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke('control-plug', {
        body: {
          pod_id: podId,
          action: 'status',
        },
      })

      if (error) throw error

      if (data.success) {
        setTestStatus('success')
      } else {
        setTestStatus('error')
        setError(data.error || 'Connection failed')
      }
    } catch (err) {
      setTestStatus('error')
      setError(err.message)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      // Validate IP address format
      if (enabled && ipAddress) {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
        if (!ipRegex.test(ipAddress)) {
          throw new Error('Invalid IP address format')
        }
      }

      const { error } = await supabase
        .from('pods')
        .update({
          tuya_enabled: enabled,
          tuya_device_id: enabled ? deviceId : null,
          tuya_local_key: enabled ? localKey : null,
          tuya_ip_address: enabled ? ipAddress : null,
        })
        .eq('id', podId)

      if (error) throw error

      onSave()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Configure Smart Plug - {podName}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
          }
          label="Enable Smart Plug Control"
          sx={{ mb: 2, display: 'block' }}
        />

        {enabled && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Device ID"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="bf1234567890abcdef1234"
              fullWidth
              required
              helperText="Found in Tuya IoT Platform"
            />

            <TextField
              label="Local Key"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              type="password"
              placeholder="Your local encryption key"
              fullWidth
              required
              helperText="Keep this secure - never share"
            />

            <TextField
              label="IP Address"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.1.45"
              fullWidth
              required
              helperText="Local network IP of the smart plug"
            />

            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing' || !deviceId || !localKey || !ipAddress}
                startIcon={testStatus === 'testing' && <CircularProgress size={16} />}
              >
                {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
              </Button>

              {testStatus === 'success' && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  Connection successful!
                </Alert>
              )}

              {testStatus === 'error' && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  Connection failed. Check credentials and network.
                </Alert>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
              Need help finding these values? Check the setup guide in documentation.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading || (enabled && (!deviceId || !localKey || !ipAddress))}
        >
          {loading ? <CircularProgress size={20} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SmartPlugConfigModal
```

### Component: SmartPlugToggle

**File:** `src/components/SmartPlugToggle.tsx`

```typescript
// src/components/SmartPlugToggle.tsx

import React, { useState, useCallback } from 'react'
import {
  IconButton,
  Tooltip,
  CircularProgress,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material'
import {
  Power as PowerIcon,
  PowerOff as PowerOffIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

interface SmartPlugToggleProps {
  podId: string
  enabled: boolean
  currentState?: boolean
  lastSeen?: string
  onConfigClick?: () => void
  variant?: 'icon' | 'switch' | 'chip'
  size?: 'small' | 'medium' | 'large'
  showStatus?: boolean
}

export const SmartPlugToggle: React.FC<SmartPlugToggleProps> = ({
  podId,
  enabled,
  currentState,
  lastSeen,
  onConfigClick,
  variant = 'icon',
  size = 'medium',
  showStatus = true,
}) => {
  const supabase = useSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [localState, setLocalState] = useState(currentState ?? false)

  // Update local state when prop changes
  React.useEffect(() => {
    setLocalState(currentState ?? false)
  }, [currentState])

  const handleToggle = useCallback(async () => {
    if (!enabled || loading) return

    setLoading(true)
    const newState = !localState

    try {
      const { data, error } = await supabase.functions.invoke('control-plug', {
        body: {
          pod_id: podId,
          action: 'toggle',
        },
      })

      if (error) throw error

      if (data.success) {
        setLocalState(data.state ?? newState)
      } else {
        console.error('Failed to toggle plug:', data.error)
        // Revert local state on failure
        setLocalState(!newState)
      }
    } catch (err) {
      console.error('Error toggling plug:', err)
      // Revert local state on error
      setLocalState(!newState)
    } finally {
      setLoading(false)
    }
  }, [enabled, loading, localState, podId, supabase])

  const isOnline = lastSeen 
    ? (new Date().getTime() - new Date(lastSeen).getTime()) < 5 * 60 * 1000 
    : false

  const getStatusColor = () => {
    if (!enabled) return 'default'
    if (!isOnline) return 'error'
    return localState ? 'success' : 'default'
  }

  const getStatusText = () => {
    if (!enabled) return 'Not Configured'
    if (!isOnline) return 'Offline'
    return localState ? 'On' : 'Off'
  }

  // Icon variant
  if (variant === 'icon') {
    return (
      <Tooltip title={`Smart Plug: ${getStatusText()}`}>
        <span>
          <IconButton
            onClick={handleToggle}
            disabled={!enabled || loading}
            size={size}
            color={localState ? 'success' : 'default'}
          >
            {loading ? (
              <CircularProgress size={size === 'small' ? 16 : 24} />
            ) : localState ? (
              <PowerIcon />
            ) : (
              <PowerOffIcon />
            )}
          </IconButton>
          {onConfigClick && (
            <IconButton onClick={onConfigClick} size={size}>
              <SettingsIcon fontSize={size} />
            </IconButton>
          )}
        </span>
      </Tooltip>
    )
  }

  // Switch variant
  if (variant === 'switch') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={localState}
            onChange={handleToggle}
            disabled={!enabled || loading}
          />
        }
        label={showStatus ? getStatusText() : ''}
      />
    )
  }

  // Chip variant
  return (
    <Chip
      icon={localState ? <PowerIcon /> : <PowerOffIcon />}
      label={getStatusText()}
      color={getStatusColor() as any}
      onClick={enabled ? handleToggle : onConfigClick}
      disabled={!enabled || loading}
    />
  )
}

export default SmartPlugToggle
```

### Integration with PodGrid Component

**File:** `src/components/PodGrid.tsx` (updated sections)

```typescript
// Add to imports
import { SmartPlugToggle } from './SmartPlugToggle'
import { SmartPlugConfigModal } from './SmartPlugConfigModal'

// Inside PodGrid component
const PodGrid: React.FC = () => {
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null)

  const handleConfigClick = (pod: Pod) => {
    setSelectedPod(pod)
    setConfigModalOpen(true)
  }

  // In the pod card rendering
  return (
    <Grid container spacing={2}>
      {pods.map((pod) => (
        <Grid item xs={12} sm={6} md={4} key={pod.id}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{pod.name}</Typography>
                
                {/* Smart Plug Toggle */}
                <SmartPlugToggle
                  podId={pod.id}
                  enabled={pod.tuya_enabled}
                  currentState={pod.tuya_current_state}
                  lastSeen={pod.tuya_last_seen}
                  onConfigClick={() => handleConfigClick(pod)}
                  variant="icon"
                  size="small"
                />
              </Box>

              {/* Rest of pod card content */}
              {/* ... */}
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Configuration Modal */}
      {selectedPod && (
        <SmartPlugConfigModal
          open={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          podId={selectedPod.id}
          podName={selectedPod.name}
          existingConfig={{
            tuya_enabled: selectedPod.tuya_enabled,
            tuya_device_id: selectedPod.tuya_device_id,
            tuya_local_key: selectedPod.tuya_local_key,
            tuya_ip_address: selectedPod.tuya_ip_address,
          }}
          onSave={() => {
            // Refresh pods data
            fetchPods()
          }}
        />
      )}
    </Grid>
  )
}
```

### Integration with SessionTimer

**File:** `src/components/SessionTimer.tsx` (updated sections)

```typescript
// Add visual indicator for smart plug status
import { SmartPlugToggle } from './SmartPlugToggle'

// In SessionTimer component
const SessionTimer: React.FC<SessionTimerProps> = ({ session, pod }) => {
  return (
    <Box>
      {/* Session timer display */}
      
      {/* Smart Plug Control */}
      {pod.tuya_enabled && (
        <Box mt={2} display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" color="text.secondary">
            Power Control:
          </Typography>
          <SmartPlugToggle
            podId={pod.id}
            enabled={pod.tuya_enabled}
            currentState={pod.tuya_current_state}
            lastSeen={pod.tuya_last_seen}
            variant="chip"
            size="small"
          />
        </Box>
      )}

      {/* Warning if plug not responding */}
      {pod.tuya_enabled && !pod.tuya_current_state && session.status === 'active' && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Warning: Smart plug appears to be OFF while session is active
        </Alert>
      )}
    </Box>
  )
}
```

---

## Session Lifecycle Integration

### Automatic Plug Control Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SESSION LIFECYCLE                        │
└─────────────────────────────────────────────────────────────┘

[SESSION START]
     │
     ▼
┌─────────────────┐
│ User starts     │
│ session via UI  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ INSERT into     │
│ sessions table  │
│ status: active  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Supabase        │────▶│ session-plug-    │
│ Webhook Trigger │     │ automation Edge  │
└─────────────────┘     │ Function         │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Lookup pod Tuya  │
                        │ configuration    │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Send 'turn_on'   │
                        │ command to plug  │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ PC/Monitor       │
                        │ receives power   │
                        └──────────────────┘

[SESSION RUNNING]
     │
     ├── Timer counts down
     ├── Manual toggle available
     └── Status monitoring

[SESSION END]
     │
     ├── User ends session OR
     ├── Timer expires
     │
     ▼
┌─────────────────┐
│ UPDATE sessions │
│ status: ended/  │
│ expired         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Supabase        │────▶│ session-plug-    │
│ Webhook Trigger │     │ automation Edge  │
└─────────────────┘     │ Function         │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Send 'turn_off'  │
                        │ command to plug  │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ PC/Monitor       │
                        │ powers down      │
                        └──────────────────┘
```

### Webhook Configuration

Set up Supabase database webhooks:

```sql
-- Enable webhooks (if not already enabled)
-- This is done through Supabase Dashboard: Database > Webhooks

-- Webhook 1: Session Start
-- Trigger: INSERT on sessions table
-- Filter: status = 'active'
-- URL: https://your-project.supabase.co/functions/v1/session-plug-automation

-- Webhook 2: Session End
-- Trigger: UPDATE on sessions table
-- Filter: status changed from 'active' to 'completed' or 'expired'
-- URL: https://your-project.supabase.co/functions/v1/session-plug-automation
```

### Manual Override Options

```typescript
// Manual control is always available through:

// 1. Pod Grid - Quick toggle
<SmartPlugToggle podId={pod.id} variant="icon" />

// 2. Session View - During active session
<SmartPlugToggle podId={pod.id} variant="switch" />

// 3. Admin Dashboard - Bulk control
const handleBulkControl = async (shopId: string, turnOn: boolean) => {
  const { data: pods } = await supabase
    .from('pods')
    .select('id')
    .eq('shop_id', shopId)
    .eq('tuya_enabled', true)
  
  for (const pod of pods) {
    await supabase.functions.invoke('control-plug', {
      body: {
        pod_id: pod.id,
        action: turnOn ? 'turn_on' : 'turn_off',
        triggered_by: 'bulk_admin',
      },
    })
  }
}
```

---

## Testing Guide

### Unit Testing Individual Plugs

```typescript
// Test script: test-plug.ts

import { TuyaDevice } from '../supabase/functions/_shared/tuya-protocol.ts'

async function testPlug(config: {
  ip: string
  deviceId: string
  localKey: string
}) {
  console.log(`Testing plug at ${config.ip}...`)
  
  const device = new TuyaDevice(config)
  
  // Test 1: Get status
  console.log('1. Getting status...')
  const status = await device.getStatus()
  console.log('   Status:', status)
  
  // Test 2: Turn on
  console.log('2. Turning on...')
  const onResult = await device.turnOn()
  console.log('   Result:', onResult)
  
  await new Promise(r => setTimeout(r, 2000))
  
  // Test 3: Turn off
  console.log('3. Turning off...')
  const offResult = await device.turnOff()
  console.log('   Result:', offResult)
  
  // Test 4: Toggle
  console.log('4. Toggling...')
  const toggleResult = await device.toggle()
  console.log('   Result:', toggleResult)
}

// Run test
await testPlug({
  ip: '192.168.1.45',
  deviceId: 'bf1234567890abcdef1234',
  localKey: 'fedcba0987654321',
})
```

Run test:
```bash
deno run --allow-net test-plug.ts
```

### Integration Testing with Sessions

```typescript
// Integration test: test-session-automation.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function testSessionAutomation() {
  const podId = 'test-pod-id'
  
  console.log('Testing session automation...')
  
  // 1. Create test session
  console.log('1. Creating test session...')
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      pod_id: podId,
      customer_name: 'Test Customer',
      duration_minutes: 5,
      status: 'active',
    })
    .select()
    .single()
  
  if (error) throw error
  console.log('   Session created:', session.id)
  
  // Wait for webhook
  await new Promise(r => setTimeout(r, 3000))
  
  // 2. Check if plug turned on
  console.log('2. Checking plug state...')
  const { data: pod } = await supabase
    .from('pods')
    .select('tuya_current_state')
    .eq('id', podId)
    .single()
  
  console.log('   Plug state:', pod?.tuya_current_state)
  
  // 3. End session
  console.log('3. Ending session...')
  await supabase
    .from('sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', session.id)
  
  // Wait for webhook
  await new Promise(r => setTimeout(r, 3000))
  
  // 4. Check if plug turned off
  console.log('4. Checking plug state...')
  const { data: podAfter } = await supabase
    .from('pods')
    .select('tuya_current_state')
    .eq('id', podId)
    .single()
  
  console.log('   Plug state:', podAfter?.tuya_current_state)
  
  // 5. Check logs
  console.log('5. Checking control logs...')
  const { data: logs } = await supabase
    .from('plug_control_logs')
    .select('*')
    .eq('pod_id', podId)
    .order('created_at', { ascending: false })
    .limit(5)
  
  console.log('   Recent logs:', logs)
}

await testSessionAutomation()
```

### Troubleshooting Tests

```bash
# 1. Test network connectivity
ping 192.168.1.45

# 2. Test port accessibility
nc -zv 192.168.1.45 6668

# 3. Test UDP discovery
# (Tuya devices broadcast on UDP 6666)

# 4. Test from Supabase Edge Function
# Deploy test function
supabase functions deploy test-plug

# Invoke with test data
curl -X POST https://your-project.supabase.co/functions/v1/test-plug \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"ip": "192.168.1.45", "device_id": "...", "local_key": "..."}'
```

### Common Test Scenarios

| Scenario | Expected Result | Test Command |
|----------|----------------|--------------|
| Device offline | Error: "Connection timeout" | Disconnect plug from power |
| Wrong IP | Error: "Connection refused" | Use incorrect IP |
| Wrong key | Error: "Invalid response" | Use wrong local_key |
| Valid toggle | Success, state changes | Normal operation |
| Rapid toggles | All succeed, no crashes | Toggle 10x quickly |
| Network interruption | Graceful error handling | Disconnect WiFi mid-command |

---

## Security Considerations

### Storing Device Credentials

**❌ Never do:**
```typescript
// DON'T: Hardcode credentials
const deviceKey = 'abc123' // In source code

// DON'T: Store in localStorage
localStorage.setItem('tuya_key', key)

// DON'T: Log credentials
console.log('Device key:', localKey)
```

**✅ Do this:**
```typescript
// DO: Store in Supabase (encrypted at rest)
// pods.tuya_local_key column

// DO: Use Row Level Security
// Only admins can read/write keys

// DO: Access via Edge Functions
// Functions use service role, validate user permissions

// DO: Environment variables for function config
const ENCRYPTION_KEY = Deno.env.get('TUYA_ENCRYPTION_KEY')
```

### Database Encryption (Optional)

```sql
-- Add encryption for sensitive fields
-- Requires pgcrypto extension

-- Encrypt local keys
CREATE OR REPLACE FUNCTION encrypt_tuya_key(plain_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    encrypt(
      plain_text::bytea,
      current_setting('app.encryption_key')::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql;

-- Decrypt local keys
CREATE OR REPLACE FUNCTION decrypt_tuya_key(encrypted_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN convert_from(
    decrypt(
      decode(encrypted_text, 'base64'),
      current_setting('app.encryption_key')::bytea,
      'aes'
    ),
    'UTF8'
  );
END;
$$ LANGUAGE plpgsql;
```

### Local Network Security

1. **Isolate IoT Network**
   ```
   Router Configuration:
   - Create separate VLAN for smart plugs
   - Enable AP isolation between plugs
   - Block internet access for plugs (local control only)
   ```

2. **Firewall Rules**
   ```bash
   # Allow only necessary traffic
   iptables -A INPUT -p udp --dport 6666 -j ACCEPT
   iptables -A INPUT -p tcp --dport 6668 -j ACCEPT
   iptables -A INPUT -s 192.168.1.0/24 -j DROP  # Block other local traffic
   ```

3. **Regular Credential Rotation**
   - Change local keys monthly
   - Use different keys per device
   - Monitor for unauthorized access

### Access Control

```typescript
// Middleware to check permissions
async function requirePlugPermission(req: Request, podId: string) {
  const user = await getUserFromRequest(req)
  
  const { data: hasAccess } = await supabase
    .from('user_shops')
    .select('role')
    .eq('user_id', user.id)
    .eq('shop_id', (
      select shop_id from pods where id = podId
    ))
    .single()
  
  if (!hasAccess || !['admin', 'manager', 'staff'].includes(hasAccess.role)) {
    throw new Error('Unauthorized')
  }
}
```

---

## Cost Breakdown

### 5 Pods Setup

| Item | Quantity | Unit Price | Total |
|------|----------|------------|-------|
| Tuya Smart Plugs (Gosund EP2) | 5 | $10 | $50 |
| WiFi Router (2.4GHz) | 1 | $40 | $40 |
| Network cables | 5 | $2 | $10 |
| **Total** | | | **$100** |
| **Per Pod** | | | **$20** |

### 10 Pods Setup

| Item | Quantity | Unit Price | Total |
|------|----------|------------|-------|
| Tuya Smart Plugs (Gosund EP2) | 10 | $9 (bulk) | $90 |
| WiFi Router + Extender | 1 | $60 | $60 |
| Network cables | 10 | $2 | $20 |
| **Total** | | | **$170** |
| **Per Pod** | | | **$17** |

### 20 Pods Setup

| Item | Quantity | Unit Price | Total |
|------|----------|------------|-------|
| Tuya Smart Plugs (Gosund EP2) | 20 | $8 (bulk) | $160 |
| Enterprise WiFi AP | 2 | $80 | $160 |
| Network switch | 1 | $50 | $50 |
| Network cables | 20 | $2 | $40 |
| UPS (backup power) | 1 | $100 | $100 |
| **Total** | | | **$510** |
| **Per Pod** | | | **$25.50** |

### Ongoing Costs

| Cost Type | Monthly | Annual |
|-----------|---------|--------|
| Electricity (standby) | ~$2 | ~$24 |
| Internet (dedicated IoT) | $0* | $0* |
| Maintenance/replacement | ~$5 | ~$60 |
| **Total** | **~$7** | **~$84** |

*Uses existing internet connection

### ROI Calculation

**Assumptions:**
- Average session: 3 hours
- PCs left on accidentally: 2x per week per pod
- Power cost: $0.15/kWh
- Gaming PC power: 300W

**Savings per pod per month:**
- Accidental on time: 2 × 3 hours × 4 weeks = 24 hours
- Power wasted: 24h × 0.3kW = 7.2 kWh
- Cost savings: 7.2 × $0.15 = **$1.08/month**

**Payback period:**
- 5 pods: $100 ÷ $5.40 = 18.5 months
- 10 pods: $170 ÷ $10.80 = 15.7 months
- 20 pods: $510 ÷ $21.60 = 23.6 months

*Plus additional benefits: professional appearance, remote management, automated workflows*

---

## Alternative Options

### Comparison Matrix

| Feature | Tuya | TP-Link Kasa | Shelly | Zigbee (ConBee) |
|---------|------|--------------|---------|-----------------|
| **Price** | $8-15 | $15-25 | $12-18 | $15-20 + hub |
| **Local Control** | ✅ Yes | ⚠️ Limited | ✅ Yes | ✅ Yes |
| **Cloud Required** | ❌ No | ⚠️ Optional | ❌ No | ❌ No |
| **Deno Support** | ✅ Yes | ❌ No | ✅ Yes | ⚠️ Complex |
| **Power Monitoring** | ⚠️ Some models | ✅ Yes | ✅ Yes | ⚠️ Varies |
| **Setup Complexity** | Medium | Easy | Medium | High |
| **Reliability** | Good | Excellent | Excellent | Good |
| **API Quality** | Good | Good | Excellent | Good |

### TP-Link Kasa

**Pros:**
- Excellent reliability
- Good mobile app
- Well-documented API
- Power monitoring on most models

**Cons:**
- Requires cloud for initial setup
- Local API unofficial/limited
- More expensive
- Harder to integrate with Deno

**Best for:** Users prioritizing reliability over cost

### Shelly

**Pros:**
- Open source firmware
- Excellent local API
- Power monitoring
- Very reliable
- Good community support

**Cons:**
- Slightly more expensive
- Requires firmware familiarity
- Smaller ecosystem

**Best for:** Technical users wanting maximum control

### Zigbee (with ConBee/Raspberry Pi)

**Pros:**
- Mesh networking (very reliable)
- Low power consumption
- Works without WiFi
- Many brand options

**Cons:**
- Requires hub (ConBee/deCONZ)
- Higher initial cost
- More complex setup
- Steeper learning curve

**Best for:** Large installations (30+ pods) or existing Zigbee setup

### Recommendation by Use Case

| Use Case | Recommended | Reason |
|----------|-------------|--------|
| 5-10 pods, budget-conscious | **Tuya** | Best value, good enough |
| 10-20 pods, reliability critical | **Shelly** | Better reliability, still affordable |
| 20+ pods, existing infrastructure | **Zigbee** | Scales best, mesh networking |
| Non-technical staff | **TP-Link** | Easiest setup and management |
| Maximum customization | **Shelly** | Open firmware, full control |

---

## Troubleshooting

### Device Not Responding

**Symptoms:**
- Timeout errors
- No state change
- Connection refused

**Solutions:**

1. **Check Power**
   ```bash
   # Verify plug has power
   # Look for LED indicator on plug
   ```

2. **Check Network**
   ```bash
   ping <device-ip>
   # Should respond with < 5ms latency
   ```

3. **Verify IP Address**
   ```bash
   # Check router admin panel
   # Look for device with matching MAC address
   # Ensure IP hasn't changed (use DHCP reservation)
   ```

4. **Test with Tuya App**
   - Open Tuya Smart app
   - Try controlling device
   - If app works: credentials issue
   - If app fails: network/device issue

5. **Reboot Device**
   - Unplug for 10 seconds
   - Plug back in
   - Wait 30 seconds for boot
   - Retry

### Connection Timeouts

**Symptoms:**
- "Connection timeout" errors
- Intermittent failures
- Slow response

**Solutions:**

1. **Check WiFi Signal**
   ```bash
   # Use WiFi analyzer app
   # Ensure -70dBm or better at plug location
   ```

2. **Reduce Interference**
   - Move router closer
   - Use WiFi extender
   - Switch to less congested channel

3. **Network Congestion**
   ```bash
   # Check if many devices on same AP
   # Limit to 20-30 devices per access point
   ```

4. **Increase Timeout**
   ```typescript
   // In TuyaDevice class
   conn.setReadTimeout(10000) // Increase to 10s
   ```

### Credential Extraction Problems

**Symptoms:**
- Can't find local key
- Device not showing in IoT platform
- Invalid key errors

**Solutions:**

1. **Ensure Proper Linking**
   ```
   Tuya IoT Platform:
   - Must link Tuya Smart app account
   - Use correct data center region
   - Device must be online during linking
   ```

2. **Alternative Extraction Tools**
   ```bash
   # Option 1: tuya-cli
   npm install -g @tuya/cli
   tuya-cli wizard
   
   # Option 2: tinytuya (Python)
   pip install tinytuya
   python -m tinytuya scan
   
   # Option 3: tuya-local (Home Assistant)
   # Use their discovery tools
   ```

3. **Factory Reset and Retry**
   ```
   1. Hold button for 10 seconds (slow blink)
   2. Re-add to Tuya Smart app
   3. Re-link to IoT platform
   4. Extract credentials again
   ```

### Network Issues

**Symptoms:**
- Devices work intermittently
- Multiple devices failing
- Slow network performance

**Solutions:**

1. **Separate IoT Network**
   ```
   Router Setup:
   - Create guest network for plugs
   - 2.4GHz only
   - Isolate from main network
   ```

2. **Static IP Assignment**
   ```
   DHCP Reservation:
   - Map MAC address to fixed IP
   - Document in spreadsheet
   - Update pod configuration
   ```

3. **Quality of Service (QoS)**
   ```
   Router QoS Settings:
   - Prioritize management traffic
   - Limit bandwidth per device if needed
   ```

4. **Regular Health Checks**
   ```typescript
   // Automated health check
   async function healthCheck() {
     const { data: pods } = await supabase
       .from('pods')
       .select('*')
       .eq('tuya_enabled', true)
     
     for (const pod of pods) {
       const result = await testConnection(pod)
       if (!result.success) {
         await sendAlert(`Pod ${pod.name} offline`)
       }
     }
   }
   
   // Run every 5 minutes
   setInterval(healthCheck, 5 * 60 * 1000)
   ```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Connection timeout" | Network issue, device offline | Check WiFi, reboot device |
| "Invalid response" | Wrong local key | Re-extract credentials |
| "Connection refused" | Wrong IP, port blocked | Verify IP, check firewall |
| "Device not found" | Pod not configured | Enable Tuya in pod settings |
| "Unauthorized" | RLS policy | Check user permissions |
| "Encryption failed" | Key format issue | Verify key is hex string |

### Debug Mode

Enable detailed logging:

```typescript
// Add to Edge Function
const DEBUG = Deno.env.get('DEBUG') === 'true'

if (DEBUG) {
  console.log('Request:', req)
  console.log('Payload:', payload)
  console.log('Device config:', { ip, deviceId: deviceId.slice(0, 4) + '...' })
}
```

### Getting Help

1. **Check Logs**
   ```bash
   # Supabase Edge Function logs
   supabase functions logs control-plug
   
   # Database logs
   # Check plug_control_logs table
   ```

2. **Community Resources**
   - Tuya Developer Forum: https://developer.tuya.com/
   - tinytuya Discord: https://discord.gg/R8wskQh
   - GitHub Issues: Search similar problems

3. **Vendor Support**
   - Contact plug manufacturer
   - Tuya IoT Platform support
   - Router manufacturer for network issues

---

## Next Steps

### Immediate Actions (Week 1)

- [ ] **Purchase hardware**
  - Order 1-2 test plugs first
  - Verify compatibility with your network
  - Test before bulk purchase

- [ ] **Set up test environment**
  - Configure one plug completely
  - Run through all test scenarios
  - Document any issues

- [ ] **Database migration**
  - Run SQL migrations in Supabase
  - Verify tables created correctly
  - Test RLS policies

### Short-term (Week 2-3)

- [ ] **Deploy Edge Functions**
  - Deploy control-plug function
  - Deploy session-plug-automation function
  - Test with curl/Postman

- [ ] **Build frontend components**
  - Create SmartPlugConfigModal
  - Create SmartPlugToggle
  - Integrate with PodGrid

- [ ] **Configure webhooks**
  - Set up session start webhook
  - Set up session end webhook
  - Test automation flow

### Medium-term (Month 1)

- [ ] **Roll out to production**
  - Install plugs in all pods
  - Configure each device
  - Train staff on usage

- [ ] **Monitoring setup**
  - Set up health checks
  - Configure alerts
  - Create dashboard

- [ ] **Documentation**
  - Create staff training guide
  - Document troubleshooting steps
  - Update runbooks

### Long-term (Ongoing)

- [ ] **Optimization**
  - Monitor response times
  - Optimize network configuration
  - Consider upgrades if needed

- [ ] **Expansion**
  - Evaluate additional features (power monitoring)
  - Consider other Tuya devices (lights, AC)
  - Scale to new locations

- [ ] **Maintenance**
  - Monthly credential rotation
  - Firmware updates
  - Regular testing

### Quick Start Checklist

```
□ Day 1: Order 2 test plugs
□ Day 3: Receive plugs, set up first one
□ Day 4: Run database migrations
□ Day 5: Deploy Edge Functions
□ Day 6: Build frontend, test integration
□ Day 7: Full end-to-end test with sessions
□ Week 2: Order remaining plugs
□ Week 3: Install and configure all plugs
□ Week 4: Staff training, go live
```

### Success Metrics

Track these metrics after deployment:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Plug response time | < 2 seconds | Average from logs |
| Automation success rate | > 95% | Successful / Total attempts |
| Manual override usage | < 10% | Manual / Total actions |
| Downtime | < 1% | Failed connections / Total |
| Staff satisfaction | > 4/5 | Survey after 1 month |
| Cost savings | > $50/month | Electricity bill comparison |

---

## Appendix

### A. Tuya Protocol Reference

**Command Types:**
- `0x07` - Control (turn on/off)
- `0x08` - Status query
- `0x0A` - DP query
- `0x09` - Heartbeat

**DPS (Data Points):**
- `1` - Main switch (boolean)
- `9` - Countdown timer (integer)
- `17` - Add electricity (integer)
- `18` - Current (integer)
- `19` - Power (integer)
- `20` - Voltage (integer)

### B. Useful Commands

```bash
# Scan network for Tuya devices
nmap -p 6668 192.168.1.0/24

# Monitor network traffic
tcpdump -i any port 6668 -w tuya.pcap

# Test UDP broadcast
echo -n 'discovery' | nc -u -b 255.255.255.255 6666
```

### C. Related Documentation

- Tuya Developer Platform: https://developer.tuya.com/
- tinytuya Python Library: https://github.com/jasonacox/tinytuya
- Tuya Local Protocol: https://github.com/codetheweb/tuya-local
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

---

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Maintainer:** Game Shop Management Team  
**Questions?** Check the troubleshooting section or contact support.
