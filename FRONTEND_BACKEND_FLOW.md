# Frontend vs Backend: Data Flow Comparison

## Problem: "GH₵ 0.10" Price & "Failed to create order"

The checkout shows an extremely low price (0.10), and then order creation fails. This document traces what's being sent and expected at each step.

---

## FLOW STEP 1: Browsing & Adding to Cart

### Frontend (Buyers.tsx)
**What happens:**
1. `listCrops()` API call fetches all crops
2. User sees crops displayed with prices from the API
3. User clicks "Add to Cart" for a crop

**What gets stored in localStorage:**
```javascript
// In Buyers.tsx -> addToCart()
const cart = [
  {
    crop: {
      id: "123",
      name: "Fresh Tomatoes",
      price: 15.00,              // ← This is the key value!
      quantity: 100,
      unit: "kg",
      farmer: "John Doe",
      farmerBio: "...",
      // ... other fields
    },
    quantity: 5                  // User-selected quantity
  }
];

localStorage.setItem(getCartStorageKey(user), JSON.stringify(cart));
```

### Backend (cropController.js listCrops)
**What the API returns:**

```javascript
// Backend returns transformed crops
GET /api/crops

Response:
[
  {
    id: 123,
    name: "Fresh Tomatoes",
    price: 15.00,           // ← parseFloat(crop.price) from database
    quantity: 100,
    unit: "kg",
    farmer: "John Doe",
    farmerBio: "John's farm",
    location: "Accra",
    expiryDate: "2026-09-15",
    // ... other fields
  }
]
```

**🔴 ISSUE #1: Low Price in Database**

If the crops in your database have `price = 0.01` or similar, that's why you're seeing 0.10 total.

**Check this:**
```sql
-- Run in Supabase SQL Editor
SELECT id, name, price, quantity FROM crops LIMIT 10;
```

---

## FLOW STEP 2: Checkout Page Calculation

### Frontend (Checkout.tsx)
**What happens:**
1. Load cart from localStorage
2. Extract cart items

```javascript
// From localStorage
const storedCart = localStorage.getItem(getCartStorageKey(user));
const parsed = JSON.parse(storedCart);

// Transform to cartItems
const cartItems = parsed.map((item: any) => ({
  id: item.crop.id,           // "123"
  name: item.crop.name,       // "Fresh Tomatoes"
  price: item.crop.price,     // 15.00 (or 0.01 if problem!)
  quantity: item.quantity,    // 5
  unit: item.crop.unit,       // "kg"
  farmer: item.crop.farmer    // "John Doe"
}));

// Calculate subtotal
const subtotal = cartItems.reduce((total, item) => 
  total + (item.price * item.quantity), 0
);
// If price = 0.02 and quantity = 5, subtotal = 0.10 ❌
```

3. Display in UI:
```
Item: Fresh Tomatoes
  Price: GH₵ 0.10
  Quantity: 5
  Subtotal: GH₵ 0.50

Total: GH₵ 0.50

[Proceed to Payment - GH₵ 0.50]
```

---

## FLOW STEP 3: Creating Order

### Frontend (Checkout.tsx -> handleProceedToPayment)
**What gets sent to backend:**

```javascript
// For each item in cartItems:
const orderPayload = {
  crop_id: "123",                    // ← String or Number?
  quantity: 5,                       // ← Integer
  delivery_info: {                   // ← Full delivery object
    fullName: "John Acheampong",
    phone: "+233201234567",
    address: "123 Accra Street",
    pickupLocation: "Farm gate",
    specialInstructions: "Handle carefully",
    preferredTime: "morning",
    deliveryMethod: "pickup",        // ← Normalized
    deliveryService: "pickup"
  },
  deliveryMethod: "pickup",          // ← Also sent here
  delivery_address: "Farm gate"      // ← Also sent here
};

// POST /api/orders
await fetch(`${API_BASE}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(orderPayload)
});
```

### Backend (orderController.js -> createOrder)
**What it expects:**

```javascript
export const createOrder = async (req, res) => {
  const {
    crop_id,          // ← Must exist and be valid
    quantity,         // ← Must be positive integer
    delivery_info,    // ← Optional, parsed if string
    deliveryMethod,   // ← Optional
    delivery_method,  // ← Optional (alternative name)
    delivery_address  // ← Optional
  } = req.body;
  
  const buyer_id = req.session.user?.id; // ← Requires authentication!
  
  // Validation checks:
  if (!crop_id) {
    return handleError(res, 400, 'Please select a crop to order');
  }
  if (!quantity) {
    return handleError(res, 400, 'Please enter the quantity');
  }
  if (!buyer_id) {
    return handleError(res, 401, 'You must be logged in to place an order');
  }
  
  // Type validation
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    return handleError(res, 400, 'Quantity must be a whole number greater than 0');
  }
  
  // Fetch crop to verify it exists
  const { data: crop, error: cropError } = await supabase
    .from('crops')
    .select('id, farmer_id, quantity, available, users!crops_farmer_id_fkey(id, role)')
    .eq('id', crop_id)
    .single();
  
  if (cropError?.code === 'PGRST116') {
    return handleError(res, 404, 'This crop is no longer available');
  }
  
  // Check farmer is approved
  const farmerApproved = await isFarmerApproved(crop.farmer_id);
  if (!farmerApproved) {
    return handleError(res, 403, 
      'This farmer is not yet approved to sell. Please try another farmer.');
  }
  
  // Check availability
  if (!crop.available || crop.quantity < qty) {
    return handleError(res, 400, 
      `Only ${crop.quantity} items available. Please reduce your quantity.`);
  }
  
  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      buyer_id,                    // ← From session
      farmer_id: crop.farmer_id,   // ← From crop
      crop_id,
      quantity: qty,
      delivery_info: {...},        // ← Parsed delivery
      delivery_address: ...,
      delivery_service: ...,
      delivery_status: 'pending',
      status: 'pending_payment'    // ← Initial status
    }])
    .select()
    .single();
};
```

**🔴 ISSUE #2: Farmer Not Approved**

Most likely cause of "Failed to create order":
```
Error: "This farmer is not yet approved to sell. Please try another farmer."
```

This happens when:
1. Farmer account exists but hasn't been verified by admin
2. Verification status in `user_verifications` table ≠ 'approved'

---

## FLOW STEP 4: Payment

### Frontend (PaymentModal.tsx)
**What gets sent:**

```javascript
const paymentData = {
  order_id: 123,                    // ← From checkout
  amount: 0.50,                     // ← subtotal from cart
  payment_method: "paystack",
  payment_channel: "card",          // or "mobile"
  phone_number: "+233201234567",
  email: "user@example.com",
  delivery_info: {...}              // ← Delivery info
};

// POST /api/payments
await fetch(`${API_BASE}/api/payments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(paymentData)
});
```

### Backend (paymentController.js -> createPayment)
**What it expects:**

```javascript
export const createPayment = async (req, res) => {
  const {
    order_id,         // ← Must be valid order ID
    amount,           // ← Must match order amount
    payment_method,   // ← Only 'paystack' allowed
    phone_number,
    email
  } = req.body;
  
  const buyer_id = req.session.user?.id;
  
  // Validations
  if (!order_id) {
    return handleError(res, 400, 'Order ID is required');
  }
  if (!amount) {
    return handleError(res, 400, 'Payment amount is required');
  }
  if (!payment_method) {
    return handleError(res, 400, 'Please select a payment method');
  }
  if (!buyer_id) {
    return handleError(res, 401, 'You must be logged in to make a payment');
  }
  if (!allowedMethods.has(payment_method)) {
    return handleError(res, 400, 
      `Payment method '${payment_method}' is not available`);
  }
  
  // Verify amount is positive
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return handleError(res, 400, 
      'Payment amount must be greater than 0');
  }
  
  // Verify order exists and belongs to buyer
  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, farmer_id, status')
    .eq('id', order_id)
    .eq('buyer_id', buyer_id)
    .single();
  
  if (!order) {
    return handleError(res, 404, 
      'Order not found. Please check and try again.');
  }
  
  if (['paid', 'completed', 'cancelled'].includes(order.status)) {
    return handleError(res, 400, 
      `This order has already been ${order.status}. You cannot make another payment.`);
  }
};
```

---

## DATA TYPE MAPPING

### Frontend Sends → Backend Expects

| Field | Frontend Type | Backend Type | Validation |
|-------|--------------|--------------|-----------|
| `crop_id` | String or Number | Number | Must exist in `crops` table |
| `quantity` | Number | Integer | Must be > 0 |
| `order_id` | Number | Number | Must exist in `orders` table |
| `amount` | Number (decimal) | Number | Must be > 0 |
| `payment_method` | String | String | Must be in `allowedMethods` |
| `delivery_info` | JSON object or string | JSON object | Parsed if string |
| `deliveryMethod` | String | String | normalized before insert |

---

## DEBUGGING CHECKLIST

### If you see "GH₵ 0.10":
- [ ] Check database: `SELECT * FROM crops LIMIT 5;` - are prices realistic?
- [ ] Check cart items: Open browser DevTools → Application → LocalStorage → `cart_[userId]`
- [ ] Verify quantity: Is it really 5 × 0.02 = 0.10?

### If you see "Failed to create order":
- [ ] Check browser console (F12) for the exact error message
- [ ] Check backend logs (npm start output) for detailed error
- [ ] Verify farmer is approved: 
  ```sql
  SELECT * FROM user_verifications WHERE user_id = [farmer_id];
  ```
- [ ] Verify you're logged in as buyer (not admin/operations)
- [ ] Verify crop exists and is available:
  ```sql
  SELECT * FROM crops WHERE id = [crop_id];
  ```

### If you see "Payment failed":
- [ ] Verify Paystack credentials in `.env`:
  ```
  PAYSTACK_SECRET_KEY=...
  PAYSTACK_PUBLIC_KEY=...
  PAYSTACK_CALLBACK_URL=...
  ```
- [ ] Check that order was created first
- [ ] Verify payment method is 'paystack'

---

## COMPLETE REQUEST/RESPONSE EXAMPLES

### Example 1: Order Creation Success

**Request:**
```json
POST /api/orders
Content-Type: application/json
Cookie: connect.sid=abc123

{
  "crop_id": "123",
  "quantity": 5,
  "delivery_info": {
    "fullName": "John Acheampong",
    "phone": "+233201234567",
    "address": "123 Accra Street",
    "deliveryMethod": "company-delivery",
    "deliveryService": "gig"
  },
  "deliveryMethod": "company-delivery",
  "delivery_address": "123 Accra Street"
}
```

**Response (201 Created):**
```json
{
  "id": 456,
  "buyer_id": 10,
  "farmer_id": 20,
  "crop_id": 123,
  "quantity": 5,
  "status": "pending_payment",
  "delivery_info": { ... },
  "created_at": "2026-09-01T10:30:00Z"
}
```

### Example 2: Order Creation Failure (Farmer Not Approved)

**Request:** (same as above)

**Response (403 Forbidden):**
```json
{
  "error": "This farmer is not yet approved to sell. Please try another farmer."
}
```

### Example 3: Payment Creation Success

**Request:**
```json
POST /api/payments
Content-Type: application/json
Cookie: connect.sid=abc123

{
  "order_id": 456,
  "amount": 75.00,
  "payment_method": "paystack",
  "email": "user@example.com",
  "phone_number": "+233201234567"
}
```

**Response (200 OK):**
```json
{
  "payment_id": 789,
  "order_id": 456,
  "amount": 75.00,
  "reference_id": "AGRO-1693123456-ABC123",
  "status": "pending",
  "authorization_url": "https://checkout.paystack.com/...",
  "access_code": "xyz123"
}
```

---

## KEY DIFFERENCES & GOTCHAS

### 1. Price NOT sent to backend
- Frontend stores price locally in cart
- Backend fetches crop and uses database price
- **Impact:** If price changes in database, new orders use new price

### 2. Farmer approval is checked
- Frontend doesn't know if farmer is approved
- Backend checks `user_verifications` table
- **Impact:** "Failed to create order" if farmer not approved

### 3. Authentication is required
- Session must have `req.session.user`
- Must be logged in as buyer/farmer/admin
- **Impact:** 401 error if not logged in

### 4. Delivery info normalization
- Frontend sends: `deliveryMethod` + `delivery_info`
- Backend normalizes both to standard format
- **Impact:** Different field names supported (delivery_method, deliveryMethod, etc.)

### 5. Status starts as "pending_payment"
- New orders always start with `status = 'pending_payment'`
- Only transitions to 'confirmed' after payment succeeds
- **Impact:** Orders are placeholder until payment received

---

## RECOMMENDED FIX

1. **Check database prices:**
   ```sql
   SELECT id, name, price FROM crops WHERE status = 'active';
   ```

2. **Verify test farmer is approved:**
   ```sql
   SELECT u.id, u.name, uv.status 
   FROM users u
   LEFT JOIN user_verifications uv ON u.id = uv.user_id
   WHERE u.role = 'farmer'
   ORDER BY uv.submitted_at DESC;
   ```

3. **If prices are 0.01:**
   - Update crops:
   ```sql
   UPDATE crops SET price = 15.00 WHERE status = 'active' AND price < 1;
   ```

4. **If farmer not approved:**
   - Approve manually:
   ```sql
   INSERT INTO user_verifications (user_id, status, submitted_at)
   VALUES ([farmer_id], 'approved', now())
   ON CONFLICT(user_id) DO UPDATE SET status = 'approved';
   ```

5. **Test end-to-end:**
   - Login as buyer
   - Browse crops (should show realistic prices)
   - Add to cart
   - Verify checkout shows realistic total
   - Proceed to payment
   - Check backend logs for any errors
