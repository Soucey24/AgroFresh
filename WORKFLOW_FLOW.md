# AgroFresh Complete Workflow Flow

## Farmer → Buyer → Operations → Delivery

### Phase 1: Farmer Lists Crop
1. **Farmer Dashboard** - Click "List New Crop"
2. **Create Crop Form** - Fill:
   - Crop type (tomato, lettuce, etc.)
   - Quantity & unit
   - Price per unit
   - Expiry date
   - Images
3. **Database State** - Crop created with status `active`

### Phase 2: Buyer Discovers & Orders
1. **Buyer Marketplace** - Browsed crops
2. **Select Crop** - Click crop, review details
3. **Create Order** - Quantity, delivery method, address
4. **Payment** - Pay via Paystack/Stripe
5. **Order Status** - `pending_payment` → `confirmed`
6. **Database State** - Order created with:
   - `buyer_id` = buyer
   - `farmer_id` = farmer
   - `crop_id` = crop
   - `status` = confirmed
   - `delivery_info` = address, method, contact

### Phase 3: Farmer Fulfillment
1. **Farmer Portal** - Orders tab shows `confirmed` order
2. **Prepare Shipment** - Select order, mark `farmer_preparing`
3. **Send to Centre** - Click "Send to operations centre"
   - Status → `sent_to_operations_centre`
   - Backend creates notification for operations
4. **Database State** - Order status updated

### Phase 4: Operations Centre - Intake
1. **Operations Dashboard** - Queue tab shows new orders
2. **View Pending Drops** - `sent_to_operations_centre` orders
3. **Receive at Centre** - Click order, mark `received_at_centre`
4. **Database State** - Operations intake logged

### Phase 5: Operations Centre - Quality Check
1. **Operations Quality Tab** - Shows `received_at_centre` orders
2. **Inspect Produce** - Check freshness, damage, weight
3. **Quality Check Result**:
   - ✅ Pass → Status `quality_check` → ready for packing
   - ❌ Fail → Status `cancelled` + Complaint + Refund
4. **Database State** - Quality check recorded

### Phase 6: Operations Centre - Packing & Dispatch
1. **Operations Queue Tab** - Shows `quality_check` orders ready to pack
2. **Pack Order** - Prepare for shipment
   - Status → `ready_for_dispatch` → `packed`
3. **Dispatch Order** - Assign to delivery partner
   - Status → `dispatched`
   - SMS sent to buyer with tracking
4. **Database State** - Dispatch info stored

### Phase 7: Buyer Receives
1. **Buyer Portal** - Order status shows `dispatched`
2. **Receive Delivery** - Delivery partner marks delivered
   - Status → `delivered`
   - SMS confirmation to buyer
3. **Review & Complaint Option** - Buyer can:
   - Leave star review for farmer
   - File complaint if issue
4. **Database State** - Delivery confirmed

### Phase 8: Payout Processing
1. **Operations Payouts Tab** - Shows `delivered` orders ready for payout
2. **Calculate Payout** - Deduct:
   - Operations centre commission (e.g., 10%)
   - Platform fee (e.g., 5%)
   - Payment processing fee
3. **Create Payout Record**:
   - Status → `payout_ready`
   - Amount calculated
   - Farmer bank details retrieved
4. **Process Payout**:
   - Status → `paid`
   - SMS to farmer with amount & date
5. **Database State** - Payout record and payment created

## Order Status Lifecycle

```
pending_payment
    ↓
confirmed (farmer can now see order)
    ↓
farmer_preparing (farmer preparing shipment)
    ↓
sent_to_operations_centre (sent by farmer)
    ↓
received_at_centre (received by operations)
    ↓
quality_check (operations inspecting)
    ├─ PASS →
    │   ↓
    │   ready_for_dispatch
    │   ↓
    │   packed
    │   ↓
    │   dispatched
    │   ↓
    │   delivered (buyer received)
    │   ↓
    │   payout_ready (awaiting payout processing)
    │   ↓
    │   paid (farmer paid, order complete)
    │
    └─ FAIL →
        ↓
        cancelled (refund issued)
```

## Database Queries Needed

### Check Farmer Crops
```sql
SELECT * FROM crops WHERE farmer_id = ? AND status = 'active' LIMIT 10;
```

### Check Buyer Orders
```sql
SELECT o.*, c.name as crop_name, u.name as farmer_name 
FROM orders o
JOIN crops c ON o.crop_id = c.id
JOIN users u ON o.farmer_id = u.id
WHERE o.buyer_id = ? AND o.status NOT IN ('cancelled', 'paid')
ORDER BY o.created_at DESC;
```

### Check Operations Queue
```sql
SELECT o.*, c.name as crop_name, u.name as farmer_name 
FROM orders o
JOIN crops c ON o.crop_id = c.id
JOIN users u ON o.farmer_id = u.id
WHERE o.status IN ('received_at_centre', 'quality_check', 'ready_for_dispatch', 'packed', 'dispatched')
ORDER BY o.created_at ASC;
```

### Check Farmer Payouts
```sql
SELECT * FROM payouts WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 20;
```

## Test Flow Checklist
- [ ] Create farmer account & verify role
- [ ] Farmer lists crop (tomato, 50 units, GHS 2.00/unit)
- [ ] Create buyer account & verify role
- [ ] Buyer finds & purchases crop (10 units = GHS 20.00)
- [ ] Farmer sees order as `confirmed`
- [ ] Farmer marks as `farmer_preparing`
- [ ] Farmer sends to centre → `sent_to_operations_centre`
- [ ] Operations sees in queue
- [ ] Operations marks as `received_at_centre`
- [ ] Operations does quality check → `quality_check`
- [ ] Operations passes check → `ready_for_dispatch`
- [ ] Operations packs → `packed`
- [ ] Operations dispatches → `dispatched` (SMS to buyer)
- [ ] Buyer receives → `delivered`
- [ ] Payout created → `payout_ready`
- [ ] Payout processed → `paid` (SMS to farmer)
- [ ] Verify SMS notifications sent to both parties
