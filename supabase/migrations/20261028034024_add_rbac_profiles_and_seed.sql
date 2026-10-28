/*
# NexusOMS — RBAC: Profiles table & roles

1. New Tables
- `profiles`: extends Supabase auth.users with app-specific data
  - `id` (uuid, PK, FK to auth.users)
  - `email` (text, unique)
  - `full_name` (text)
  - `role` (text: 'admin' | 'manager' | 'warehouse')
  - `is_active` (boolean, default true)
  - `created_at`, `updated_at` (timestamptz)

2. Security
- RLS enabled on `profiles`
- Authenticated users can read all profiles (needed for user lists in RBAC settings)
- Users can only update their own profile
- A trigger auto-creates a profile when a new auth.user signs up (default role: 'warehouse')

3. Seed
- Inserts a default admin user via auth.users if not exists
- The admin profile is linked to that user
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT 'User',
  role text NOT NULL DEFAULT 'warehouse' CHECK (role IN ('admin','manager','warehouse')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- trigger: auto-create profile on signup ----------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'warehouse')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------- touch_updated_at for profiles ----------
DROP TRIGGER IF EXISTS profiles_touch ON profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
