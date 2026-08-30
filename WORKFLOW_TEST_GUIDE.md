# Complete Order Workflow Test Guide

## Overview
This document provides a step-by-step guide to test the complete order fulfillment workflow in Agrofresh, from buyer purchase through farmer payout.

## System Roles
- **Buyer**: Places orders and makes payments
- **Farmer**: Lists crops, receives payment for delivered orders
- **Operations**: Manages collection point intake, quality checks, and dispatch
- **Admin**: Creates operations staff, approves payouts

## Workflow States
```
Order States:
pending → confirmed → preparing → ready → shipped → delivered → completed

Parallel Process (triggered on delivery):
delivered → Automatic payout creation (pending) → Admin approval → processed
```

## Step-by-Step Test Workflow

### Phase 1: Setup (Admin)
1. **Create Operations Staff**
   - Navigate to: Admin Dashboard → Operations
   - Create at least 1 operations staff member
   - Example: Name: "John Ops", Email: "ops@agrofresh.local", Role: operations

### Phase 2: Farmer Listing (Farmer)
1. **Login as Farmer**
   - Use farmer credentials
   - Navigate to: Add Product / Farmer Dashboard

2. **List a Crop**
   - Product: Tomatoes
   - Quantity: 50 units
   - Price: GHS 2.50/unit
   - Unit: crates
   - Total Value: GHS 125.00
   - Upload an image
   - Submit (status: pending)

3. **Crop Gets Approved**
   - Admin reviews and approves in Admin Dashboard
   - Crop becomes available for buyers

### Phase 3: Buyer Order (Buyer)
1. **Login as Buyer**
   - Navigate to: Buyers Page

2. **Browse and Select Crop**
   - Find the tomatoes listing
   - Click on crop card
   - View details: quantity available, price per unit

3. **Create Order**
   - Select quantity: 20 units
   - Submit order
   - Status: `pending`
   - Expected total: GHS 50.00 (20 × 2.50)

4. **Payment**
   - Proceed to checkout
   - Complete payment via Paystack
   - Order status transitions to: `paid`
   - Farmer is notified

### Phase 4: Farmer Fulfillment (Farmer)
1. **Farmer Receives Order Notification**
   - Check Orders/Dashboard
   - See order #N with 20 units required
   - Status: `paid`

2. **Farmer Brings Stock to Collection Point**
   - In real workflow: Farmer physically brings 20 crates to collection point
   - In this test: Farmer marks order as "ready to pick up" (manual step, no UI change)

### Phase 5: Operations Intake (Operations Staff)
1. **Login as Operations Staff**
   - Navigate to: Admin Dashboard → Operations

2. **Intake Queue**
   - See order #N in "Collection point queue"
   - Status: `paid`
   - Click: "Received at centre"
   - Order status transitions to: `confirmed`

3. **Verify Stock**
   - Inspect the 20 crates
   - Count and verify quantity received

### Phase 6: Quality Check (Operations Staff)
1. **Quality & Packing Board**
   - See order #N (after manually triggering quality check)
   - Status should move to: `preparing` (manual transition needed for test)
   
   *Note: Current UI shows manual button transitions. In production, there would be a quality check form*

2. **Grade/Inspect**
   - Click: "Quality passed"
   - Order status transitions to: `ready`
   - Crop is now packed and ready for dispatch

### Phase 7: Dispatch (Operations Staff)
1. **Dispatch Board**
   - See order #N in "Dispatch board"
   - Status: `ready`

2. **Mark Shipped**
   - Click: "Mark shipped"
   - Order status transitions to: `shipped`
   - Buyer is notified of shipment

3. **Mark Delivered**
   - Click: "Mark delivered"
   - Order status transitions to: `delivered`
   - **Automatic Action**: Payout is created with status `pending`

### Phase 8: Payout (Admin)
1. **Navigate to Payout Approval Queue**
   - Admin Dashboard → Operations → "Payout approval queue"
   - See payout #N for farmer
   - Amount: GHS 50.00 (for 20 units × GHS 2.50)
   - Status: `pending`

2. **Approve Payout**
   - Click: "Approve & process"
   - Payout status transitions to: `processing` → `paid`
   - Farmer receives payment via their configured method

3. **Farmer Payout Notification**
   - Farmer receives notification: "Payout processed"
   - Check their payout history for confirmation

## Expected Outcomes

### Order Timeline
```
Order #N Timeline:
- T0: Buyer places order → Status: pending
- T1: Payment completed → Status: paid
- T2: Operations receives at centre → Status: confirmed
- T3: Quality check initiated → Status: preparing
- T4: Quality approved → Status: ready
- T5: Marked for shipment → Status: shipped
- T6: Delivery confirmed → Status: delivered
  └─ Payout automatically created (pending)
- T7: Admin approves payout → Status: completed (order)
       Payout processed → Status: paid
```

### Key Metrics
- **Order completion time**: From paid → delivered (should be < 1 day in real operations)
- **Payout processing time**: From delivery → approval (depends on manual admin review)
- **Stock reconciliation**: 50 units listed → 20 units ordered → 30 units remaining

## API Endpoints Used

### Order Transitions
```
PUT /api/orders/:id
{
  "status": "confirmed|preparing|ready|shipped|delivered"
}
```

### Payout Creation (Automatic)
Triggered when order status changes to `delivered`
```
POST /api/payouts (automatic)
{
  "order_id": N,
  "farmer_id": X,
  "amount": 50.00,
  "status": "pending"
}
```

### Payout Approval
```
PATCH /api/payouts/:id
{
  "status": "processing|paid"
}
```

## Current Implementation Notes

### What's Implemented
✅ Order state machine with valid transitions
✅ Auto-payout creation on delivery
✅ Operations dashboard with intake, quality, and dispatch boards
✅ Payout approval queue in admin operations panel
✅ Backend validation of state transitions
✅ Role-based access control (operations/admin only)

### What Needs Additional Setup
- [ ] Payment integration verification (Paystack configured)
- [ ] SMS/Email notifications for status changes
- [ ] Payout provider integration (actual fund transfer)
- [ ] Delivery tracking with external service
- [ ] Operations staff login and authentication

### Test Data Requirements
```
1 Farmer account
1 Buyer account
1 Operations account
1 Crop listing (50 units)
1 Order (20 units)
1 Payment (Paystack integration needed)
```

## Troubleshooting

### Order not transitioning
- Ensure logged-in user has operations or admin role
- Check state transition rules (see STATE_TRANSITIONS in orderController.js)
- Verify order current status

### Payout not appearing
- Ensure order reached `delivered` status
- Check if payment with status `completed` exists for order
- Check browser console for error messages

### Payment failing
- Verify Paystack keys in backend/.env
- Ensure Paystack account is in test mode with test cards
- Check Paystack dashboard for transaction logs

## Next Steps

1. **Run this workflow end-to-end**
2. **Document any issues or state transition failures**
3. **Validate payout creation on delivery**
4. **Test with multiple orders in parallel**
5. **Verify notifications are sent at each state**

---

**Last Updated**: 2026-08-29
**Status**: Ready for testing
