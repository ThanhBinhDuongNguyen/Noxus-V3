/*
# P0-5: Webhook Idempotency + Return Stock on Cancellation

## Problems
1. webhook_delivery_logs has no idempotency key — duplicate webhooks can be
   inserted without detection. Added idempotency_key column with UNIQUE constraint.
2. stock_transactions.tenant_id had hardcoded default (already fixed in P0-2,
   but double-check no other tables have this issue).
3. return_requests has no return_items table — partial returns not tracked at
   item level. Adding return_items table for item-level partial returns.

## Fix
1. Add idempotency_key to webhook_delivery_logs with UNIQUE constraint.
2. Create return_items table for partial return tracking.
3. Drop hardcoded default on webhook_delivery_logs.tenant_id if present.
*/

-- 1. Webhook idempotency
ALTER TABLE public.webhook_delivery_logs
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_delivery_logs_idempotency_key_idx
  ON public.webhook_delivery_logs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Drop hardcoded default if it exists
ALTER TABLE public.webhook_delivery_logs ALTER COLUMN tenant_id DROP DEFAULT;

-- 2. Return items for partial return tracking
CREATE TABLE IF NOT EXISTS public.return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id uuid NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id uuid,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  refund_amount numeric NOT NULL DEFAULT 0,
  condition_received text DEFAULT 'pending_inspection',
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid
);

ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_items TO authenticated;

DROP POLICY IF EXISTS "return_items_select" ON public.return_items;
CREATE POLICY "return_items_select" ON public.return_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "return_items_insert" ON public.return_items;
CREATE POLICY "return_items_insert" ON public.return_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "return_items_update" ON public.return_items;
CREATE POLICY "return_items_update" ON public.return_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "return_items_delete" ON public.return_items;
CREATE POLICY "return_items_delete" ON public.return_items FOR DELETE
  TO authenticated USING (true);

-- Drop default from return_items.tenant_id if it was inherited
ALTER TABLE public.return_items ALTER COLUMN tenant_id DROP DEFAULT;
