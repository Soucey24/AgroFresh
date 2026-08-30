# Order State Machine Reference

## State Diagram

```
                        ┌──────────────────────┐
                        │      PENDING         │
                        │  (Order created)     │
                        └──────────────────────┘
                                  │
                          [Farmer drops at collection point]
                                  ▼
                        ┌──────────────────────┐
                        │     CONFIRMED       │
                        │  (Received at centre) │
                        └──────────────────────┘
                                  │
                          [Operations starts quality check]
                                  ▼
                        ┌──────────────────────┐
                        │     PREPARING       │
                        │  (Quality check in   │
                        │   progress)          │
                        └──────────────────────┘
                                  │
                          [Quality standards met]
                                  ▼
                        ┌──────────────────────┐
                        │       READY         │
                        │  (Packed, ready to  │
                        │   ship)              │
                        └──────────────────────┘
                                  │
                          [Loaded for delivery]
                                  ▼
                        ┌──────────────────────┐
                        │      SHIPPED        │
                        │  (In transit to     │
                        │   buyer)             │
                        └──────────────────────┘
                                  │
                          [Delivery confirmed]
                                  ▼
                        ┌──────────────────────┐
                        │     DELIVERED       │
                        │                      │
                        │  🔔 AUTO-CREATES     │
                        │  PAYOUT (pending)   │
                        └──────────────────────┘
                                  │
                          [Order completion]
                                  ▼
                        ┌──────────────────────┐
                        │     COMPLETED      │
                        │  (Final state)       │
                        └──────────────────────┘
```

## State Transition Rules

| Current State | Valid Next States | Triggered By | Notes |
|---|---|---|---|
| `pending` | `confirmed`, `cancelled` | Operations staff receive goods | Buyer paid, farmer ready |
| `confirmed` | `preparing`, `cancelled` | Operations start quality check | Intake verified |
| `preparing` | `ready`, `cancelled` | Quality check complete | Grading/sorting done |
| `ready` | `shipped`, `cancelled` | Operations load for delivery | Packed and ready |
| `shipped` | `delivered`, `cancelled` | Delivery confirmed | In transit |
| `delivered` | `completed` | Auto-transition | **Payout created here** ✨ |
| `completed` | (none) | Final state | Order fulfilled |
| `cancelled` | (none) | At any point | Unused orders restored |

## Automatic Actions

### On Status Change to `delivered`:
```javascript
1. Check if payment is completed for order
2. Check if payout already exists (prevent duplicates)
3. Create new payout with:
   - Amount from payment total
   - Status: pending (awaiting admin approval)
   - Reference ID for tracking
4. Send notification to farmer
```

### On Payout Approval:
```javascript
1. Admin reviews pending payout
2. Clicks "Approve & process"
3. Payout status → processing → paid
4. Farmer receives payment via configured method
5. Farmer notified of payment received
```

## Role Access Control

| Role | Can Transition | Can Create | Can Approve |
|---|---|---|---|
| Farmer | ❌ No | Orders | Payouts (their own) |
| Buyer | ❌ No | Orders | - |
| Operations | ✅ Yes | - | - |
| Admin | ✅ Yes | - | ✅ Payouts |

## Key Implementation Details

### Backend Validation
- File: `backend/controllers/orderController.js`
- Constants:
  - `STATE_TRANSITIONS`: Valid transition map
  - `canTransitionOrder()`: Role check
  - `isValidTransition()`: State validation
  - `createPayoutForOrder()`: Auto-payout logic

### Frontend Integration
- File: `src/pages/admin/Operations.tsx`
- Components:
  - Collection point queue (pending/confirmed)
  - Quality & packing board (preparing/ready)
  - Dispatch board (shipped/delivered)
  - Payout approval queue (pending payouts)

### Database Schema
- Table: `orders`
  - Column: `status` (ENUM with all states)
  - Column: `updated_at` (tracks transitions)
  
- Table: `payouts`
  - Column: `status` (pending/processing/paid)
  - Column: `order_id` (links to order)
  - Trigger: Auto-created when order.status = 'delivered'

## Testing Checklist

- [ ] Order transitions follow state machine
- [ ] Invalid transitions are rejected
- [ ] Only operations/admin can transition
- [ ] Payout creates automatically on delivery
- [ ] Notifications sent on each transition
- [ ] Stock is restored on cancellation
- [ ] Payment status verified before payout
- [ ] Duplicate payouts prevented
- [ ] Admin can approve/process payouts
- [ ] Farmer receives payment notifications

## Error Scenarios

| Scenario | Current Behavior | Expected Behavior |
|---|---|---|
| Unauthorized transition attempt | 403 Forbidden | ✅ Correct |
| Invalid state transition | 400 Bad Request | ✅ Correct |
| Payout without payment | Payout not created | ✅ Correct |
| Duplicate payout | Prevented | ✅ Correct |
| Missing payout fields | Error logged | ✅ Correct |

---

**Implementation Date**: 2026-08-29  
**Backend File**: `backend/controllers/orderController.js` (lines 1-120)  
**Frontend File**: `src/pages/admin/Operations.tsx`  
**API Endpoint**: `PUT /api/orders/:id`
