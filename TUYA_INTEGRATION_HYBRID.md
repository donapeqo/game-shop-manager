# Tuya Smart Plug Integration - Hybrid Architecture Guide

## Hybrid Vercel + Raspberry Pi Implementation

**Version:** 1.0  
**Last Updated:** February 21, 2026  
**Status:** Production-Ready Implementation Plan

---

## 1. Executive Summary

### 1.1 Overview

This document provides a comprehensive implementation guide for integrating Tuya smart plugs into a game shop management system using a hybrid architecture that combines Vercel's serverless platform with a local Raspberry Pi gateway.

### 1.2 Why This Architecture

The hybrid approach was chosen to solve several critical challenges:

1. **Tuya Protocol Requirements**: Tuya smart plugs communicate over the local network using a proprietary protocol that requires persistent TCP connections, which cannot be maintained from serverless environments
2. **Real-time Control**: Need sub-second response times for plug control during gaming sessions
3. **Cost Efficiency**: Avoid expensive cloud IoT platforms while maintaining professional reliability
4. **Scalability**: Vercel handles user traffic and frontend; Pi handles device communication
5. **Security**: Local network isolation with secure tunneling for remote access

### 1.3 Key Benefits

| Benefit | Description |
|---------|-------------|
| **Low Latency** | Direct local network communication with devices (<100ms response) |
| **Cost Effective** | One-time hardware cost vs. recurring cloud IoT platform fees |
| **Reliable** | Local processing continues even if internet is intermittent |
| **Scalable** | Easy to add more pods by adding more smart plugs |
| **Secure** | Local network isolation with encrypted tunnels |
| **Maintainable** | Clear separation of concerns between layers |

### 1.4 Trade-offs

| Trade-off | Mitigation |
|-----------|------------|
| Single point of failure (Pi) | UPS backup, monitoring, automatic recovery |
| Requires local hardware | One-time $100-150 cost vs. ongoing cloud fees |
| Network configuration complexity | Detailed setup guide with scripts |
| Physical security concerns | Locked case, network isolation, encrypted storage |

### 1.5 Total Cost Estimate

**Initial Setup (One-time):**
- Raspberry Pi 4 (4GB): $75
- Case + Power Supply: $25
- SD Card (64GB): $15
- Smart Plugs (per pod): $12-18
- **Total for 10 pods: ~$300-360**

**Monthly Ongoing:**
- Electricity (Pi 24/7): ~$2-3
- ngrok Pro (optional): $0-8
- **Total monthly: ~$2-11**

**Comparison:** Commercial IoT platforms charge $5-15/month per device = $600-1800/year for 10 pods

---

## 2. System Architecture Deep Dive

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER DEVICES                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Mobile     │  │   Desktop    │  │   Tablet     │  │   Laptop     │     │
│  │   Browser    │  │   Browser    │  │   Browser    │  │   Browser    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                     │ HTTPS
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL CLOUD PLATFORM                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        NEXT.JS APPLICATION                           │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │    │
│  │  │  React Frontend │  │   API Routes    │  │   WebSocket Client  │  │    │
│  │  │  - Dashboard    │  │  - /api/plugs/* │  │   (Socket.io)       │  │    │
│  │  │  - Controls     │  │  - Auth         │  │   - Real-time       │  │    │
│  │  │  - Status Views │  │  - Webhooks     │  │     updates         │  │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │    │
│  │                                                                      │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │    │
│  │  │   Supabase      │  │   Zustand Store │  │   Session Hooks     │  │    │
│  │  │   Client        │  │   - plugSlice   │  │   - Auto control    │  │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTPS (via Tunnel)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTERNET / TUNNEL LAYER                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ┌──────────────┐         OR          ┌──────────────────────┐      │    │
│  │  │   ngrok      │                     │   Cloudflare Tunnel  │      │    │
│  │  │  - Free tier │                     │   - Free tier        │      │    │
│  │  │  - Random URL│                     │   - Custom domain    │      │    │
│  │  │  - 1 active  │                     │   - Always-on        │      │    │
│  │  └──────────────┘                     └──────────────────────┘      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTPS (Port 443)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RASPBERRY PI (LOCAL GATEWAY)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    NODE.JS SERVICE (PM2 Managed)                     │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                    EXPRESS HTTP SERVER                       │    │    │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │    │
│  │  │  │  Auth        │  │  API Routes  │  │  Validation      │   │    │    │
│  │  │  │  Middleware  │  │  - /control  │  │  Middleware      │   │    │    │
│  │  │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                  WEBSOCKET SERVER (Socket.io)                │    │    │
│  │  │  - Real-time broadcasts    - Connection management          │    │    │
│  │  │  - Event handling          - Room management                │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                  TUYA DEVICE MANAGER                         │    │    │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │    │
│  │  │  │  Connection  │  │  Command     │  │  State           │   │    │    │
│  │  │  │  Pool        │  │  Queue       │  │  Manager         │   │    │    │
│  │  │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                  SESSION AUTOMATION                          │    │    │
│  │  │  - Supabase webhooks    - Auto on/off    - Logging          │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                  SQLITE DATABASE                             │    │    │
│  │  │  - Device credentials    - Session logs    - Control logs   │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Local Network (WiFi/Ethernet)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOCAL NETWORK LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         WIFI ROUTER                                  │    │
│  │  - DHCP with static leases    - Port forwarding (if needed)         │    │
│  │  - Firewall rules             - Guest network isolation             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ 2.4GHz WiFi
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PHYSICAL DEVICES LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Smart Plug  │  │  Smart Plug  │  │  Smart Plug  │  │  Smart Plug  │     │
│  │   Pod #1     │  │   Pod #2     │  │   Pod #3     │  │   Pod #N     │     │
│  │  - Tuya API  │  │  - Tuya API  │  │  - Tuya API  │  │  - Tuya API  │     │
│  │  - Power     │  │  - Power     │  │  - Power     │  │  - Power     │     │
│  │    Monitor   │  │    Monitor   │  │    Monitor   │  │    Monitor   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                 │                 │             │
│         ▼                 ▼                 ▼                 ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Gaming      │  │  Gaming      │  │  Gaming      │  │  Gaming      │     │
│  │  Setup #1    │  │  Setup #2    │  │  Setup #3    │  │  Setup #N    │     │
│  │  (TV/Console)│  │  (TV/Console)│  │  (TV/Console)│  │  (TV/Console)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Diagrams

#### 2.2.1 User Views Shop Status Remotely

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│  User   │────▶│  Vercel  │────▶│  ngrok   │────▶│    Pi    │────▶│  SQLite │
│ Browser │     │  API     │     │  Tunnel  │     │  Service │     │   DB    │
└─────────┘     └──────────┘     └──────────┘     └──────────┘     └─────────┘
     │               │                │                │                │
     │ 1. GET        │                │                │                │
     │    /api/      │                │                │                │
     │    plugs/     │                │                │                │
     │    status     │                │                │                │
     │──────────────▶│                │                │                │
     │               │ 2. Forward     │                │                │
     │               │    HTTPS       │                │                │
     │               │───────────────▶│                │                │
     │               │                │ 3. GET /api/   │                │
     │               │                │    plugs/      │                │
     │               │                │    status      │                │
     │               │                │───────────────▶│                │
     │               │                │                │ 4. Query       │
     │               │                │                │    all device  │
     │               │                │                │    states      │
     │               │                │                │───────────────▶│
     │               │                │                │ 5. Return      │
     │               │                │                │    states      │
     │               │                │                │◀───────────────│
     │               │                │ 6. Return      │                │
     │               │                │    JSON        │                │
     │               │                │◀───────────────│                │
     │               │ 7. Forward     │                │                │
     │               │    response    │                │                │
     │               │◀───────────────│                │                │
     │ 8. Display    │                │                │                │
     │    dashboard  │                │                │                │
     │◀──────────────│                │                │                │
```

#### 2.2.2 User Controls Smart Plug from Anywhere

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│  User   │────▶│  Vercel  │────▶│  ngrok   │────▶│    Pi    │────▶│  Tuya   │
│ Browser │     │  API     │     │  Tunnel  │     │  Service │     │  Plug   │
└─────────┘     └──────────┘     └──────────┘     └──────────┘     └─────────┘
     │               │                │                │                │
     │ 1. POST       │                │                │                │
     │    /api/      │                │                │                │
     │    plugs/1/   │                │                │                │
     │    control    │                │                │                │
     │    {on:true}  │                │                │                │
     │──────────────▶│                │                │                │
     │               │ 2. Validate    │                │                │
     │               │    JWT         │                │                │
     │               │                │                │                │
     │               │ 3. Forward     │                │                │
     │               │    HTTPS       │                │                │
     │               │───────────────▶│                │                │
     │               │                │ 4. POST /api/  │                │
     │               │                │    plugs/1/    │                │
     │               │                │    control     │                │
     │               │                │───────────────▶│                │
     │               │                │                │ 5. Validate    │
     │               │                │                │    API key     │
     │               │                │                │                │
     │               │                │                │ 6. Send Tuya   │
     │               │                │                │    command     │
     │               │                │                │───────────────▶│
     │               │                │                │ 7. Execute     │
     │               │                │                │◀───────────────│
     │               │                │                │ 8. Update      │
     │               │                │                │    state       │
     │               │                │ 9. Broadcast   │                │
     │               │                │    WebSocket   │                │
     │               │ 10. Forward    │◀───────────────│                │
     │               │    response    │                │                │
     │               │◀───────────────│                │                │
     │ 11. Show      │                │                │                │
     │     success   │                │                │                │
     │◀──────────────│                │                │                │
```

#### 2.2.3 Session Starts (Automatic Plug On)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│ Supabase │────▶│  Vercel  │────▶│  ngrok   │────▶│    Pi    │────▶│  Tuya   │
│  DB      │     │ Webhook  │     │  Tunnel  │     │  Service │     │  Plug   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └─────────┘
     │               │                │                │                │
     │ 1. Session    │                │                │                │
     │    started    │                │                │                │
     │    trigger    │                │                │                │
     │──────────────▶│                │                │                │
     │               │ 2. POST        │                │                │
     │               │    /webhook/   │                │                │
     │               │    session/    │                │                │
     │               │    started     │                │                │
     │               │                │                │                │
     │               │ 3. Forward     │                │                │
     │               │    HTTPS       │                │                │
     │               │───────────────▶│                │                │
     │               │                │ 4. POST        │                │
     │               │                │    /webhook/   │                │
     │               │                │    session/    │                │
     │               │                │    started     │                │
     │               │                │───────────────▶│                │
     │               │                │                │ 5. Lookup      │
     │               │                │                │    pod device  │
     │               │                │                │                │
     │               │                │                │ 6. Send ON     │
     │               │                │                │    command     │
     │               │                │                │───────────────▶│
     │               │                │                │ 7. Power ON    │
     │               │                │                │◀───────────────│
     │               │                │                │ 8. Log to      │
     │               │                │                │    SQLite      │
     │               │                │ 9. Broadcast   │                │
     │               │                │    WebSocket   │                │
     │               │ 10. Forward    │◀───────────────│                │
     │               │    (if needed) │                │                │
```

#### 2.2.4 Session Ends (Automatic Plug Off)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│ Supabase │────▶│  Vercel  │────▶│  ngrok   │────▶│    Pi    │────▶│  Tuya   │
│  DB      │     │ Webhook  │     │  Tunnel  │     │  Service │     │  Plug   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └─────────┘
     │               │                │                │                │
     │ 1. Session    │                │                │                │
     │    ended      │                │                │                │
     │    trigger    │                │                │                │
     │──────────────▶│                │                │                │
     │               │ 2. POST        │                │                │
     │               │    /webhook/   │                │                │
     │               │    session/    │                │                │
     │               │    ended       │                │                │
     │               │                │                │                │
     │               │ 3. Forward     │                │                │
     │               │    HTTPS       │                │                │
     │               │───────────────▶│                │                │
     │               │                │ 4. POST        │                │
     │               │                │    /webhook/   │                │
     │               │                │    session/    │                │
     │               │                │    ended       │                │
     │               │                │───────────────▶│                │
     │               │                │                │ 5. Optional:   │
     │               │                │                │    Delay 30s   │
     │               │                │                │                │
     │               │                │                │ 6. Send OFF    │
     │               │                │                │    command     │
     │               │                │                │───────────────▶│
     │               │                │                │ 7. Power OFF   │
     │               │                │                │◀───────────────│
     │               │                │                │ 8. Log usage   │
     │               │                │                │    stats       │
```

#### 2.2.5 Real-time Status Updates via WebSocket

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│  User    │     │  Vercel  │────▶│  ngrok   │◀───▶│    Pi    │◀───▶│  Tuya   │
│ Browsers │     │  WS      │     │  Tunnel  │     │  WS      │     │  Plugs  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └─────────┘
     │               │                │                │                │
     │ 1. Connect    │                │                │                │
     │    Socket.io  │                │                │                │
     │──────────────▶│                │                │                │
     │               │ 2. Upgrade     │                │                │
     │               │    WebSocket   │                │                │
     │               │───────────────▶│                │                │
     │               │                │ 3. Connect     │                │
     │               │                │    to Pi       │                │
     │               │                │───────────────▶│                │
     │               │                │                │ 4. Join room   │
     │               │                │                │                │
     │               │                │                │ 5. Poll all    │
     │               │                │                │    devices     │
     │               │                │                │◀──────────────▶│
     │               │                │                │                │
     │               │                │ 6. State       │                │
     │               │                │    change      │                │
     │               │                │◀───────────────│                │
     │               │ 7. Broadcast   │                │                │
     │               │◀───────────────│                │                │
     │ 8. Update UI  │                │                │                │
     │◀──────────────│                │                │                │
     │               │                │                │                │
     │               │                │                │ 9. Periodic    │
     │               │                │                │    heartbeat   │
     │               │                │                │    (30s)       │
```

### 2.3 Component Responsibilities

| Component | Technology | Primary Responsibilities | Data Storage |
|-----------|-----------|-------------------------|--------------|
| **Vercel Frontend** | Next.js 14, React, TypeScript | User interface, real-time dashboard, control panels, session management UI | None (stateless) |
| **Vercel API Routes** | Next.js API Routes, Edge Runtime | Authentication, request validation, forwarding to Pi, webhook handlers, Supabase integration | Supabase (sessions, users) |
| **Raspberry Pi Node.js Service** | Node.js 18+, Express, Socket.io | Device communication, protocol translation, local automation, WebSocket server | SQLite (device state, logs) |
| **SQLite Database** | SQLite3 | Device credentials, session logs, control history, configuration | Local file (/opt/gaming-shop/data/) |
| **Smart Plugs** | Tuya-enabled WiFi plugs | Physical power control, power monitoring, status reporting | Internal flash |

---

## 3. Hardware Requirements & Setup

### 3.1 Raspberry Pi Specifications

#### Recommended Models

| Model | Price | Pros | Cons | Recommendation |
|-------|-------|------|------|----------------|
| **Raspberry Pi 4 (4GB)** | $75 | Best performance, USB 3.0, dual-band WiFi | Higher power consumption, runs warmer | **PRIMARY CHOICE** |
| Raspberry Pi 4 (2GB) | $55 | Good performance, lower cost | May struggle with many concurrent connections | Acceptable for <20 pods |
| Raspberry Pi 3B+ | $45 | Lower power, proven reliability | Slower USB, single-band WiFi | Budget option |
| Raspberry Pi Zero 2 W | $25 | Very low power, compact | Limited RAM, slower processing | Not recommended |

#### Minimum Specifications

```
CPU: Quad-core 1.5GHz (ARM Cortex-A72 or better)
RAM: 2GB minimum, 4GB recommended
Storage: 32GB microSD (Class 10/UHS-I), 64GB recommended
Network: 2.4GHz WiFi (required for Tuya devices) + Ethernet (optional)
USB: 1x for potential expansion
Power: 5V/3A USB-C power supply
```

#### Required Accessories

| Item | Purpose | Estimated Cost | Where to Buy |
|------|---------|----------------|--------------|
| Official Pi 4 Power Supply | Reliable power delivery | $12 | Amazon, Adafruit |
| Heatsink Case | Passive cooling, protection | $15-25 | Amazon, Pimoroni |
| Samsung EVO Select 64GB SD | Reliable storage | $12 | Amazon |
| Ethernet Cable (optional) | Wired network backup | $5 | Any electronics store |
| UPS HAT (optional) | Power outage protection | $25-40 | Amazon, PiShop |

**Total Accessory Cost: $45-95**

### 3.2 Network Requirements

#### WiFi Router Specifications

```yaml
Requirements:
  Band: Dual-band (2.4GHz + 5GHz) - Tuya devices require 2.4GHz
  Protocol: 802.11n minimum, 802.11ac recommended
  Security: WPA2-Personal minimum, WPA3 preferred
  DHCP: Must support static IP reservations
  Ports: At least 4 LAN ports for expansion
  
Recommended Models:
  Budget: TP-Link Archer A7 ($60)
  Mid-range: ASUS RT-AX58U ($150)
  Enterprise: Ubiquiti UniFi ($200+)
```

#### Static IP Configuration

**Option A: Router DHCP Reservation (Recommended)**

```bash
# Access router admin panel (usually 192.168.1.1 or 192.168.0.1)
# Navigate to DHCP/Address Reservation
# Add reservation for Pi's MAC address

MAC Address: b8:27:eb:xx:xx:xx (check with ifconfig on Pi)
Reserved IP: 192.168.1.100
Hostname: gaming-pi-gateway
```

**Option B: Static IP on Pi**

```bash
# Edit DHCP configuration
sudo nano /etc/dhcpcd.conf

# Add at end of file:
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

#### Port Forwarding (if not using tunnel)

```bash
# Only needed if exposing Pi directly (NOT RECOMMENDED)
# Forward these ports on router:

External Port 443 → Internal 192.168.1.100:443 (HTTPS)
External Port 80 → Internal 192.168.1.100:80 (HTTP redirect)
```

#### Security Considerations

```yaml
Network Isolation:
  - Create separate IoT VLAN (if router supports)
  - Isolate smart plugs from main network
  - Allow only necessary traffic between VLANs

Firewall Rules:
  - Block incoming connections to Pi except from tunnel
  - Allow Pi outbound HTTPS (443) for tunnel
  - Allow Pi local network access to plugs (port 6668)

Physical Security:
  - Lock Pi in server room or secure enclosure
  - Use tamper-evident case seals
  - Consider surveillance camera
```

### 3.3 Smart Plug Selection

#### Recommended Tuya Models with Power Monitoring

| Model | Price | Features | Power Monitoring | Where to Buy |
|-------|-------|----------|------------------|--------------|
| **Gosund EP2** | $12-15 | Compact, reliable, no hub | Yes (±2%) | Amazon, AliExpress |
| **Teckin SP22** | $14-18 | Good app, scheduling | Yes (±3%) | Amazon |
| **BlitzWolf BW-SHP6** | $15-20 | Compact design, EU/US versions | Yes (±2%) | Banggood, AliExpress |
| **Athom PG01** | $18-22 | Open firmware option, very reliable | Yes (±1%) | Athom.tech |
| **Tuya TS011F** | $10-14 | Basic, widely compatible | Yes (±3%) | AliExpress |

**Recommendation: Gosund EP2 for best value, Athom PG01 for reliability**

#### Bulk Pricing

| Quantity | Unit Price | Total | Savings |
|----------|-----------|-------|---------|
| 1-5 | $15 | $75 | - |
| 6-10 | $13 | $130 | 13% |
| 11-20 | $11 | $220 | 27% |
| 21+ | $10 | $210+ | 33% |

**Tip: Order from AliExpress for bulk, Amazon for quick testing**

#### Setup Instructions

```bash
# Step 1: Install Smart Life or Tuya Smart app on phone

# Step 2: Create Tuya account (if not already done)

# Step 3: Add device to app
1. Plug in smart plug
2. Hold button for 5-10 seconds until LED blinks rapidly
3. In app: Add Device → Electrical → Socket (WiFi)
4. Follow pairing instructions
5. Connect to 2.4GHz WiFi network
6. Wait for "Device Added Successfully"

# Step 4: Get device credentials (for Pi)
# Method 1: Tuya IoT Platform (recommended)
1. Go to https://iot.tuya.com
2. Create developer account
3. Create Cloud Project
4. Link devices from app
5. Get Device ID and Local Key

# Method 2: tuya-cli (local extraction)
npm install -g @tuya/cli
tuya-cli wizard
# Follow prompts to extract credentials

# Step 5: Record for each plug:
- Device Name (e.g., "Pod-01-Living-Room")
- Device ID (e.g., "bf1234567890abcdef")
- Local Key (e.g., "a1b2c3d4e5f67890")
- IP Address (check router DHCP table)
```

---

## 4. Raspberry Pi Setup Guide

### 4.1 Initial OS Installation

#### Step 1: Download Raspberry Pi OS Lite

```bash
# Download from official source
wget https://downloads.raspberrypi.org/raspios_lite_arm64_latest

# Or use Raspberry Pi Imager GUI tool:
# https://www.raspberrypi.com/software/
```

#### Step 2: Flash to SD Card

**Using Raspberry Pi Imager (Recommended):**

```bash
# Download and install imager
# https://www.raspberrypi.com/software/

# Steps:
1. Insert SD card into computer
2. Open Raspberry Pi Imager
3. Choose OS: Raspberry Pi OS Lite (64-bit)
4. Choose Storage: Select SD card
5. Click gear icon (⚙️) for advanced options:
   - Enable SSH
   - Set username/password (pi / yourpassword)
   - Configure WiFi (SSID and password)
   - Set locale (timezone, keyboard)
6. Click Write and wait for completion
```

**Using Command Line (Linux/Mac):**

```bash
# Identify SD card (be careful!)
diskutil list  # Mac
lsblk          # Linux

# Unmount SD card
diskutil unmountDisk /dev/disk2  # Mac
umount /dev/sdb*                 # Linux

# Flash OS (replace /dev/disk2 with your SD card)
sudo dd if=2023-12-05-raspios-bookworm-arm64-lite.img of=/dev/disk2 bs=4M status=progress

# Or use balenaEtcher for GUI option
```

#### Step 3: Enable SSH and WiFi Headless Setup

**If not using Imager, create files manually:**

```bash
# Mount SD card and create files:

# 1. Enable SSH
touch /Volumes/boot/ssh  # Mac
touch /media/user/boot/ssh  # Linux

# 2. Configure WiFi
# Create wpa_supplicant.conf in boot partition:
cat > /Volumes/boot/wpa_supplicant.conf << 'EOF'
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="YourWiFiNetwork"
    psk="YourWiFiPassword"
    key_mgmt=WPA-PSK
}
EOF
```

### 4.2 System Configuration

#### Step 1: First Boot and Update

```bash
# Insert SD card and power on Pi
# Wait 2-3 minutes for first boot

# SSH into Pi (find IP from router or use hostname)
ssh pi@raspberrypi.local
# or
ssh pi@192.168.1.100

# Default password: raspberry (change immediately!)

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget vim htop tree
```

#### Step 2: Configure Static IP

```bash
# Edit DHCP configuration
sudo nano /etc/dhcpcd.conf

# Add at the end:
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# For ethernet (optional):
interface eth0
static ip_address=192.168.1.101/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# Restart networking
sudo reboot
```

#### Step 3: Set Up Firewall (UFW)

```bash
# Install UFW
sudo apt install -y ufw

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (for local testing)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port (adjust as needed)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### Step 4: Install Node.js 18+

```bash
# Install NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version

# Install global packages
sudo npm install -g pm2 typescript ts-node
```

#### Step 5: Install PM2 for Process Management

```bash
# PM2 already installed above, configure it

# Set up PM2 to start on boot
pm2 startup systemd

# Run the command it outputs, e.g.:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u pi --hp /home/pi

# Save PM2 config (will do after deploying app)
pm2 save
```

### 4.3 Project Setup

#### Step 1: Create Directory Structure

```bash
# Create application directory
sudo mkdir -p /opt/gaming-shop
cd /opt/gaming-shop

# Create subdirectories
sudo mkdir -p {src,logs,data,config,scripts}
sudo chown -R pi:pi /opt/gaming-shop

# Directory structure:
# /opt/gaming-shop/
# ├── src/           # Source code
# ├── logs/          # Application logs
# ├── data/          # SQLite database
# ├── config/        # Configuration files
# └── scripts/       # Utility scripts
```

#### Step 2: Initialize Project

```bash
cd /opt/gaming-shop

# Initialize npm project
npm init -y

# Install dependencies
npm install express socket.io sqlite3 tuy-api dotenv cors helmet winston
npm install --save-dev @types/node @types/express @types/cors typescript ts-node nodemon

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

#### Step 3: Environment Variables Configuration

```bash
# Create environment file
cat > /opt/gaming-shop/.env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
API_KEY=your-secure-api-key-min-32-characters-long
JWT_SECRET=your-jwt-secret-min-32-characters

# Database
DB_PATH=/opt/gaming-shop/data/gaming-shop.db

# Tuya Configuration
TUYA_TIMEOUT=5000
TUYA_RECONNECT_INTERVAL=30000
TUYA_HEARTBEAT_INTERVAL=30000

# Supabase (for webhooks)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_WEBHOOK_SECRET=your-webhook-secret

# Tunnel Configuration (ngrok or Cloudflare)
TUNNEL_TYPE=ngrok
NGROK_AUTHTOKEN=your-ngrok-token
NGROK_REGION=us

# OR for Cloudflare:
# TUNNEL_TYPE=cloudflare
# CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/gaming-shop/logs/app.log

# Feature Flags
ENABLE_POWER_MONITORING=true
ENABLE_AUTO_CONTROL=true
ENABLE_WEBSOCKET=true
EOF

# Secure the file
chmod 600 /opt/gaming-shop/.env
```

#### Step 4: Database Initialization

```bash
# Create database initialization script
cat > /opt/gaming-shop/scripts/init-db.sql << 'EOF'
-- Device credentials table
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pod_id TEXT UNIQUE NOT NULL,
    device_id TEXT UNIQUE NOT NULL,
    local_key TEXT NOT NULL,
    ip_address TEXT,
    name TEXT NOT NULL,
    model TEXT,
    power_monitoring BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Device state cache
CREATE TABLE IF NOT EXISTS device_states (
    device_id TEXT PRIMARY KEY,
    is_on BOOLEAN DEFAULT 0,
    power_watts REAL,
    voltage REAL,
    current REAL,
    last_seen DATETIME,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- Control logs
CREATE TABLE IF NOT EXISTS control_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pod_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'on', 'off', 'toggle'
    source TEXT NOT NULL, -- 'user', 'automation', 'system'
    user_id TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- Session automation logs
CREATE TABLE IF NOT EXISTS session_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    pod_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'started', 'ended'
    plug_action TEXT, -- 'turned_on', 'turned_off'
    success BOOLEAN,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System health logs
CREATE TABLE IF NOT EXISTS health_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_type TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_control_logs_pod_id ON control_logs(pod_id);
CREATE INDEX IF NOT EXISTS idx_control_logs_timestamp ON control_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_session_logs_session_id ON session_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_timestamp ON health_logs(timestamp);

-- Insert sample device (replace with actual values)
-- INSERT INTO devices (pod_id, device_id, local_key, ip_address, name, model, power_monitoring)
-- VALUES ('pod-01', 'bf1234567890abcdef', 'a1b2c3d4e5f67890', '192.168.1.101', 'Pod 1 - Living Room', 'Gosund EP2', 1);
EOF

# Initialize database
sqlite3 /opt/gaming-shop/data/gaming-shop.db < /opt/gaming-shop/scripts/init-db.sql

# Set permissions
chmod 664 /opt/gaming-shop/data/gaming-shop.db
```

#### Step 5: Service Setup

```bash
# Create systemd service file
sudo tee /etc/systemd/system/gaming-shop.service << 'EOF'
[Unit]
Description=Gaming Shop Smart Plug Gateway
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/gaming-shop
Environment=NODE_ENV=production
EnvironmentFile=/opt/gaming-shop/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=append:/opt/gaming-shop/logs/system.log
StandardError=append:/opt/gaming-shop/logs/error.log

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable service (don't start yet - need to build first)
sudo systemctl enable gaming-shop.service
```

### 4.4 Internet Exposure Setup

#### Option A: ngrok Setup (Free Tier)

```bash
# Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok

# Authenticate
ngrok config add-authtoken YOUR_NGROK_TOKEN

# Create ngrok configuration
cat > /opt/gaming-shop/config/ngrok.yml << 'EOF'
version: 2
authtoken: YOUR_NGROK_TOKEN
region: us
log: /opt/gaming-shop/logs/ngrok.log

# HTTP tunnel to local service
tunnels:
  gaming-shop:
    proto: http
    addr: 3000
    domain: your-subdomain.ngrok-free.app  # Optional: reserved domain
    inspect: false
EOF

# Create systemd service for ngrok
sudo tee /etc/systemd/system/ngrok.service << 'EOF'
[Unit]
Description=ngrok tunnel for gaming shop
After=network.target gaming-shop.service
Wants=gaming-shop.service

[Service]
Type=simple
User=pi
ExecStart=/usr/bin/ngrok start --config=/opt/gaming-shop/config/ngrok.yml gaming-shop
Restart=always
RestartSec=10
StandardOutput=append:/opt/gaming-shop/logs/ngrok.log
StandardError=append:/opt/gaming-shop/logs/ngrok-error.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ngrok.service
```

#### Option B: Cloudflare Tunnel Setup (Recommended)

```bash
# Install cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb

# Authenticate (run on Pi with browser access, or copy credentials)
cloudflared tunnel login
# This will provide a URL to authenticate in browser

# Create tunnel
cloudflared tunnel create gaming-shop-pi
# Note the tunnel ID from output

# Create configuration
cat > /opt/gaming-shop/config/cloudflared.yml << 'EOF'
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/pi/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: gaming-shop.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Create DNS record
cloudflared tunnel route dns gaming-shop-pi gaming-shop.yourdomain.com

# Create systemd service
sudo cloudflared service install
sudo systemctl enable cloudflared

# Edit cloudflared config to point to our config
sudo nano /etc/cloudflared/config.yml
# Replace contents with path to our config
```

---

## 5. Backend Implementation (Raspberry Pi)

### 5.1 Project Structure

```
/opt/gaming-shop/
├── src/
│   ├── server.ts                 # Main entry point
│   ├── config/
│   │   ├── database.ts           # SQLite configuration
│   │   └── environment.ts        # Environment variables
│   ├── services/
│   │   ├── tuyaService.ts        # Tuya device management
│   │   ├── deviceManager.ts      # Device connection pool
│   │   ├── sessionAutomation.ts  # Automatic plug control
│   │   └── healthMonitor.ts      # System health checks
│   ├── routes/
│   │   ├── plugs.ts              # Plug control API
│   │   ├── webhooks.ts           # Supabase webhooks
│   │   └── health.ts             # Health check endpoint
│   ├── middleware/
│   │   ├── auth.ts               # Authentication
│   │   ├── errorHandler.ts       # Error handling
│   │   └── logging.ts            # Request logging
│   ├── websocket/
│   │   └── socketHandler.ts      # WebSocket events
│   ├── models/
│   │   ├── device.ts             # Device types
│   │   └── session.ts            # Session types
│   └── utils/
│       ├── logger.ts             # Winston logger
│       └── helpers.ts            # Utility functions
├── dist/                         # Compiled JavaScript
├── logs/                         # Application logs
├── data/                         # SQLite database
├── config/                       # Configuration files
└── scripts/                      # Utility scripts
```

### 5.2 Database Layer (SQLite)

**File: `/opt/gaming-shop/src/config/database.ts`**

```typescript
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { logger } from '../utils/logger';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function initializeDatabase(): Promise<Database> {
  const dbPath = process.env.DB_PATH || '/opt/gaming-shop/data/gaming-shop.db';
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  logger.info(`Database initialized at ${dbPath}`);
  
  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');
  
  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// Device operations
export async function getDeviceByPodId(podId: string): Promise<any> {
  const db = getDatabase();
  return db.get('SELECT * FROM devices WHERE pod_id = ?', podId);
}

export async function getAllDevices(): Promise<any[]> {
  const db = getDatabase();
  return db.all('SELECT * FROM devices ORDER BY pod_id');
}

export async function updateDeviceState(deviceId: string, state: any): Promise<void> {
  const db = getDatabase();
  await db.run(
    `INSERT INTO device_states (device_id, is_on, power_watts, voltage, current, last_seen)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET
     is_on = excluded.is_on,
     power_watts = excluded.power_watts,
     voltage = excluded.voltage,
     current = excluded.current,
     last_seen = excluded.last_seen,
     last_updated = CURRENT_TIMESTAMP`,
    [deviceId, state.isOn, state.power, state.voltage, state.current, new Date().toISOString()]
  );
}

export async function getDeviceState(deviceId: string): Promise<any> {
  const db = getDatabase();
  return db.get('SELECT * FROM device_states WHERE device_id = ?', deviceId);
}

// Logging operations
export async function logControlAction(log: {
  podId: string;
  deviceId: string;
  action: string;
  source: string;
  userId?: string;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  const db = getDatabase();
  await db.run(
    `INSERT INTO control_logs (pod_id, device_id, action, source, user_id, success, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [log.podId, log.deviceId, log.action, log.source, log.userId, log.success, log.errorMessage]
  );
}

export async function logSessionEvent(log: {
  sessionId: string;
  podId: string;
  eventType: string;
  plugAction?: string;
  success?: boolean;
}): Promise<void> {
  const db = getDatabase();
  await db.run(
    `INSERT INTO session_logs (session_id, pod_id, event_type, plug_action, success)
     VALUES (?, ?, ?, ?, ?)`,
    [log.sessionId, log.podId, log.eventType, log.plugAction, log.success]
  );
}

export async function getControlLogs(podId?: string, limit: number = 100): Promise<any[]> {
  const db = getDatabase();
  if (podId) {
    return db.all(
      'SELECT * FROM control_logs WHERE pod_id = ? ORDER BY timestamp DESC LIMIT ?',
      [podId, limit]
    );
  }
  return db.all('SELECT * FROM control_logs ORDER BY timestamp DESC LIMIT ?', limit);
}
```

### 5.3 Tuya Protocol Service

**File: `/opt/gaming-shop/src/services/tuyaService.ts`**

```typescript
import TuyaDevice from 'tuy-api';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { getDeviceByPodId, updateDeviceState, logControlAction } from '../config/database';

interface DeviceConfig {
  podId: string;
  deviceId: string;
  localKey: string;
  ipAddress: string;
}

interface DeviceState {
  isOn: boolean;
  power?: number;
  voltage?: number;
  current?: number;
  lastSeen: Date;
}

class TuyaService extends EventEmitter {
  private devices: Map<string, TuyaDevice> = new Map();
  private deviceStates: Map<string, DeviceState> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  private readonly RECONNECT_INTERVAL = 30000;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly COMMAND_TIMEOUT = 5000;

  async initializeDevice(config: DeviceConfig): Promise<boolean> {
    try {
      logger.info(`Initializing device ${config.podId} (${config.deviceId})`);
      
      const device = new TuyaDevice({
        id: config.deviceId,
        key: config.localKey,
        ip: config.ipAddress,
        version: '3.3',
        issueGetOnConnect: false
      });

      // Set up event handlers
      device.on('connected', () => {
        logger.info(`Device ${config.podId} connected`);
        this.emit('deviceConnected', config.podId);
        this.startHeartbeat(config.podId, device);
      });

      device.on('disconnected', () => {
        logger.warn(`Device ${config.podId} disconnected`);
        this.emit('deviceDisconnected', config.podId);
        this.scheduleReconnect(config);
      });

      device.on('error', (error) => {
        logger.error(`Device ${config.podId} error:`, error);
        this.emit('deviceError', config.podId, error);
      });

      device.on('data', (data) => {
        this.handleDeviceData(config.podId, data);
      });

      // Connect to device
      await device.connect();
      
      // Store device reference
      this.devices.set(config.podId, device);
      
      // Initial state query
      await this.refreshDeviceState(config.podId);
      
      return true;
    } catch (error) {
      logger.error(`Failed to initialize device ${config.podId}:`, error);
      this.scheduleReconnect(config);
      return false;
    }
  }

  private scheduleReconnect(config: DeviceConfig): void {
    // Clear existing timer
    const existingTimer = this.reconnectTimers.get(config.podId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule reconnection
    const timer = setTimeout(async () => {
      logger.info(`Attempting to reconnect to device ${config.podId}`);
      await this.initializeDevice(config);
    }, this.RECONNECT_INTERVAL);

    this.reconnectTimers.set(config.podId, timer);
  }

  private startHeartbeat(podId: string, device: TuyaDevice): void {
    // Clear existing interval
    const existingInterval = this.heartbeatIntervals.get(podId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start heartbeat
    const interval = setInterval(async () => {
      try {
        await this.refreshDeviceState(podId);
      } catch (error) {
        logger.warn(`Heartbeat failed for device ${podId}:`, error);
      }
    }, this.HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(podId, interval);
  }

  private async handleDeviceData(podId: string, data: any): Promise<void> {
    try {
      const state: DeviceState = {
        isOn: data.dps?.['1'] === true,
        lastSeen: new Date()
      };

      // Extract power monitoring data if available
      if (data.dps?.['19'] !== undefined) {
        state.power = data.dps['19'] / 10; // Usually in deciwatts
      }
      if (data.dps?.['20'] !== undefined) {
        state.voltage = data.dps['20'] / 10; // Usually in decivolts
      }
      if (data.dps?.['18'] !== undefined) {
        state.current = data.dps['18'] / 1000; // Usually in milliamps
      }

      // Update local cache
      this.deviceStates.set(podId, state);

      // Update database
      const device = await getDeviceByPodId(podId);
      if (device) {
        await updateDeviceState(device.device_id, state);
      }

      // Emit event
      this.emit('stateChanged', podId, state);
    } catch (error) {
      logger.error(`Error handling device data for ${podId}:`, error);
    }
  }

  async refreshDeviceState(podId: string): Promise<DeviceState | null> {
    const device = this.devices.get(podId);
    if (!device) {
      logger.warn(`Device ${podId} not found`);
      return null;
    }

    try {
      const data = await device.get({ schema: true });
      await this.handleDeviceData(podId, data);
      return this.deviceStates.get(podId) || null;
    } catch (error) {
      logger.error(`Failed to refresh state for device ${podId}:`, error);
      throw error;
    }
  }

  async controlDevice(
    podId: string, 
    action: 'on' | 'off' | 'toggle',
    source: string = 'system',
    userId?: string
  ): Promise<boolean> {
    const device = this.devices.get(podId);
    if (!device) {
      throw new Error(`Device ${podId} not found or not connected`);
    }

    const deviceConfig = await getDeviceByPodId(podId);
    if (!deviceConfig) {
      throw new Error(`Device configuration not found for ${podId}`);
    }

    try {
      let targetState: boolean;

      if (action === 'toggle') {
        const currentState = this.deviceStates.get(podId);
        targetState = !(currentState?.isOn ?? false);
      } else {
        targetState = action === 'on';
      }

      // Send command with timeout
      await Promise.race([
        device.set({ dps: 1, set: targetState }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Command timeout')), this.COMMAND_TIMEOUT)
        )
      ]);

      // Update state immediately (optimistic)
      const newState: DeviceState = {
        isOn: targetState,
        lastSeen: new Date()
      };
      this.deviceStates.set(podId, newState);

      // Log the action
      await logControlAction({
        podId,
        deviceId: deviceConfig.device_id,
        action: targetState ? 'on' : 'off',
        source,
        userId,
        success: true
      });

      // Emit event
      this.emit('stateChanged', podId, newState);

      logger.info(`Device ${podId} turned ${targetState ? 'ON' : 'OFF'} (${source})`);
      return true;
    } catch (error) {
      // Log failure
      await logControlAction({
        podId,
        deviceId: deviceConfig.device_id,
        action,
        source,
        userId,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error(`Failed to control device ${podId}:`, error);
      throw error;
    }
  }

  async bulkControl(
    podIds: string[], 
    action: 'on' | 'off',
    source: string = 'system'
  ): Promise<{ success: string[]; failed: { podId: string; error: string }[] }> {
    const results = {
      success: [] as string[],
      failed: [] as { podId: string; error: string }[]
    };

    await Promise.all(
      podIds.map(async (podId) => {
        try {
          await this.controlDevice(podId, action, source);
          results.success.push(podId);
        } catch (error) {
          results.failed.push({
            podId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      })
    );

    return results;
  }

  getDeviceState(podId: string): DeviceState | null {
    return this.deviceStates.get(podId) || null;
  }

  getAllDeviceStates(): Map<string, DeviceState> {
    return new Map(this.deviceStates);
  }

  isDeviceConnected(podId: string): boolean {
    const device = this.devices.get(podId);
    return device?.isConnected() ?? false;
  }

  async disconnectDevice(podId: string): Promise<void> {
    // Clear timers
    const reconnectTimer = this.reconnectTimers.get(podId);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      this.reconnectTimers.delete(podId);
    }

    const heartbeatInterval = this.heartbeatIntervals.get(podId);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.heartbeatIntervals.delete(podId);
    }

    // Disconnect device
    const device = this.devices.get(podId);
    if (device) {
      await device.disconnect();
      this.devices.delete(podId);
    }

    this.deviceStates.delete(podId);
    logger.info(`Device ${podId} disconnected and cleaned up`);
  }

  async disconnectAll(): Promise<void> {
    const podIds = Array.from(this.devices.keys());
    await Promise.all(podIds.map(podId => this.disconnectDevice(podId)));
    logger.info('All devices disconnected');
  }
}

export const tuyaService = new TuyaService();
```

### 5.4 HTTP API Layer (Express)

**File: `/opt/gaming-shop/src/routes/plugs.ts`**

```typescript
import { Router } from 'express';
import { authenticateApiKey } from '../middleware/auth';
import { tuyaService } from '../services/tuyaService';
import { getAllDevices, getDeviceState, getControlLogs } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(authenticateApiKey);

// POST /api/plugs/:podId/control - Turn plug on/off
router.post('/:podId/control', async (req, res) => {
  try {
    const { podId } = req.params;
    const { action } = req.body; // 'on', 'off', or 'toggle'
    const userId = (req as any).user?.id;

    if (!['on', 'off', 'toggle'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "on", "off", or "toggle"'
      });
    }

    const success = await tuyaService.controlDevice(podId, action, 'user', userId);
    
    const state = tuyaService.getDeviceState(podId);
    
    res.json({
      success,
      podId,
      action,
      state: {
        isOn: state?.isOn ?? false,
        lastSeen: state?.lastSeen
      }
    });
  } catch (error) {
    logger.error('Control error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Control failed'
    });
  }
});

// GET /api/plugs/:podId/status - Get single plug status
router.get('/:podId/status', async (req, res) => {
  try {
    const { podId } = req.params;
    
    const device = await getDeviceByPodId(podId);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Refresh state from device
    await tuyaService.refreshDeviceState(podId);
    const state = tuyaService.getDeviceState(podId);
    const isConnected = tuyaService.isDeviceConnected(podId);

    res.json({
      success: true,
      podId,
      device: {
        name: device.name,
        model: device.model,
        hasPowerMonitoring: device.power_monitoring
      },
      state: {
        isOn: state?.isOn ?? false,
        power: state?.power,
        voltage: state?.voltage,
        current: state?.current,
        lastSeen: state?.lastSeen
      },
      connection: {
        isConnected,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status'
    });
  }
});

// GET /api/plugs/status - Get all plugs status
router.get('/status', async (req, res) => {
  try {
    const devices = await getAllDevices();
    const states = tuyaService.getAllDeviceStates();
    
    const plugs = await Promise.all(
      devices.map(async (device) => {
        // Refresh state for connected devices
        if (tuyaService.isDeviceConnected(device.pod_id)) {
          try {
            await tuyaService.refreshDeviceState(device.pod_id);
          } catch (error) {
            logger.warn(`Failed to refresh state for ${device.pod_id}`);
          }
        }
        
        const state = states.get(device.pod_id);
        
        return {
          podId: device.pod_id,
          name: device.name,
          model: device.model,
          hasPowerMonitoring: device.power_monitoring,
          state: {
            isOn: state?.isOn ?? false,
            power: state?.power,
            voltage: state?.voltage,
            current: state?.current,
            lastSeen: state?.lastSeen
          },
          connection: {
            isConnected: tuyaService.isDeviceConnected(device.pod_id),
            timestamp: new Date().toISOString()
          }
        };
      })
    );

    res.json({
      success: true,
      count: plugs.length,
      plugs
    });
  } catch (error) {
    logger.error('Bulk status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status'
    });
  }
});

// POST /api/plugs/bulk-control - Control multiple plugs
router.post('/bulk-control', async (req, res) => {
  try {
    const { podIds, action } = req.body;
    const userId = (req as any).user?.id;

    if (!Array.isArray(podIds) || podIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'podIds must be a non-empty array'
      });
    }

    if (!['on', 'off'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "on" or "off"'
      });
    }

    const results = await tuyaService.bulkControl(podIds, action, 'user');

    res.json({
      success: results.failed.length === 0,
      action,
      results: {
        successful: results.success.length,
        failed: results.failed.length,
        details: results
      }
    });
  } catch (error) {
    logger.error('Bulk control error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Bulk control failed'
    });
  }
});

// GET /api/plugs/:podId/logs - Get control logs
router.get('/:podId/logs', async (req, res) => {
  try {
    const { podId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const logs = await getControlLogs(podId, limit);

    res.json({
      success: true,
      podId,
      count: logs.length,
      logs
    });
  } catch (error) {
    logger.error('Logs error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get logs'
    });
  }
});

export default router;
```

**File: `/opt/gaming-shop/src/routes/health.ts`**

```typescript
import { Router } from 'express';
import os from 'os';
import { tuyaService } from '../services/tuyaService';
import { getDatabase } from '../config/database';

const router = Router();

// GET /api/health - System health check
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Check database
    await db.get('SELECT 1');
    const dbHealthy = true;

    // Get device stats
    const allStates = tuyaService.getAllDeviceStates();
    const connectedDevices = Array.from(allStates.keys()).filter(
      podId => tuyaService.isDeviceConnected(podId)
    );

    // System stats
    const systemStats = {
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: os.platform()
    };

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        tuyaService: 'healthy'
      },
      devices: {
        total: allStates.size,
        connected: connectedDevices.length,
        disconnected: allStates.size - connectedDevices.length
      },
      system: systemStats
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

export default router;
```

### 5.5 WebSocket Layer

**File: `/opt/gaming-shop/src/websocket/socketHandler.ts`**

```typescript
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { tuyaService } from '../services/tuyaService';
import { logger } from '../utils/logger';
import { getAllDevices } from '../config/database';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: string;
  };
  isAuthenticated: boolean;
}

export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Configure appropriately for production
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    
    // Validate token (implement your JWT validation)
    // For now, accept all connections in development
    socket.isAuthenticated = true;
    socket.user = { id: 'anonymous', role: 'user' };
    
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Send initial state
    sendInitialState(socket);

    // Join rooms for specific pods
    socket.on('subscribe', (podIds: string[]) => {
      if (Array.isArray(podIds)) {
        podIds.forEach(podId => {
          socket.join(`pod:${podId}`);
          logger.info(`Socket ${socket.id} subscribed to pod:${podId}`);
        });
      }
    });

    socket.on('unsubscribe', (podIds: string[]) => {
      if (Array.isArray(podIds)) {
        podIds.forEach(podId => {
          socket.leave(`pod:${podId}`);
        });
      }
    });

    // Handle control requests
    socket.on('control', async (data: { podId: string; action: 'on' | 'off' | 'toggle' }) => {
      try {
        const { podId, action } = data;
        
        if (!socket.isAuthenticated) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const success = await tuyaService.controlDevice(
          podId, 
          action, 
          'user', 
          socket.user?.id
        );

        socket.emit('controlResponse', {
          success,
          podId,
          action
        });
      } catch (error) {
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Control failed'
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  // Listen for device state changes and broadcast
  tuyaService.on('stateChanged', (podId: string, state: any) => {
    io.to(`pod:${podId}`).emit('stateChanged', {
      podId,
      state: {
        isOn: state.isOn,
        power: state.power,
        voltage: state.voltage,
        current: state.current,
        lastSeen: state.lastSeen
      },
      timestamp: new Date().toISOString()
    });
  });

  tuyaService.on('deviceConnected', (podId: string) => {
    io.emit('deviceConnected', { podId, timestamp: new Date().toISOString() });
  });

  tuyaService.on('deviceDisconnected', (podId: string) => {
    io.emit('deviceDisconnected', { podId, timestamp: new Date().toISOString() });
  });

  return io;
}

async function sendInitialState(socket: AuthenticatedSocket): Promise<void> {
  try {
    const devices = await getAllDevices();
    const states = tuyaService.getAllDeviceStates();

    const plugs = devices.map(device => {
      const state = states.get(device.pod_id);
      return {
        podId: device.pod_id,
        name: device.name,
        state: {
          isOn: state?.isOn ?? false,
          power: state?.power,
          voltage: state?.voltage,
          current: state?.current,
          lastSeen: state?.lastSeen
        },
        connection: {
          isConnected: tuyaService.isDeviceConnected(device.pod_id)
        }
      };
    });

    socket.emit('initialState', { plugs });
  } catch (error) {
    logger.error('Failed to send initial state:', error);
    socket.emit('error', { message: 'Failed to load initial state' });
  }
}
```

### 5.6 Session Automation

**File: `/opt/gaming-shop/src/services/sessionAutomation.ts`**

```typescript
import { tuyaService } from './tuyaService';
import { logSessionEvent } from '../config/database';
import { logger } from '../utils/logger';

interface SessionEvent {
  sessionId: string;
  podId: string;
  eventType: 'started' | 'ended';
  timestamp: string;
}

class SessionAutomation {
  private readonly TURN_OFF_DELAY_MS = 30000; // 30 seconds delay before turning off

  async handleSessionStarted(event: SessionEvent): Promise<void> {
    try {
      logger.info(`Session started for pod ${event.podId}, turning plug ON`);
      
      await tuyaService.controlDevice(event.podId, 'on', 'automation');
      
      await logSessionEvent({
        sessionId: event.sessionId,
        podId: event.podId,
        eventType: 'started',
        plugAction: 'turned_on',
        success: true
      });

      logger.info(`Successfully turned ON plug for session ${event.sessionId}`);
    } catch (error) {
      logger.error(`Failed to handle session start for ${event.podId}:`, error);
      
      await logSessionEvent({
        sessionId: event.sessionId,
        podId: event.podId,
        eventType: 'started',
        plugAction: 'turned_on',
        success: false
      });
      
      throw error;
    }
  }

  async handleSessionEnded(event: SessionEvent): Promise<void> {
    try {
      logger.info(`Session ended for pod ${event.podId}, scheduling plug OFF in ${this.TURN_OFF_DELAY_MS}ms`);
      
      // Delay before turning off (allows for cleanup, user to save, etc.)
      setTimeout(async () => {
        try {
          await tuyaService.controlDevice(event.podId, 'off', 'automation');
          
          await logSessionEvent({
            sessionId: event.sessionId,
            podId: event.podId,
            eventType: 'ended',
            plugAction: 'turned_off',
            success: true
          });

          logger.info(`Successfully turned OFF plug for session ${event.sessionId}`);
        } catch (error) {
          logger.error(`Failed to turn off plug for session ${event.sessionId}:`, error);
          
          await logSessionEvent({
            sessionId: event.sessionId,
            podId: event.podId,
            eventType: 'ended',
            plugAction: 'turned_off',
            success: false
          });
        }
      }, this.TURN_OFF_DELAY_MS);
    } catch (error) {
      logger.error(`Failed to handle session end for ${event.podId}:`, error);
      throw error;
    }
  }
}

export const sessionAutomation = new SessionAutomation();
```

### 5.7 Background Services

**File: `/opt/gaming-shop/src/services/healthMonitor.ts`**

```typescript
import { tuyaService } from './tuyaService';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';

class HealthMonitor {
  private interval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // 1 minute

  start(): void {
    if (this.interval) {
      return;
    }

    logger.info('Starting health monitor');
    
    this.interval = setInterval(async () => {
      await this.runHealthChecks();
    }, this.CHECK_INTERVAL);

    // Run initial check
    this.runHealthChecks();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Health monitor stopped');
    }
  }

  private async runHealthChecks(): Promise<void> {
    try {
      // Check database connection
      await this.checkDatabase();
      
      // Check device connections
      await this.checkDevices();
      
      // Log system health
      await this.logHealth('system', 'healthy', 'All checks passed');
    } catch (error) {
      logger.error('Health check failed:', error);
      await this.logHealth('system', 'unhealthy', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async checkDatabase(): Promise<void> {
    try {
      const db = getDatabase();
      await db.get('SELECT 1');
      await this.logHealth('database', 'healthy');
    } catch (error) {
      await this.logHealth('database', 'unhealthy', error instanceof Error ? error.message : 'Database check failed');
      throw error;
    }
  }

  private async checkDevices(): Promise<void> {
    const states = tuyaService.getAllDeviceStates();
    let connectedCount = 0;
    let disconnectedCount = 0;

    for (const [podId, state] of states) {
      if (tuyaService.isDeviceConnected(podId)) {
        connectedCount++;
        
        // Refresh state for connected devices
        try {
          await tuyaService.refreshDeviceState(podId);
        } catch (error) {
          logger.warn(`Failed to refresh state for ${podId}`);
        }
      } else {
        disconnectedCount++;
      }
    }

    await this.logHealth(
      'devices',
      disconnectedCount === 0 ? 'healthy' : 'degraded',
      `${connectedCount} connected, ${disconnectedCount} disconnected`
    );
  }

  private async logHealth(checkType: string, status: string, message?: string): Promise<void> {
    try {
      const db = getDatabase();
      await db.run(
        'INSERT INTO health_logs (check_type, status, message) VALUES (?, ?, ?)',
        [checkType, status, message || null]
      );
    } catch (error) {
      logger.error('Failed to log health check:', error);
    }
  }
}

export const healthMonitor = new HealthMonitor();
```

---

## 6. Vercel Frontend Updates

### 6.1 Environment Configuration

**File: `.env.local`**

```bash
# Pi Gateway Configuration
NEXT_PUBLIC_PI_API_URL=https://your-ngrok-url.ngrok-free.app
PI_API_KEY=your-secure-api-key-min-32-characters-long

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=wss://your-ngrok-url.ngrok-free.app

# Feature Flags
NEXT_PUBLIC_ENABLE_SMART_PLUGS=true
NEXT_PUBLIC_ENABLE_POWER_MONITORING=true
NEXT_PUBLIC_ENABLE_AUTO_CONTROL=true
```

### 6.2 API Integration Layer

**File: `src/lib/piApi.ts`**

```typescript
import axios, { AxiosError } from 'axios';

const PI_API_URL = process.env.NEXT_PUBLIC_PI_API_URL || '';
const PI_API_KEY = process.env.PI_API_KEY || '';

const piClient = axios.create({
  baseURL: PI_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': PI_API_KEY
  },
  timeout: 10000
});

// Response interceptor for error handling
piClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - Pi gateway may be offline');
    }
    if (error.response?.status === 503) {
      throw new Error('Pi gateway service unavailable');
    }
    throw error;
  }
);

export interface PlugState {
  isOn: boolean;
  power?: number;
  voltage?: number;
  current?: number;
  lastSeen?: string;
}

export interface PlugConnection {
  isConnected: boolean;
  timestamp: string;
}

export interface Plug {
  podId: string;
  name: string;
  model?: string;
  hasPowerMonitoring: boolean;
  state: PlugState;
  connection: PlugConnection;
}

export interface ControlResponse {
  success: boolean;
  podId: string;
  action: string;
  state: PlugState;
}

export const piApi = {
  // Get all plugs status
  async getAllPlugs(): Promise<Plug[]> {
    const response = await piClient.get('/api/plugs/status');
    return response.data.plugs;
  },

  // Get single plug status
  async getPlugStatus(podId: string): Promise<Plug> {
    const response = await piClient.get(`/api/plugs/${podId}/status`);
    return {
      podId: response.data.podId,
      ...response.data
    };
  },

  // Control a plug
  async controlPlug(podId: string, action: 'on' | 'off' | 'toggle'): Promise<ControlResponse> {
    const response = await piClient.post(`/api/plugs/${podId}/control`, { action });
    return response.data;
  },

  // Bulk control
  async bulkControl(podIds: string[], action: 'on' | 'off'): Promise<{
    success: boolean;
    results: {
      successful: number;
      failed: number;
      details: {
        success: string[];
        failed: { podId: string; error: string }[];
      };
    };
  }> {
    const response = await piClient.post('/api/plugs/bulk-control', { podIds, action });
    return response.data;
  },

  // Get control logs
  async getControlLogs(podId: string, limit: number = 50): Promise<any[]> {
    const response = await piClient.get(`/api/plugs/${podId}/logs?limit=${limit}`);
    return response.data.logs;
  },

  // Health check
  async healthCheck(): Promise<{
    status: string;
    devices: { total: number; connected: number };
  }> {
    const response = await piClient.get('/api/health');
    return response.data;
  }
};
```

**File: `src/hooks/useWebSocket.ts`**

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '';

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface UseWebSocketOptions {
  onStateChanged?: (data: { podId: string; state: any }) => void;
  onDeviceConnected?: (data: { podId: string }) => void;
  onDeviceDisconnected?: (data: { podId: string }) => void;
  onInitialState?: (data: { plugs: any[] }) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [wsState, setWsState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null
  });
  
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setWsState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      setWsState({
        isConnected: true,
        isConnecting: false,
        error: null
      });
    });

    socket.on('disconnect', () => {
      setWsState(prev => ({
        ...prev,
        isConnected: false
      }));
    });

    socket.on('connect_error', (error) => {
      setWsState({
        isConnected: false,
        isConnecting: false,
        error: error.message
      });
    });

    // Event handlers
    socket.on('initialState', (data) => {
      options.onInitialState?.(data);
    });

    socket.on('stateChanged', (data) => {
      options.onStateChanged?.(data);
    });

    socket.on('deviceConnected', (data) => {
      options.onDeviceConnected?.(data);
    });

    socket.on('deviceDisconnected', (data) => {
      options.onDeviceDisconnected?.(data);
    });

    socketRef.current = socket;
  }, [options]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const subscribe = useCallback((podIds: string[]) => {
    socketRef.current?.emit('subscribe', podIds);
  }, []);

  const unsubscribe = useCallback((podIds: string[]) => {
    socketRef.current?.emit('unsubscribe', podIds);
  }, []);

  const controlPlug = useCallback((podId: string, action: 'on' | 'off' | 'toggle') => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      socketRef.current.emit('control', { podId, action }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...wsState,
    socket: socketRef.current,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    controlPlug
  };
}
```

### 6.3 New Components

#### SmartPlugControl Component

**File: `src/components/smart-plugs/SmartPlugControl.tsx`**

```typescript
import React from 'react';
import { Power, PowerOff, Loader2, AlertCircle } from 'lucide-react';
import { Plug } from '@/lib/piApi';
import { formatDistanceToNow } from 'date-fns';

interface SmartPlugControlProps {
  plug: Plug;
  onToggle: (podId: string, action: 'on' | 'off' | 'toggle') => void;
  isLoading?: boolean;
}

export function SmartPlugControl({ plug, onToggle, isLoading }: SmartPlugControlProps) {
  const isOn = plug.state.isOn;
  const isConnected = plug.connection.isConnected;

  const handleToggle = () => {
    if (isLoading || !isConnected) return;
    onToggle(plug.podId, 'toggle');
  };

  return (
    <div className={`
      p-4 rounded-lg border-2 transition-all duration-200
      ${isOn ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}
      ${!isConnected ? 'opacity-60' : ''}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{plug.name}</h3>
          {!isConnected && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Offline
            </span>
          )}
        </div>
        <button
          onClick={handleToggle}
          disabled={isLoading || !isConnected}
          className={`
            p-3 rounded-full transition-all duration-200
            ${isOn 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
            }
            ${(isLoading || !isConnected) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          `}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isOn ? (
            <Power className="w-5 h-5" />
          ) : (
            <PowerOff className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Status:</span>
          <span className={isOn ? 'text-green-600 font-medium' : 'text-gray-600'}>
            {isOn ? 'ON' : 'OFF'}
          </span>
        </div>

        {plug.hasPowerMonitoring && plug.state.power !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-500">Power:</span>
            <span className="font-medium">{plug.state.power.toFixed(1)} W</span>
          </div>
        )}

        {plug.state.lastSeen && (
          <div className="flex justify-between">
            <span className="text-gray-500">Last seen:</span>
            <span className="text-gray-600">
              {formatDistanceToNow(new Date(plug.state.lastSeen), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### ShopStatusDashboard Component

**File: `src/components/smart-plugs/ShopStatusDashboard.tsx`**

```typescript
import React, { useState, useMemo } from 'react';
import { SmartPlugControl } from './SmartPlugControl';
import { Plug, piApi } from '@/lib/piApi';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Power, PowerOff, RefreshCw, Filter } from 'lucide-react';

type FilterType = 'all' | 'online' | 'offline' | 'active';

interface ShopStatusDashboardProps {
  initialPlugs: Plug[];
}

export function ShopStatusDashboard({ initialPlugs }: ShopStatusDashboardProps) {
  const [plugs, setPlugs] = useState<Plug[]>(initialPlugs);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loadingPlugs, setLoadingPlugs] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const { isConnected, subscribe, controlPlug } = useWebSocket({
    onInitialState: (data) => {
      setPlugs(data.plugs);
    },
    onStateChanged: (data) => {
      setPlugs(prev => prev.map(plug => 
        plug.podId === data.podId 
          ? { ...plug, state: { ...plug.state, ...data.state } }
          : plug
      ));
    },
    onDeviceConnected: (data) => {
      setPlugs(prev => prev.map(plug =>
        plug.podId === data.podId
          ? { ...plug, connection: { ...plug.connection, isConnected: true } }
          : plug
      ));
    },
    onDeviceDisconnected: (data) => {
      setPlugs(prev => prev.map(plug =>
        plug.podId === data.podId
          ? { ...plug, connection: { ...plug.connection, isConnected: false } }
          : plug
      ));
    }
  });

  // Subscribe to all plugs on mount
  React.useEffect(() => {
    subscribe(plugs.map(p => p.podId));
  }, [subscribe, plugs.map(p => p.podId).join(',')]);

  const filteredPlugs = useMemo(() => {
    switch (filter) {
      case 'online':
        return plugs.filter(p => p.connection.isConnected);
      case 'offline':
        return plugs.filter(p => !p.connection.isConnected);
      case 'active':
        return plugs.filter(p => p.state.isOn);
      default:
        return plugs;
    }
  }, [plugs, filter]);

  const stats = useMemo(() => ({
    total: plugs.length,
    online: plugs.filter(p => p.connection.isConnected).length,
    active: plugs.filter(p => p.state.isOn).length,
    offline: plugs.filter(p => !p.connection.isConnected).length
  }), [plugs]);

  const handleToggle = async (podId: string, action: 'on' | 'off' | 'toggle') => {
    setLoadingPlugs(prev => new Set(prev).add(podId));
    
    try {
      await controlPlug(podId, action);
    } catch (error) {
      console.error('Control error:', error);
      // Fallback to HTTP API
      try {
        await piApi.controlPlug(podId, action);
      } catch (httpError) {
        console.error('HTTP fallback error:', httpError);
      }
    } finally {
      setLoadingPlugs(prev => {
        const next = new Set(prev);
        next.delete(podId);
        return next;
      });
    }
  };

  const handleBulkControl = async (action: 'on' | 'off') => {
    setIsBulkLoading(true);
    try {
      const podIds = plugs.map(p => p.podId);
      await piApi.bulkControl(podIds, action);
    } catch (error) {
      console.error('Bulk control error:', error);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const updatedPlugs = await piApi.getAllPlugs();
      setPlugs(updatedPlugs);
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shop Status</h2>
          <p className="text-gray-500">
            {stats.online} online · {stats.active} active · {stats.offline} offline
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`
            flex items-center gap-2 px-3 py-1 rounded-full text-sm
            ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
          `}>
            <div className={`
              w-2 h-2 rounded-full
              ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}
            `} />
            {isConnected ? 'Live' : 'Disconnected'}
          </div>
          
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleBulkControl('on')}
          disabled={isBulkLoading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Power className="w-4 h-4" />
          Turn All On
        </button>
        
        <button
          onClick={() => handleBulkControl('off')}
          disabled={isBulkLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <PowerOff className="w-4 h-4" />
          Turn All Off
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          className="border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Pods ({stats.total})</option>
          <option value="online">Online ({stats.online})</option>
          <option value="offline">Offline ({stats.offline})</option>
          <option value="active">Active ({stats.active})</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPlugs.map(plug => (
          <SmartPlugControl
            key={plug.podId}
            plug={plug}
            onToggle={handleToggle}
            isLoading={loadingPlugs.has(plug.podId)}
          />
        ))}
      </div>

      {filteredPlugs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No pods match the selected filter
        </div>
      )}
    </div>
  );
}
```

### 6.4 Store Updates (Zustand)

**File: `src/stores/smartPlugStore.ts`**

```typescript
import { create } from 'zustand';
import { Plug } from '@/lib/piApi';

interface SmartPlugState {
  plugs: Plug[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setPlugs: (plugs: Plug[]) => void;
  updatePlug: (podId: string, updates: Partial<Plug>) => void;
  updatePlugState: (podId: string, state: Partial<Plug['state']>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Selectors
  getPlugById: (podId: string) => Plug | undefined;
  getOnlinePlugs: () => Plug[];
  getActivePlugs: () => Plug[];
}

export const useSmartPlugStore = create<SmartPlugState>((set, get) => ({
  plugs: [],
  isLoading: false,
  error: null,

  setPlugs: (plugs) => set({ plugs }),

  updatePlug: (podId, updates) => set((state) => ({
    plugs: state.plugs.map(plug =>
      plug.podId === podId ? { ...plug, ...updates } : plug
    )
  })),

  updatePlugState: (podId, stateUpdate) => set((state) => ({
    plugs: state.plugs.map(plug =>
      plug.podId === podId 
        ? { ...plug, state: { ...plug.state, ...stateUpdate } }
        : plug
    )
  })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  getPlugById: (podId) => get().plugs.find(p => p.podId === podId),
  getOnlinePlugs: () => get().plugs.filter(p => p.connection.isConnected),
  getActivePlugs: () => get().plugs.filter(p => p.state.isOn)
}));
```

### 6.5 Session Integration

**File: `src/hooks/useSessionPlugControl.ts`**

```typescript
import { useEffect } from 'react';
import { useSmartPlugStore } from '@/stores/smartPlugStore';
import { piApi } from '@/lib/piApi';
import { useSupabase } from '@/hooks/useSupabase';

interface Session {
  id: string;
  pod_id: string;
  status: 'active' | 'completed' | 'cancelled';
}

export function useSessionPlugControl() {
  const { updatePlugState } = useSmartPlugStore();
  const { supabase } = useSupabase();

  useEffect(() => {
    // Subscribe to session changes
    const subscription = supabase
      .channel('sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        async (payload) => {
          const session = payload.new as Session;
          
          if (payload.eventType === 'INSERT' && session.status === 'active') {
            // Session started - turn on plug
            try {
              await piApi.controlPlug(session.pod_id, 'on');
              updatePlugState(session.pod_id, { isOn: true });
            } catch (error) {
              console.error('Failed to turn on plug for session:', error);
            }
          }
          
          if (payload.eventType === 'UPDATE' && 
              (session.status === 'completed' || session.status === 'cancelled')) {
            // Session ended - turn off plug
            try {
              await piApi.controlPlug(session.pod_id, 'off');
              updatePlugState(session.pod_id, { isOn: false });
            } catch (error) {
              console.error('Failed to turn off plug for session:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, updatePlugState]);
}
```

---

## 7. Security Implementation

### 7.1 Authentication & Authorization

**File: `/opt/gaming-shop/src/middleware/auth.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const API_KEY = process.env.API_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || '';

export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== API_KEY) {
    res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    return;
  }

  next();
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized - No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      return;
    }
    
    next();
  };
}
```

### 7.2 Network Security

**UFW Configuration Script:**

```bash
#!/bin/bash
# /opt/gaming-shop/scripts/setup-firewall.sh

# Reset UFW
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if needed)
sudo ufw allow 22/tcp

# Allow local network access (for Tuya devices)
sudo ufw allow from 192.168.1.0/24 to any port 6668

# Allow HTTP/HTTPS for tunnel
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port (local only)
sudo ufw allow from 127.0.0.1 to any port 3000

# Enable firewall
echo "y" | sudo ufw enable

# Show status
sudo ufw status verbose
```

### 7.3 Data Security

**File: `/opt/gaming-shop/src/utils/encryption.ts`**

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
    iv
  );
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

## 8. Deployment Guide

### 8.1 Raspberry Pi Deployment

**Build and Deploy Script:**

```bash
#!/bin/bash
# /opt/gaming-shop/scripts/deploy.sh

set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /opt/gaming-shop

# Pull latest code (if using git)
# git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Run database migrations
echo "🗄️ Running database migrations..."
sqlite3 data/gaming-shop.db < scripts/migrations.sql || true

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart gaming-shop.service

# Check status
echo "✅ Checking service status..."
sleep 2
sudo systemctl status gaming-shop.service --no-pager

echo "🎉 Deployment complete!"
```

**PM2 Configuration:**

```javascript
// /opt/gaming-shop/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'gaming-shop-gateway',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '512M',
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s',
    watch: false,
    autorestart: true,
    kill_timeout: 5000,
    listen_timeout: 10000
  }]
};
```

### 8.2 Vercel Deployment

**vercel.json:**

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "env": {
    "PI_API_KEY": "@pi-api-key",
    "NEXT_PUBLIC_PI_API_URL": "@pi-api-url",
    "NEXT_PUBLIC_WS_URL": "@ws-url"
  }
}
```

### 8.3 Database Migration

**File: `/opt/gaming-shop/scripts/migrations.sql`**

```sql
-- Migration tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Migration 001: Initial schema
INSERT OR IGNORE INTO migrations (name) VALUES ('001_initial_schema');

-- Migration 002: Add power monitoring
CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO migrations (name) VALUES ('002_add_power_monitoring');

-- Future migrations go here
```

---

## 9. Testing Strategy

### 9.1 Unit Testing

**File: `/opt/gaming-shop/src/__tests__/tuyaService.test.ts`**

```typescript
import { tuyaService } from '../services/tuyaService';
import TuyaDevice from 'tuy-api';

jest.mock('tuy-api');

describe('TuyaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeDevice', () => {
    it('should connect to device successfully', async () => {
      const mockConnect = jest.fn().mockResolvedValue(undefined);
      (TuyaDevice as jest.Mock).mockImplementation(() => ({
        connect: mockConnect,
        on: jest.fn()
      }));

      const result = await tuyaService.initializeDevice({
        podId: 'test-pod',
        deviceId: 'test-device',
        localKey: 'test-key',
        ipAddress: '192.168.1.100'
      });

      expect(result).toBe(true);
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('controlDevice', () => {
    it('should turn device on', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockIsConnected = jest.fn().mockReturnValue(true);
      
      // Setup mock device in service
      (tuyaService as any).devices.set('test-pod', {
        set: mockSet,
        isConnected: mockIsConnected
      });

      await tuyaService.controlDevice('test-pod', 'on');

      expect(mockSet).toHaveBeenCalledWith({ dps: 1, set: true });
    });
  });
});
```

### 9.2 Integration Testing

**File: `/opt/gaming-shop/src/__tests__/api.integration.test.ts`**

```typescript
import request from 'supertest';
import { app } from '../server';
import { initializeDatabase } from '../config/database';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('POST /api/plugs/:podId/control', () => {
    it('should require API key', async () => {
      await request(app)
        .post('/api/plugs/test-pod/control')
        .send({ action: 'on' })
        .expect(401);
    });
  });
});
```

### 9.3 Manual Testing Checklist

```markdown
## Pre-Deployment Testing Checklist

### Device Setup
- [ ] All smart plugs connected to WiFi
- [ ] Device credentials extracted and stored in database
- [ ] Static IPs configured or DHCP reservations set
- [ ] Devices respond to ping from Pi

### Pi Service
- [ ] Service starts automatically on boot
- [ ] All devices connect successfully
- [ ] Health check endpoint returns 200
- [ ] Database is writable

### Remote Access
- [ ] ngrok/Cloudflare tunnel is active
- [ ] HTTPS certificate valid
- [ ] API responds to requests from Vercel
- [ ] WebSocket connections establish successfully

### Frontend Integration
- [ ] Dashboard loads all plug statuses
- [ ] Toggle controls work for all plugs
- [ ] Real-time updates display correctly
- [ ] Bulk control functions properly
- [ ] Error states display correctly

### Session Automation
- [ ] Starting session turns on plug
- [ ] Ending session turns off plug (with delay)
- [ ] Manual override works
- [ ] Logs record all actions correctly

### Security
- [ ] API key authentication working
- [ ] Unauthorized requests rejected
- [ ] Firewall rules active
- [ ] Database permissions correct
```

---

## 10. Monitoring & Maintenance

### 10.1 Health Monitoring

**File: `/opt/gaming-shop/scripts/monitor.sh`**

```bash
#!/bin/bash
# Health monitoring script

WEBHOOK_URL="${ALERT_WEBHOOK_URL}"
PI_URL="http://localhost:3000"

# Check service status
if ! systemctl is-active --quiet gaming-shop.service; then
    echo "Service is down!" | logger
    curl -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"text":"Gaming Shop Gateway service is down!"}'
fi

# Check API health
if ! curl -sf "$PI_URL/api/health" > /dev/null; then
    echo "API health check failed!" | logger
    curl -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"text":"Gaming Shop API health check failed!"}'
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "Disk usage is ${DISK_USAGE}%" | logger
    curl -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"Gaming Shop Pi disk usage is ${DISK_USAGE}%\"}"
fi
```

### 10.2 Backup Strategy

**File: `/opt/gaming-shop/scripts/backup.sh`**

```bash
#!/bin/bash
# Backup script

BACKUP_DIR="/opt/gaming-shop/backups"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="${BACKUP_S3_BUCKET}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
cp /opt/gaming-shop/data/gaming-shop.db "$BACKUP_DIR/db_$DATE.sqlite"

# Backup configuration
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" /opt/gaming-shop/.env /opt/gaming-shop/config/

# Upload to S3 (if configured)
if [ -n "$S3_BUCKET" ]; then
    aws s3 cp "$BACKUP_DIR/db_$DATE.sqlite" "s3://$S3_BUCKET/backups/"
    aws s3 cp "$BACKUP_DIR/config_$DATE.tar.gz" "s3://$S3_BUCKET/backups/"
fi

# Clean up old backups (keep 7 days)
find "$BACKUP_DIR" -name "*.sqlite" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

---

## 11. Troubleshooting Guide

### 11.1 Common Issues

#### Issue: Pi Not Responding

```bash
# Check service status
sudo systemctl status gaming-shop.service

# Check logs
sudo journalctl -u gaming-shop.service -f

# Check if port is listening
sudo netstat -tlnp | grep 3000

# Restart service
sudo systemctl restart gaming-shop.service
```

#### Issue: Smart Plugs Offline

```bash
# Check if plugs are on network
ping 192.168.1.101  # Replace with plug IP

# Check Tuya connection
# Use tuya-cli to test connection
tuya-cli get --ip 192.168.1.101 --id DEVICE_ID --key LOCAL_KEY

# Restart Pi networking
sudo systemctl restart dhcpcd
```

#### Issue: WebSocket Disconnections

```bash
# Check ngrok status
curl http://localhost:4040/api/tunnels

# Restart ngrok
sudo systemctl restart ngrok.service

# Check WebSocket logs
tail -f /opt/gaming-shop/logs/app.log | grep -i websocket
```

### 11.2 Debug Procedures

**Enable Debug Logging:**

```bash
# Edit environment
sudo nano /opt/gaming-shop/.env

# Change log level
LOG_LEVEL=debug

# Restart service
sudo systemctl restart gaming-shop.service

# Watch logs
tail -f /opt/gaming-shop/logs/app.log
```

---

## 12. Cost Analysis

### 12.1 Initial Setup Costs

| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Raspberry Pi 4 (4GB) | 1 | $75 | $75 |
| Official Power Supply | 1 | $12 | $12 |
| Heatsink Case | 1 | $20 | $20 |
| 64GB SD Card | 1 | $12 | $12 |
| Ethernet Cable | 1 | $5 | $5 |
| **Pi Subtotal** | | | **$124** |
| Gosund EP2 Smart Plugs | 10 | $13 | $130 |
| WiFi Router (if needed) | 1 | $60 | $60 |
| **Total Initial** | | | **$314** |

### 12.2 Ongoing Costs

| Item | Monthly Cost | Annual Cost |
|------|--------------|-------------|
| Electricity (Pi) | $2.50 | $30 |
| ngrok Pro (optional) | $8 | $96 |
| Cloudflare (free tier) | $0 | $0 |
| **Total Monthly** | **$2.50-10.50** | **$30-126** |

### 12.3 Scaling Costs

| Pods | Plugs Cost | Total Setup | Monthly |
|------|-----------|-------------|---------|
| 5 | $65 | $249 | $2.50 |
| 10 | $130 | $314 | $2.50 |
| 20 | $260 | $444 | $2.50 |
| 50 | $650 | $834 | $2.50 |

---

## 13. Alternative Architectures Comparison

| Architecture | Pros | Cons | Best For |
|--------------|------|------|----------|
| **Hybrid (This Guide)** | Low latency, cost-effective, local control | Requires hardware, single point of failure | Small-medium shops, budget-conscious |
| **Pure Cloud** | No local hardware, high availability | Higher latency, ongoing costs, complexity | Large chains, enterprise |
| **Full Local** | No internet dependency, maximum privacy | No remote access, manual management | Offline-only setups |
| **Commercial IoT** | Plug-and-play, support included | Expensive per-device, vendor lock-in | Non-technical users |

---

## 14. Implementation Roadmap

### Phase 1: Proof of Concept (Week 1)
- [ ] Order Raspberry Pi and 2 smart plugs
- [ ] Set up Pi with basic OS
- [ ] Install and configure basic service
- [ ] Test local control
- [ ] Document any issues

### Phase 2: MVP (Week 2-3)
- [ ] Implement full Pi service
- [ ] Set up ngrok tunnel
- [ ] Build basic frontend components
- [ ] Connect 5 pods
- [ ] Test remote access
- [ ] Implement session automation

### Phase 3: Production (Week 4)
- [ ] Connect all pods
- [ ] Implement security hardening
- [ ] Set up monitoring
- [ ] Create backup procedures
- [ ] Train staff
- [ ] Document everything

### Phase 4: Optimization (Ongoing)
- [ ] Performance tuning
- [ ] Add power monitoring dashboard
- [ ] Implement predictive maintenance
- [ ] Scale to multiple locations

---

## 15. Code Examples Appendix

### 15.1 Complete Server Implementation

**File: `/opt/gaming-shop/src/server.ts`**

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import dotenv from 'dotenv';

import { initializeDatabase } from './config/database';
import { tuyaService } from './services/tuyaService';
import { healthMonitor } from './services/healthMonitor';
import { initializeWebSocket } from './websocket/socketHandler';
import { logger } from './utils/logger';

import plugRoutes from './routes/plugs';
import healthRoutes from './routes/health';
import webhookRoutes from './routes/webhooks';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routes
app.use('/api/plugs', plugRoutes);
app.use('/api/health', healthRoutes);
app.use('/webhook', webhookRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize services
async function initialize() {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized');

    // Initialize devices
    const { getAllDevices } = await import('./config/database');
    const devices = await getAllDevices();
    
    for (const device of devices) {
      await tuyaService.initializeDevice({
        podId: device.pod_id,
        deviceId: device.device_id,
        localKey: device.local_key,
        ipAddress: device.ip_address
      });
    }
    logger.info(`Initialized ${devices.length} devices`);

    // Initialize WebSocket
    initializeWebSocket(httpServer);
    logger.info('WebSocket server initialized');

    // Start health monitoring
    healthMonitor.start();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to initialize:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  healthMonitor.stop();
  await tuyaService.disconnectAll();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  healthMonitor.stop();
  await tuyaService.disconnectAll();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

initialize();

export { app };
```

### 15.2 Package.json

```json
{
  "name": "gaming-shop-gateway",
  "version": "1.0.0",
  "description": "Smart plug gateway for gaming shop management",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node-dev --respawn src/server.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "deploy": "./scripts/deploy.sh"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "socket.io": "^4.6.1",
    "sqlite3": "^5.1.6",
    "tuy-api": "^7.4.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "eslint": "^8.54.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 15.3 Systemd Service File

```ini
[Unit]
Description=Gaming Shop Smart Plug Gateway
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/gaming-shop
Environment=NODE_ENV=production
EnvironmentFile=/opt/gaming-shop/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=append:/opt/gaming-shop/logs/system.log
StandardError=append:/opt/gaming-shop/logs/error.log

[Install]
WantedBy=multi-user.target
```

---

## Document Information

- **Author:** Development Team
- **Version:** 1.0
- **Last Updated:** February 21, 2026
- **Status:** Production Ready
- **License:** Internal Use Only

## Support

For technical support or questions about this implementation:
1. Check the troubleshooting section
2. Review logs at `/opt/gaming-shop/logs/`
3. Consult the project documentation
4. Contact the development team

---

**END OF DOCUMENT**
