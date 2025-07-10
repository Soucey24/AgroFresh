import { db } from '../app.js';

class DeliveryService {
  constructor() {
    this.sendstackAppId = process.env.SENDSTACK_APP_ID;
    this.sendstackAppSecret = process.env.SENDSTACK_APP_SECRET;
    this.sendstackApiKey = process.env.SENDSTACK_API_KEY;
  }

  async createSendstackDelivery(orderData) {
    const { deliveryInfo, cartItems, orderId } = orderData;
    
    if (!this.sendstackAppId || !this.sendstackAppSecret) {
      console.warn('Sendstack credentials not configured, using fallback');
      return this.createFallbackDelivery(orderId);
    }

    const payload = {
      orderType: "PROCESSING",
      pickup: {
        address: "Accra, Ghana", // TODO: Replace with your actual business address
        pickupName: "AgroFresh Ghana Market",
        pickupNumber: "0243404515"
      },
      drops: [
        {
          address: deliveryInfo.address,
          recipientName: deliveryInfo.fullName,
          recipientNumber: deliveryInfo.phone,
          note: deliveryInfo.specialInstructions || ""
        }
      ]
    };

    try {
      console.log('Attempting Sendstack API call with payload:', payload);
      
      const res = await fetch('https://api.sendstack.africa/api/v1/deliveries', {
        method: 'POST',
        headers: {
          'app_id': this.sendstackAppId,
          'app_secret': this.sendstackAppSecret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('Sendstack API response:', data);

      if (data.status === true && data.data && data.data.drops && data.data.drops[0]) {
        const drop = data.data.drops[0];
        let trackingUrl = drop.trackingUrl;
        const trackingNumber = drop.trackingId;
        const deliveryStatus = drop.status;

        if (!trackingUrl && trackingNumber) {
          trackingUrl = `https://app.sendstack.africa/tracking?trackingId=${trackingNumber}`;
        }

        await this.updateOrderTracking(orderId, {
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          delivery_status: deliveryStatus,
        });

        return {
          success: true,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          delivery_status: deliveryStatus,
        };
      } else {
        console.warn('Sendstack API failed:', data.message);
        throw new Error(`Sendstack API Error: ${data.message}`);
      }
    } catch (err) {
      console.error('Error with Sendstack delivery:', err);
      return this.createFallbackDelivery(orderId);
    }
  }

  async createFallbackDelivery(orderId) {
    console.log('Creating fallback delivery for order:', orderId);
    const timestamp = Date.now();
    const mockTrackingNumber = `SS${timestamp}`;
    const mockTrackingUrl = `https://app.sendstack.africa/tracking?trackingId=${mockTrackingNumber}`;
    
    await this.updateOrderTracking(orderId, {
      tracking_number: mockTrackingNumber,
      tracking_url: mockTrackingUrl,
      delivery_status: 'Order Placed',
    });

    return {
      success: false,
      tracking_number: mockTrackingNumber,
      tracking_url: mockTrackingUrl,
      delivery_status: 'Order Placed',
      fallback: true,
    };
  }

  async updateOrderTracking(orderId, trackingInfo) {
    try {
      await db.query(
        'UPDATE orders SET tracking_number=?, tracking_url=?, delivery_status=? WHERE id=?',
        [trackingInfo.tracking_number, trackingInfo.tracking_url, trackingInfo.delivery_status, orderId]
      );
      console.log('Tracking info updated for order:', orderId);
    } catch (err) {
      console.error('Error updating tracking info:', err);
      throw err;
    }
  }

  async getOrderTracking(orderId) {
    try {
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (orders.length === 0) {
        throw new Error('Order not found');
      }

      const order = orders[0];
      if (order.tracking_url || order.tracking_number || order.delivery_status) {
        return {
          orderId: order.id,
          tracking_number: order.tracking_number,
          tracking_url: order.tracking_url,
          status: order.delivery_status,
          lastUpdated: order.updated_at || order.created_at,
          history: this.generateTrackingHistory(order.delivery_status),
        };
      } else {
        return this.generateMockTracking(orderId);
      }
    } catch (err) {
      console.error('Error fetching tracking info:', err);
      return this.generateMockTracking(orderId);
    }
  }

  generateTrackingHistory(status) {
    const now = new Date();
    const history = [
      { status: 'Order Placed', timestamp: new Date(now.getTime() - 86400000).toISOString() },
    ];

    if (status === 'Dispatched' || status === 'In Transit' || status === 'Delivered') {
      history.push({ status: 'Dispatched', timestamp: new Date(now.getTime() - 43200000).toISOString() });
    }

    if (status === 'In Transit' || status === 'Delivered') {
      history.push({ status: 'In Transit', timestamp: new Date(now.getTime() - 3600000).toISOString() });
    }

    if (status === 'Delivered') {
      history.push({ status: 'Delivered', timestamp: now.toISOString() });
    }

    return history;
  }

  generateMockTracking(orderId) {
    const now = new Date();
    return {
      orderId: orderId,
      status: 'In Transit',
      lastUpdated: now.toISOString(),
      history: [
        { status: 'Order Placed', timestamp: new Date(now.getTime() - 86400000).toISOString() },
        { status: 'Dispatched', timestamp: new Date(now.getTime() - 43200000).toISOString() },
        { status: 'In Transit', timestamp: new Date(now.getTime() - 3600000).toISOString() }
      ]
    };
  }
}

export default new DeliveryService(); 