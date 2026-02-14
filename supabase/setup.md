# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Enter project details:
   - Name: `game-shop-management`
   - Database Password: (generate or create strong password)
   - Region: Choose closest to your location
5. Click "Create new project"

## 2. Run Database Migrations

1. Once project is created, go to the SQL Editor
2. Click "New query"
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run"

## 3. Set Up Authentication

1. Go to Authentication → Settings
2. Under "Site URL", enter: `http://localhost:5173` (for development)
3. Enable "Email" provider
4. Optionally disable "Confirm email" for easier testing

## 4. Get API Credentials

1. Go to Project Settings → API
2. Copy the "Project URL" and "anon public" API key
3. Create `.env` file in project root:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 5. Create Initial Admin User

1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password for admin
4. After creation, go to SQL Editor and run:

```sql
INSERT INTO public.users (id, email, role, name)
VALUES (
  'user-id-from-auth-users',
  'admin@example.com',
  'admin',
  'Admin User'
);
```

Replace `'user-id-from-auth-users'` with the actual user ID from the Auth users table.

## 6. Seed Initial Data (Optional)

```sql
-- Insert sample consoles
INSERT INTO public.consoles (name, type, status) VALUES
  ('PlayStation 5 #1', 'ps5', 'available'),
  ('PlayStation 5 #2', 'ps5', 'available'),
  ('Xbox Series X #1', 'xbox', 'available'),
  ('Xbox Series X #2', 'xbox', 'available'),
  ('Nintendo Switch #1', 'switch', 'available'),
  ('Nintendo Switch #2', 'switch', 'available'),
  ('Gaming PC #1', 'pc', 'available'),
  ('Gaming PC #2', 'pc', 'available');

-- Insert sample pods (3x3 grid)
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

## 7. Verify Setup

1. Run the development server: `npm run dev`
2. Open http://localhost:5173
3. Try logging in with the admin credentials

## Troubleshooting

- If realtime updates don't work, check that the tables are added to the `supabase_realtime` publication
- If RLS errors occur, verify policies are created correctly
- For local development issues, check browser console for Supabase connection errors
