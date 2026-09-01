# AgroFresh Complete End-to-End Flow
## From Farmer Crop Listing to Buyer Delivery

### Overview
The complete flow involves 5 main actors and 12 order states representing the buyer → farmer → operations centre workflow.

---

## PHASE 1: FARMER SETUP & CROP LISTING

### 1.1 Farmer Registration & Approval
**Actor:** Farmer User

**Flow:**
1. Farmer signs up via `/auth/register` (email/phone, password)
   - Backend: `authController.registerUser()`
   - Supabase: Inserts into `users` table with `role = 'farmer'`
   - Status: `is_verified = false` initially

2. Admin reviews farmer verification
   - Backend: `verificationController.verifyUser()` or `rejectUserVerification()`
   - On approval: SMS sent with credentials via Arkesel API
   - Status: `is_verified = true`, farmer can now list crops

3. Farmer sets up profile
   - API: `PATCH /api/users/{id}` 
   - Updates: name, bio, location, avatar, phone

**Database Queries Needed:** ✓ Already done on registration

---

### 1.2 Farmer Lists a Crop
**Actor:** Farmer
**Route:** Farmer Dashboard → "Create New Listing"

**Flow:**
1. Farmer fills crop form:
   - Crop name, type (tomato, lettuce, etc.)
   - Quantity, unit (kg, crates, etc.)
   - Price per unit
   - Expiry date
   - Upload crop image(s)

2. POST `/api/crops` (requires farmer role)
   - Backend: `cropController.createCrop()`
   - Supabase: Inserts into `crops` table
   - Fields saved:
     ```
     {
       farmer_id: <farmer.id>,
       name: "Fresh Tomatoes",
       description: "tomato",
       price: 15.00,
       quantity: 100,
       unit: "kg",
       expiry_date: "2026-09-15",
       available: true,
       status: "draft",
       image: "<image_url>",
       created_at: now
     }
     ```
   - ML Service: Generates freshness prediction

3. Crop becomes visible in buyer marketplace
   - Status: `available = true, status = "active"`
   - Appears in `/pages/BuyerDashboard` crop listings

**Database Queries Needed:** ✓ Already done in migrations

---

## PHASE 2: BUYER ORDERING

### 2.1 Buyer Browses & Selects Crop
**Actor:** Buyer
**Route:** Buyer Dashboard → "Browse Crops"

**Flow:**
1. GET `/api/crops?status=active` (public endpoint)
   - Returns all available crops with farmer info
   - Frontend: `src/pages/BuyerDashboard.tsx` displays in card grid

2. Buyer clicks on crop to view details
   - Shows: price, quantity available, farmer profile, reviews

**Database Queries Needed:** ✓ Already done in migrations

---

### 2.2 Buyer Creates Order
**Actor:** Buyer
**Route:** Crop Detail Page → "Order Now"

**Flow:**
1. Buyer enters:
   - Quantity to purchase
   - Delivery method (collection point, home delivery, logistics)
   - Delivery address (if home/business delivery)
   - Full name, phone

2. POST `/api/orders` (requires buyer role)
   - Backend: `orderController.createOrder()`
   - Supabase: Inserts into `orders` table
   - Fields saved:
     ```
     {
       buyer_id: <buyer.id>,
       farmer_id: <crop.farmer_id>,
       crop_id: <crop.id>,
       quantity: 50,
       status: "pending_payment",
       delivery_info: { 
         fullName, phone, address, 
         deliveryMethod: "collection-point"
       },
       created_at: now
     }
     ```

3. Notification sent to farmer
   - Backend: `notifyOrderCreated()`
   - Arkesel SMS: "New order for [crop] from [buyer]"
   - Farmer sees in `/pages/FarmerOrders`

4. Buyer is redirected to payment
   - Frontend: `src/pages/CheckoutPage.tsx`
   - Status: Order is now in `pending_payment` state

**Database Queries Needed:** ✓ Already done in migrations

---

## PHASE 3: PAYMENT

### 3.1 Buyer Makes Payment
**Actor:** Buyer
**Route:** Checkout Page

**Flow:**
1. GET `/api/payments/initialize` (to get Paystack public key)

2. Buyer enters payment details (card, mobile money)
   - Processed via Paystack SDK (client-side)

3. POST `/api/payments` (after Paystack success)
   - Backend: `paymentController.createPayment()`
   - Amount = `quantity * crop.price`
   - Supabase: Inserts into `payments` table
   - Fields saved:
     ```
     {
       order_id: <order.id>,
       buyer_id: <buyer.id>,
       amount: 750.00,
       payment_method: "paystack",
       reference_id: "AGRO-1693123456-ABC123",
       status: "pending",
       metadata: { ... }
     }
     ```

4. Paystack callback webhook → `/webhooks/paystack`
   - Backend: `paymentController.handlePaystackWebhook()`
   - Verifies signature
   - Updates payment: `status = "completed"`
   - **Triggers order status transition:**
     ```
     pending_payment → confirmed
     ```

5. Notifications sent:
   - Arkesel SMS to buyer: "Payment received. Farmer will prepare shipment."
   - Arkesel SMS to farmer: "Order confirmed. Please prepare [quantity] [crop]"

6. Order state: `confirmed`

**Database Queries Needed:** ✓ Already done in migrations

---

## PHASE 4: FARMER FULFILLMENT

### 4.1 Farmer Prepares Shipment
**Actor:** Farmer
**Route:** Farmer Orders → Order Detail Page

**Flow:**
1. Farmer sees order in "Confirmed" filter
   - Frontend: `src/pages/FarmerOrders.tsx`
   - Status shows: `confirmed`

2. Farmer harvests/packs produce

3. Farmer updates order status to `farmer_preparing`
   - PUT `/api/orders/{id}` with `status = "farmer_preparing"`
   - Backend: `orderController.updateOrder()`
   - Validates transition: `confirmed → farmer_preparing` ✓
   - SMS sent to buyer: "Farmer is preparing your order"

4. Farmer updates status to `sent_to_operations_centre`
   - PUT `/api/orders/{id}` with `status = "sent_to_operations_centre"`
   - Validates transition: `farmer_preparing → sent_to_operations_centre` ✓
   - SMS sent to operations: "New shipment received: [order#]"
   - Operations sees order in `/operations/queue` dashboard

**Database Queries Needed:** ✓ Already done in migrations

---

## PHASE 5: OPERATIONS CENTRE PROCESSING

### 5.1 Operations Receives Shipment
**Actor:** Operations Staff
**Route:** Operations Portal → Queue (Intake)

**Flow:**
1. Operations staff logged in with `role = 'operations'`
   - Frontend: `/operations/dashboard` → `/operations/queue`
   - Backend: `requireAuth` middleware validates role

2. Order appears in "Pending Drops" (received_at_centre status)
   - Backend: `OperationsSectionPage.tsx` filters by status

3. Operations clicks order → marks as received
   - PUT `/api/orders/{id}` with `status = "received_at_centre"`
   - Validates transition: `sent_to_operations_centre → received_at_centre` ✓
   - SMS sent to farmer: "Shipment received at centre"

### 5.2 Operations Quality Check
**Actor:** Operations Staff
**Route:** Operations Portal → Quality

**Flow:**
1. Operations staff navigates to `/operations/quality`
   - Filters orders with status `received_at_centre`

2. Staff inspects produce:
   - Checks freshness, quantity, packaging
   - Takes photos/notes

3. Staff updates status to `quality_check`
   - PUT `/api/orders/{id}` with `status = "quality_check"`
   - Validates transition: `received_at_centre → quality_check` ✓

4. Quality check passes → `ready_for_dispatch`
   - PUT `/api/orders/{id}` with `status = "ready_for_dispatch"`
   - Validates transition: `quality_check → ready_for_dispatch` ✓
   - SMS sent to logistics: "Order ready for pickup"

**Database Queries Needed:** ✓ Already done in migrations

---

## PHASE 6: DISPATCH & DELIVERY

### 6.1 Operations Packs & Dispatches
**Actor:** Operations Staff
**Route:** Operations Portal → Dispatch

**Flow:**
1. Staff navigates to `/operations/dispatch`
   - Filters orders with status `ready_for_dispatch`

2. Staff packs order (if not pre-packed)
   - Updates status to `packed`
   - PUT `/api/orders/{id}` with `status = "packed"`
   - Validates transition: `ready_for_dispatch → packed` ✓

3. Staff marks as dispatched
   - PUT `/api/orders/{id}` with `status = "dispatched"`
   - Validates transition: `packed → dispatched` ✓
   - Provides logistics reference (if applicable)
   - SMS sent to buyer: "Your order is on its way! Tracking: [reference]"

### 6.2 Buyer Receives Delivery
**Actor:** Buyer
**Route:** Buyer Orders Page

**Flow:**
1. Order displayed with status `dispatched`
   - Buyer tracks delivery

2. Buyer receives order

3. Buyer or system marks as `delivered`
   - PUT `/api/orders/{id}` with `status = "delivered"`
   - Validates transition: `dispatched → delivered` ✓

**Database Queries Needed:** ✓ Already done in migrations

---

## PHASE 7: PAYOUT TO FARMER

### 7.1 Operations Initiates Payout
**Actor:** Operations Staff OR System
**Route:** Operations Portal → Payouts

**Flow:**
1. Order status: `delivered`

2. Operations staff marks as `payout_ready`
   - PUT `/api/orders/{id}` with `status = "payout_ready"`
   - Validates transition: `delivered → payout_ready` ✓
   - Backend: `createPayoutForOrder()` is called
     - Checks if payment was completed
     - Creates entry in `payouts` table
     - Fields saved:
       ```
       {
         farmer_id: <farmer.id>,
         order_id: <order.id>,
         amount: 750.00,
         status: "pending",
         reference_id: "PO-1693123456-ABC123",
         created_at: now
       }
       ```

2. Payout processing
   - Backend: `payoutController.processPayout()`
   - Integrates with payment provider (if needed)
   - Updates payout status: `pending → paid`

3. Order transitions to `paid`
   - PUT `/api/orders/{id}` with `status = "paid"`
   - Validates transition: `payout_ready → paid` ✓

4. SMS sent to farmer
   - Arkesel: "Payment of GHS [amount] for order #[id] sent to your account"

5. Farmer sees in `/pages/FarmerOrders`
   - Status: `paid`
   - Can filter by "Paid" to see completed orders

**Database Queries Needed:** ✓ Already done in migrations

---

## PHASE 8: COMPLETION & FEEDBACK

### 8.1 Buyer Leaves Review/Complaint
**Actor:** Buyer
**Route:** Buyer Orders → Order Detail

**Flow:**
1. Order status: `paid` or `delivered`

2. Buyer can leave:
   - **Review**: Rating + comment on farmer
     - POST `/api/reviews` 
     - Increases farmer reputation
   - **Complaint**: Issue report + category
     - POST `/api/complaints`
     - Routed to support team

**Database Queries Needed:** ✓ Already done in migrations

---

## DATABASE TABLES REQUIRED

```sql
✓ users          -- Farmer, Buyer, Admin, Operations staff
✓ crops          -- Farmer crop listings
✓ orders         -- Buyer orders linking crops and farmers
✓ payments       -- Payment records via Paystack
✓ payouts        -- Farmer payout records
✓ crops_reviews  -- Buyer reviews on crops/farmers
✓ complaints     -- Buyer complaints
✓ quality_checks -- Operations quality inspection records
✓ notifications  -- SMS/notification logs
✓ crop_types     -- Reference data for crop categories
✓ ai_predictions -- ML model outputs for freshness
✓ image_analysis -- Computer vision analysis results
```

---

## ORDER STATUS STATE MACHINE

```
pending_payment ─→ confirmed ─→ farmer_preparing ─→ sent_to_operations_centre
                                                              ↓
                                                   received_at_centre ─→ quality_check
                                                                            ↓
                                                   ready_for_dispatch ─→ packed ─→ dispatched
                                                                            ↑_________│
                                                                                      ↓
                                                                                  delivered
                                                                                      ↓
                                                                                payout_ready
                                                                                      ↓
                                                                                    paid

Any state can transition to: cancelled
```

---

## KEY API ENDPOINTS

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `PUT /api/auth/change-password` - Change password

### Crops (Farmer)
- `GET /api/crops` - List crops (public, filtered by farmer)
- `POST /api/crops` - Create crop (requires farmer role)
- `PUT /api/crops/{id}` - Update crop (farmer only)
- `DELETE /api/crops/{id}` - Delete crop (farmer only)

### Orders
- `GET /api/orders` - List orders (filtered by role)
- `POST /api/orders` - Create order (requires buyer role)
- `GET /api/orders/{id}` - Get order details
- `PUT /api/orders/{id}` - Update order status (requires operations/admin role)

### Payments
- `GET /api/payments/initialize` - Get Paystack key
- `POST /api/payments` - Create payment
- `POST /webhooks/paystack` - Paystack webhook

### Payouts
- `GET /api/payouts` - List payouts (operations/admin)
- `PUT /api/payouts/{id}` - Update payout status

### Operations
- `GET /api/operations/queue` - Get intake queue
- `GET /api/operations/quality-checks` - Get quality checks
- `GET /api/operations/dispatch` - Get dispatch queue
- `GET /api/operations/payouts` - Get payout queue

### Notifications
- `GET /api/notifications` - User notifications
- `POST /api/notifications/send-sms` - Send SMS (admin)

---

## SMS MESSAGING FLOW

All role transitions and payment events trigger SMS via **Arkesel API**:

1. **Farmer Registration Approved**
   - To: Farmer phone
   - Message: "Welcome to AgroFresh! Your account is verified. Start listing crops now."

2. **New Order Received**
   - To: Farmer phone
   - Message: "New order: 50kg Fresh Tomatoes from John. Price: GHS 750. Confirm?"

3. **Payment Confirmed**
   - To: Buyer phone
   - Message: "Payment received! Your order will be prepared and shipped soon."
   - To: Farmer phone
   - Message: "Order confirmed. Please prepare 50kg Fresh Tomatoes."

4. **Order Shipped**
   - To: Buyer phone
   - Message: "Your order is on its way! Track at: [link]"

5. **Payout Ready**
   - To: Farmer phone
   - Message: "Your payout of GHS 700 is ready. Check your account."

---

## ERROR HANDLING & VALIDATION

1. **Invalid Transitions** - State machine prevents invalid status changes
2. **Authorization** - Middleware checks role before each operation
3. **Validation** - Quantity, price, dates checked on input
4. **Conflict Resolution** - Concurrent updates handled by Supabase
5. **Notifications** - Failures logged and admin alerted

---

## PERFORMANCE CONSIDERATIONS

1. **Crop Listings** - Indexed by status, farmer_id, created_at
2. **Order Lookups** - Indexed by buyer_id, farmer_id, status
3. **Payment Verification** - Cached Paystack responses for 24h
4. **Notification Queue** - SMS sent asynchronously via job queue

---

## End-to-End Example Scenario

**Timeline: Sept 1-5, 2026**

| Date | Time | Actor | Action | Order Status | SMS Sent? |
|------|------|-------|--------|--------------|-----------|
| Sept 1 | 08:00 | Farmer | Lists 100kg tomatoes @ GHS 15/kg | N/A | No |
| Sept 1 | 09:30 | Buyer | Buys 50kg for GHS 750 | pending_payment | No |
| Sept 1 | 09:35 | Buyer | Pays via Paystack | confirmed | ✓ SMS to farmer |
| Sept 1 | 10:00 | Farmer | Starts packing | farmer_preparing | ✓ SMS to buyer |
| Sept 1 | 14:00 | Farmer | Ships to operations | sent_to_operations_centre | ✓ SMS to ops |
| Sept 2 | 08:00 | Operations | Receives shipment | received_at_centre | ✓ SMS to farmer |
| Sept 2 | 09:00 | Operations | Quality check passed | quality_check | No |
| Sept 2 | 09:30 | Operations | Dispatches to logistics | dispatched | ✓ SMS to buyer |
| Sept 4 | 15:00 | Buyer | Receives order | delivered | ✓ SMS to farmer |
| Sept 4 | 16:00 | Operations | Initiates payout | payout_ready | No |
| Sept 5 | 09:00 | Operations | Payout processed | paid | ✓ SMS to farmer |

**Farmer receives:** GHS 700 (GHS 750 - 5% AgroFresh fee)
**Buyer receives:** 50kg fresh tomatoes
**AgroFresh fee:** GHS 50

---

## Database Queries Summary

**No additional queries are needed.** All tables are created via `DATABASE_MIGRATIONS.sql` and the flow uses existing Supabase tables:
- `users` (farmer, buyer, admin, operations)
- `crops` (farmer listings)
- `orders` (buyer orders)
- `payments` (Paystack payments)
- `payouts` (farmer payouts)
- `crops_reviews` (buyer feedback)
- `complaints` (support tickets)
- `quality_checks` (operations inspections)
- `notifications` (SMS/email logs)

**Status:** ✓ All queries integrated into controller methods
