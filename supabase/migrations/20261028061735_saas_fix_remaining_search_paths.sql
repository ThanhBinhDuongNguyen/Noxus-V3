/*
# Fix remaining search_path warnings + handle_new_user

- Set search_path on all sequence generator functions and trigger functions
- Revoke EXECUTE on handle_new_user from authenticated (it's a trigger, not RPC)
- Fix touch_updated_at search_path
*/

-- Fix search_path on sequence generators
ALTER FUNCTION next_order_number() SET search_path = public;
ALTER FUNCTION next_po_number() SET search_path = public;
ALTER FUNCTION next_transfer_number() SET search_path = public;
ALTER FUNCTION next_journal_entry_number() SET search_path = public;
ALTER FUNCTION next_return_number() SET search_path = public;
ALTER FUNCTION next_wave_code() SET search_path = public;

-- Fix trigger function search_path
ALTER FUNCTION touch_updated_at() SET search_path = public;

-- handle_new_user is a trigger function (SECURITY DEFINER), not meant to be called via RPC
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
