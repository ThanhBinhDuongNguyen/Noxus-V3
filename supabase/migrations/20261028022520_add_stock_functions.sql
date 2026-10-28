/*
# Add stock decrement function

1. New Functions
- `decrement_stock(p_product_id uuid, p_qty integer)`: atomically decrements product stock
  by p_qty, only if enough stock exists. Returns the new stock level.

2. Security
- EXECUTE granted to anon + authenticated (single-tenant app calls from frontend).
*/

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_qty integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_stock integer;
BEGIN
  UPDATE products
    SET stock = GREATEST(stock - p_qty, 0)
    WHERE id = p_product_id
    RETURNING stock INTO new_stock;
  RETURN new_stock;
END;
$$;

REVOKE EXECUTE ON FUNCTION decrement_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrement_stock(uuid, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION restore_stock(p_product_id uuid, p_qty integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_stock integer;
BEGIN
  UPDATE products
    SET stock = stock + p_qty
    WHERE id = p_product_id
    RETURNING stock INTO new_stock;
  RETURN new_stock;
END;
$$;

REVOKE EXECUTE ON FUNCTION restore_stock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION restore_stock(uuid, integer) TO anon, authenticated;
