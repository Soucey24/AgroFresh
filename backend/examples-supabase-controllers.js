import { supabase } from '../app.js';

// ============================================
// CONTROLLER UPDATE EXAMPLES
// ============================================

// Example 1: User Registration
export async function registerUser(req, res) {
  try {
    const { name, email, password, role, location } = req.body;

    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('role', role)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password_hash: hashedPassword,
        role,
        location: location || null,
        status: 'Active'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'User registered successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Example 2: Create Crop
export async function createCrop(req, res) {
  try {
    const { name, description, price, quantity, unit, image, expiryDate } = req.body;
    const farmerId = req.session.userId;

    const { data: crop, error } = await supabase
      .from('crops')
      .insert([{
        name,
        description,
        price,
        quantity,
        unit: unit || 'kg',
        farmer_id: farmerId,
        image,
        expiry_date: expiryDate,
        available: quantity > 0
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Crop created successfully',
      crop 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Example 3: Get Crops with Filters
export async function getCrops(req, res) {
  try {
    const { limit = 10, offset = 0, available = true } = req.query;

    let query = supabase
      .from('crops')
      .select('*, users!farmer_id(id, name, email, location)');

    if (available === 'true') {
      query = query.eq('available', true);
    }

    const { data: crops, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ crops, count: crops.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Example 4: Create Order
export async function createOrder(req, res) {
  try {
    const { cropId, quantity, deliveryAddress } = req.body;
    const buyerId = req.session.userId;

    // Get crop details
    const { data: crop, error: cropError } = await supabase
      .from('crops')
      .select('farmer_id, price, quantity as available')
      .eq('id', cropId)
      .single();

    if (cropError || !crop) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    if (crop.available < quantity) {
      return res.status(400).json({ error: 'Insufficient quantity' });
    }

    // Create order
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        buyer_id: buyerId,
        farmer_id: crop.farmer_id,
        crop_id: cropId,
        quantity,
        delivery_address: deliveryAddress,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    // Update crop quantity
    await supabase
      .from('crops')
      .update({ quantity: crop.available - quantity })
      .eq('id', cropId);

    res.status(201).json({ 
      message: 'Order created successfully',
      order 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Example 5: Create Payment
export async function createPayment(req, res) {
  try {
    const { orderId, amount, paymentMethod, phoneNumber } = req.body;
    const buyerId = req.session.userId;

    // Get order to find farmer
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('farmer_id')
      .eq('id', orderId)
      .eq('buyer_id', buyerId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert([{
        order_id: orderId,
        buyer_id: buyerId,
        farmer_id: order.farmer_id,
        amount,
        payment_method: paymentMethod,
        phone_number: phoneNumber,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    // Call payment provider (example: Sendstack)
    // const providerResponse = await callPaymentProvider(payment);

    res.status(201).json({ 
      message: 'Payment initiated',
      payment 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Example 6: Update Order Status
export async function updateOrderStatus(req, res) {
  try {
    const { orderId, status } = req.body;

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      message: 'Order status updated',
      order: updatedOrder 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Example 7: Search Crops
export async function searchCrops(req, res) {
  try {
    const { q, limit = 20 } = req.query;

    const { data: crops, error } = await supabase
      .from('crops')
      .select('*, users!farmer_id(id, name, email)')
      .ilike('name', `%${q}%`)
      .eq('available', true)
      .limit(limit);

    if (error) throw error;

    res.json({ crops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Example 8: Get User Dashboard
export async function getUserDashboard(req, res) {
  try {
    const userId = req.session.userId;
    const role = req.session.userRole;

    if (role === 'farmer') {
      // Get farmer's crops
      const { data: crops, error: cropsError } = await supabase
        .from('crops')
        .select('*')
        .eq('farmer_id', userId);

      // Get farmer's orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('farmer_id', userId);

      if (cropsError || ordersError) throw new Error('Failed to load dashboard');

      res.json({ crops, orders, role });
    } else if (role === 'buyer') {
      // Get buyer's orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, crop:crop_id(id, name, price), farmer:farmer_id(id, name)')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ orders, role });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Example 9: Handle Transaction with Rollback Pattern
export async function complexTransaction(req, res) {
  try {
    // Supabase doesn't have built-in transactions like MySQL
    // Use this pattern for multi-step operations:

    const { orderId, amount } = req.body;

    // Step 1: Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{ /* ... */ }])
      .select()
      .single();

    if (paymentError) throw paymentError;

    try {
      // Step 2: Process payment with provider
      const providerResult = await processPayment(payment);

      // Step 3: Update payment status
      const { error: updateError } = await supabase
        .from('payments')
        .update({ status: 'completed', transaction_id: providerResult.id })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // Step 4: Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      res.json({ success: true, payment });
    } catch (processingError) {
      // If payment processing/update fails, mark payment as failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      throw processingError;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Example 10: Fetch with JOINs (Relationships)
export async function getOrderWithDetails(req, res) {
  try {
    const { orderId } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:buyer_id(id, name, email, location),
        farmer:farmer_id(id, name, email, location),
        crop:crop_id(id, name, description, price, unit, image)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// KEY DIFFERENCES FROM MYSQL
// ============================================
/*
1. QUERY RESULTS:
   MySQL: const [results] = await db.query(sql)
   Supabase: const { data, error } = await supabase.from('table').select()

2. ERROR HANDLING:
   MySQL: throw query errors directly
   Supabase: Check error object after each query

3. TIMESTAMPS:
   MySQL: DATETIME vs TIMESTAMP
   Supabase: TIMESTAMP WITH TIME ZONE (always use ISO strings)

4. ENUMS:
   MySQL: ENUM('a', 'b')
   PostgreSQL: Type definitions + constraints (handled in schema)

5. JSON FIELDS:
   MySQL: JSON
   PostgreSQL: JSONB (use .select() with ->> operators for filtering)

6. TRANSACTIONS:
   MySQL: START TRANSACTION / COMMIT / ROLLBACK
   PostgreSQL: Manual rollback pattern or use functions

7. PAGINATION:
   MySQL: LIMIT offset, limit
   Supabase: .range(offset, offset + limit - 1)

8. CASE SENSITIVITY:
   PostgreSQL: Identifiers are lowercase unless quoted
   Use snake_case for all column names (not camelCase)
*/
