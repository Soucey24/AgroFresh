-- Migration: Update order_status enum to support 12-state order lifecycle
-- This migration updates the order_status enum from old values to the new 12-state workflow
-- Date: 2026-09-01

-- Step 1: Create the new enum type with all 12 states
CREATE TYPE order_status_new AS ENUM (
  'pending_payment',
  'confirmed',
  'farmer_preparing',
  'sent_to_operations_centre',
  'received_at_centre',
  'quality_check',
  'ready_for_dispatch',
  'packed',
  'dispatched',
  'delivered',
  'payout_ready',
  'paid'
);

-- Step 2: Create a mapping function to convert old enum to new enum
-- This handles any existing orders in the old status format
CREATE OR REPLACE FUNCTION convert_order_status(old_status VARCHAR)
RETURNS order_status_new AS $$
BEGIN
  RETURN CASE old_status
    WHEN 'pending' THEN 'pending_payment'::order_status_new
    WHEN 'confirmed' THEN 'confirmed'::order_status_new
    WHEN 'preparing' THEN 'farmer_preparing'::order_status_new
    WHEN 'ready' THEN 'ready_for_dispatch'::order_status_new
    WHEN 'shipped' THEN 'dispatched'::order_status_new
    WHEN 'delivered' THEN 'delivered'::order_status_new
    WHEN 'completed' THEN 'paid'::order_status_new
    WHEN 'paid' THEN 'paid'::order_status_new
    WHEN 'cancelled' THEN 'pending_payment'::order_status_new
    ELSE 'pending_payment'::order_status_new
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: First, drop the old default
ALTER TABLE orders
  ALTER COLUMN status DROP DEFAULT;

-- Step 4: Alter the orders table column type with the conversion
ALTER TABLE orders
  ALTER COLUMN status TYPE order_status_new USING convert_order_status(status::VARCHAR);

-- Step 5: Update column default
ALTER TABLE orders
  ALTER COLUMN status SET DEFAULT 'pending_payment';

-- Step 6: Drop the old enum type
DROP TYPE IF EXISTS order_status;

-- Step 7: Rename the new enum to the original name
ALTER TYPE order_status_new RENAME TO order_status;

-- Step 8: Drop the conversion function (no longer needed)
DROP FUNCTION IF EXISTS convert_order_status(VARCHAR);

-- Verification: Check that the migration was successful
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name='orders' AND column_name='status';
-- SELECT COUNT(*) as total_orders FROM orders;
-- SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY status;
