# Game Shop Management System

A web application for managing a game console rental shop with F1 pit wall inspired design.

![Dashboard Preview](https://via.placeholder.com/800x400/0a0a0f/00d4ff?text=Game+Shop+Management+Dashboard)

## Features

### Core Functionality
- **Pod Canvas Management**: Drag-and-drop canvas layout (1200x800px) with background image support
- **Two View Modes**: Grid view (canvas) and List view (table) with toggle
- **Console Assignment**: Tag pods with specific gaming consoles (PS5, Xbox, Switch, PC)
- **Session Timer**: 30-minute increment timers with manual start/stop
- **Payment Tracking**: Cash payment recording before session starts
- **Real-time Dashboard**: Live view of all pods with status indicators
- **Rental History**: Track and search rentals by customer phone number
- **Audio Notifications**: 5-minute warning and session expired alerts
- **Background Upload**: Upload floor plan/shop layout as canvas background (base64, max 2MB)

### Design
- **F1 Pit Wall Inspired**: Dark theme with neon accents
- **Real-time Updates**: Live timer countdowns and status changes
- **Color-coded Status**: Green (available), Cyan (active), Amber (pending), Red (maintenance)
- **Responsive Layout**: Works on desktop and tablet devices

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Database**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works fine)

### 1. Clone and Install

```bash
cd game-shop-management
npm install
```

### 2. Set Up Supabase

1. Create a new project at [https://app.supabase.com](https://app.supabase.com)
2. Go to SQL Editor and run ALL migration files in order:
    ```bash
    # 1. Initial Schema (001_initial_schema.sql)
    # Creates: users, consoles, pods, sessions, rental_history tables
    
    # 2. Canvas Fields Migration (002_add_canvas_fields.sql)
    # Adds: canvas_x, canvas_y, canvas_width, canvas_height to pods table
    # Removes: unique constraint on row/col
    # Creates: index for canvas position queries
    
    # 3. Canvas Background Migration (003_add_canvas_background.sql)
    # Creates: canvas_settings table for background image storage
    # Adds: background_image, canvas_width, canvas_height fields
    # Inserts: default canvas settings
    # Enables: RLS policies for canvas_settings

    # 4. Tuya Pod Fields (004_add_tuya_fields_to_pods.sql)
    # Adds: tuya_enabled, tuya_device_id, tuya_ip_address, tuya_protocol_version to pods table
    ```
3. Go to Project Settings → API and copy:
    - Project URL
    - anon public API key

### 3. Configure Environment

Create `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Create Admin User

1. Go to Authentication → Users in Supabase dashboard
2. Click "Add user" → "Create new user"
3. Enter email and password
4. Run this SQL in SQL Editor:

```sql
INSERT INTO public.users (id, email, role, name)
VALUES (
  'user-id-from-auth-users-table',
  'admin@yourshop.com',
  'admin',
  'Admin User'
);
```

### 5. Seed Sample Data (Optional)

```sql
-- Add consoles
INSERT INTO public.consoles (name, type, status) VALUES
  ('PlayStation 5 #1', 'ps5', 'available'),
  ('PlayStation 5 #2', 'ps5', 'available'),
  ('Xbox Series X #1', 'xbox', 'available'),
  ('Xbox Series X #2', 'xbox', 'available'),
  ('Nintendo Switch #1', 'switch', 'available'),
  ('Nintendo Switch #2', 'switch', 'available');

-- Add pods (3x3 grid)
INSERT INTO public.pods (name, row, col, status) VALUES
  ('Pod A1', 1, 1, 'available'),
  ('Pod A2', 1, 2, 'available'),
  ('Pod A3', 1, 3, 'available'),
  ('Pod B1', 2, 1, 'available'),
  ('Pod B2', 2, 2, 'available'),
  ('Pod B3', 2, 3, 'available'),
  ('Pod C1', 3, 1, 'available'),
  ('Pod C2', 3, 2, 'available'),
  ('Pod C3', 3, 3, 'available');
```

### 6. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 and log in with your admin credentials.

### 7. Access from Phone on Same Wi-Fi (LAN)

Run Vite with LAN host binding:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

Find your Mac local IP:

```bash
ifconfig | grep "inet "
```

Look for your LAN address (example: `192.168.100.215`), then open on phone:

`http://<YOUR_MAC_IP>:5173`

## Local Tuya Setup (Mac Gateway)

Use this if you want pod sessions to control smart plugs locally.

### 1. Run the local gateway

```bash
cd tools/tuya_local_webapp
python3 -m pip install --upgrade tinytuya
export TUYA_DEVICE_ID="REPLACE_WITH_DEVICE_ID"
export TUYA_IP="REPLACE_WITH_DEVICE_IP"
export TUYA_LOCAL_KEY="REPLACE_WITH_LOCAL_KEY"
export TUYA_VERSION="3.5"
export TUYA_WEB_HOST="0.0.0.0"
export TUYA_WEB_PORT="8787"
python3 app.py
```

Gateway URL on Mac: `http://127.0.0.1:8787`  
Gateway URL from phone/other devices: `http://<YOUR_MAC_IP>:8787`

### 2. Run the app and open Pods page

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

Set frontend gateway URL for LAN in `.env`:

```env
VITE_TUYA_GATEWAY_URL=http://<YOUR_MAC_IP>:8787
```

### 3. Register pods to plugs

In Add/Edit Pod form:
- Enable `Local Tuya Smart Plug`
- Either:
- Pick `Use Existing Registered Plug` (fast clone), or
- Enter `Device ID`, `IP`, `Protocol`, and `Local Key` for manual registration

After save:
- Start session -> plug turns on
- End/cancel session -> plug turns off
- Plug live status appears in pod list/canvas

### 4. Security rules (important)

- Never commit real `TUYA_LOCAL_KEY` values.
- `tools/tuya_local_webapp/pods.json` is git-ignored because it contains local keys.
- TinyTuya dump files (`tinytuya.json`, `devices.json`, `snapshot.json`, `tuya-raw.json`) are git-ignored.
- Keep secrets only in local env vars / local machine config.

### 5. Pre-push safety check

```bash
git status --short
git diff -- .env .env.local tools/tuya_local_webapp/pods.json tinytuya.json devices.json snapshot.json tuya-raw.json
```

These should show no secrets staged for commit.

## Usage Guide

### Dashboard
- View real-time status of all gaming pods
- See active sessions with live countdown timers
- Quick stats: total pods, available, active, pending payment

### Creating a Session
1. Go to Pods page
2. Switch to Grid view or List view
3. Click "New" button on an available pod
4. Enter customer phone number
5. Select duration (30-min increments)
6. Record payment amount
7. Click "Create Session"
8. After payment received, click "Start" to begin timer

### Managing Pod Layout (Grid View)
1. **Drag Pods**: Click and drag pods to reposition on canvas
2. **Resize Pods**: Hover over pod and use size buttons (small/medium/large)
3. **Upload Background**: Click "Upload Background" to add floor plan
4. **Toggle Grid**: Show/hide grid overlay
5. **Edit Pod**: Double-click pod or click settings icon in List view

### Managing Sessions
- **Start**: Begins the countdown timer
- **End**: Stops session and marks as completed
- Timer shows remaining time in mm:ss format
- Audio alerts at 5 minutes remaining and when expired

### Viewing History
1. Go to History page
2. Enter customer phone number
3. View all past rentals with dates, times, and amounts
4. See total amount spent by customer

### Console Management
- Add/edit gaming consoles
- Assign consoles to pods
- Track console status (available, in-use, maintenance)

## Project Structure

```
src/
├── components/
│   ├── layout/         # Layout components (Layout, ProtectedRoute)
│   ├── pods/           # Pod grid and related components
│   └── sessions/       # Session timer and creation modal
├── hooks/              # Custom hooks (useTimer, useAudio)
├── lib/                # Utilities and Supabase client
├── pages/              # Page components
├── store/              # Zustand stores
└── types/              # TypeScript types
```

## Customization

### Pricing
Edit the rate calculation in `CreateSessionModal.tsx`:

```typescript
const calculateAmount = (mins: number) => {
  const rate = 5; // Change this to your rate per 30 minutes
  return ((mins / 30) * rate).toFixed(2);
};
```

### Canvas Size
Modify the canvas dimensions in `CanvasView.tsx`:

```typescript
const CANVAS_WIDTH = 1200;  // Change width
const CANVAS_HEIGHT = 800;  // Change height
```

### Background Image Limits
Modify image constraints in `CanvasView.tsx`:

```typescript
// Max file size (default: 2MB)
if (file.size > 2 * 1024 * 1024) {
  alert('Image must be less than 2MB');
  return;
}

// Max width for resize (default: 1200px)
const scale = Math.min(1, 1200 / img.width);

// JPEG quality (default: 0.8 = 80%)
const base64 = canvas.toDataURL('image/jpeg', 0.8);
```

### Colors
Edit the status colors in `PodGrid.tsx`:

```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'available': return 'border-green-500/50 bg-green-500/5';
    case 'occupied': return 'border-cyan-500/50 bg-cyan-500/5';
    // ...
  }
};
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment

### Option 1: Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Option 2: Netlify
1. Build locally: `npm run build`
2. Drag `dist/` folder to Netlify
3. Or connect GitHub repository

### Option 3: Static Hosting
Upload the `dist/` folder contents to any static hosting service.

## Troubleshooting

### Audio not playing
Audio requires user interaction first. Click anywhere on the page before timers expire.

### Real-time updates not working
Check that Supabase realtime is enabled:
1. Go to Database → Replication
2. Ensure `supabase_realtime` publication includes your tables

### Login issues
- Verify user exists in both `auth.users` and `public.users` tables
- Check that user role is set to 'admin' or 'staff'

## License

MIT License - feel free to use for your own game shop!

## Support

For issues or questions, please check:
1. Supabase documentation: https://supabase.com/docs
2. React documentation: https://react.dev
3. Tailwind CSS documentation: https://tailwindcss.com
