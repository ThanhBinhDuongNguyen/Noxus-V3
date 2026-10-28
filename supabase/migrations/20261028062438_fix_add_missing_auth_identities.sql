/*
# Fix: Add missing auth.identities rows for demo accounts

## Problem
All 3 demo accounts were inserted directly into auth.users (bypassing
the Supabase Auth API), so they never got a row in auth.identities.
Supabase Auth requires an identity row for password-based login — without
it, signInWithPassword fails with "Database error querying schema".

## Fix
Insert an 'email' provider identity for each user that doesn't have one.
The email column is generated, so we don't insert it directly.
*/

DO $$
DECLARE
  u record;
BEGIN
  FOR u IN SELECT id, email FROM auth.users WHERE id NOT IN (SELECT user_id FROM auth.identities) LOOP
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      u.id,
      jsonb_build_object('sub', u.id, 'email', u.email),
      'email',
      now(),
      now()
    );
  END LOOP;
END $$;
