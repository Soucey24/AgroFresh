# Real-Time Payment System Documentation

## Overview

The AgroFresh GH platform now includes a comprehensive real-time payment system that supports multiple payment methods and provides real-time status updates across the application.

## Features

### 🚀 Real-Time Payment Processing
- **Live Status Updates**: Payment status is updated in real-time with automatic polling
- **Multiple Payment Methods**: Support for MTN MoMo, Vodafone Cash, AirtelTigo Money, Credit/Debit Cards, and Bank Transfers
- **Secure Transactions**: All payment data is encrypted and securely processed
- **Session Management**: Payment sessions with automatic expiration
- **Webhook Support**: Ready for integration with payment providers

### 📊 Admin Dashboard
- **Payment Monitoring**: Real-time view of all payment transactions
- **Status Tracking**: Live updates on payment status across the platform
- **Filtering & Search**: Advanced filtering by status, payment method, and search terms
- **Analytics**: Payment statistics and revenue tracking
- **Export Capabilities**: Generate payment reports

### 🔄 Status Tracking
- **Pending**: Payment initiated but not yet processed
- **Processing**: Payment is being processed by the provider
- **Completed**: Payment successfully completed
- **Failed**: Payment failed or was rejected
- **Cancelled**: Payment was cancelled by user or system
- **Refunded**: Payment was refunded

## Database Schema

### Payments Table
```sql
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  buyer_id INT NOT NULL,
  farmer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('mtn-momo', 'vodafone-cash', 'airteltigo-money', 'card', 'bank-transfer') NOT NULL,
  phone_number VARCHAR(20),
  transaction_id VARCHAR(255),
  reference_id VARCHAR(255) UNIQUE,
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
  payment_provider VARCHAR(50),
  provider_response JSON,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Payment Sessions Table
```sql
CREATE TABLE payment_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  payment_id INT NOT NULL,
  buyer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status ENUM('active', 'completed', 'expired', 'cancelled') DEFAULT 'active',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Payment Webhooks Table
```sql
CREATE TABLE payment_webhooks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  webhook_type VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);
```

## API Endpoints

### Create Payment
```http
POST /api/payments
Content-Type: application/json

{
  "order_id": 123,
  "amount": 150.00,
  "payment_method": "mtn-momo",
  "phone_number": "0241234567",
  "delivery_info": {
    "fullName": "John Doe",
    "phone": "0241234567",
    "address": "123 Main St, Accra"
  }
}
```

### Get Payment Status
```http
GET /api/payments/{payment_id}/status
```

### Simulate Payment Completion (Testing)
```http
POST /api/payments/simulate
Content-Type: application/json

{
  "payment_id": 123,
  "status": "completed"
}
```

## Frontend Components

### PaymentModal
Enhanced payment modal with real-time status updates:
- Multiple payment method support
- Real-time status tracking
- Mobile-responsive design
- Form validation
- Error handling

### PaymentStatusTracker
Reusable component for tracking payment status:
- Real-time polling
- Status indicators
- Auto-refresh capabilities
- Compact and detailed views

### Admin Payments Dashboard
Comprehensive admin interface:
- Payment monitoring
- Filtering and search
- Statistics and analytics
- Export functionality

## Setup Instructions

### 1. Database Setup
Run the payment tables creation script:
```bash
cd backend
node scripts/createPaymentTables.js
```

### 2. Backend Setup
The payment routes are automatically included in the main app. Ensure the backend is running:
```bash
cd backend
npm start
```

### 3. Frontend Setup
The payment components are ready to use. The system will automatically initialize when the app starts.

## Usage Examples

### Creating a Payment
```javascript
import { createPayment } from '../api';

const paymentData = {
  order_id: 123,
  amount: 150.00,
  payment_method: "mtn-momo",
  phone_number: "0241234567",
  delivery_info: deliveryInfo
};

const result = await createPayment(paymentData);
console.log('Payment created:', result.payment_id);
```

### Tracking Payment Status
```javascript
import PaymentStatusTracker from '@/components/PaymentStatusTracker';

<PaymentStatusTracker
  paymentId={paymentId}
  amount={amount}
  onStatusChange={(status) => console.log('Status changed:', status)}
  showDetails={true}
  autoRefresh={true}
/>
```

### Admin Payment Monitoring
Navigate to `/admin/payments` to access the admin payment dashboard with real-time monitoring capabilities.

## Payment Flow

1. **User initiates payment** in checkout
2. **Payment record created** in database
3. **Payment session established** with expiration
4. **Real-time status polling** begins
5. **Payment provider integration** (simulated for demo)
6. **Status updates** reflected across the application
7. **Order completion** when payment succeeds

## Security Features

- **Session-based authentication** for all payment operations
- **Encrypted payment data** storage
- **Reference ID validation** for transaction tracking
- **Automatic session expiration** for security
- **Webhook signature verification** (ready for implementation)

## Mobile Responsiveness

All payment components are fully responsive and optimized for:
- Mobile phones (320px+)
- Tablets (768px+)
- Desktop (1024px+)

## Testing

The system includes simulation capabilities for testing:
- Payment completion simulation
- Status change testing
- Error scenario testing
- Webhook testing

## Future Enhancements

- **Payment Provider Integration**: Real integration with MTN MoMo, Vodafone Cash APIs
- **Webhook Endpoints**: Real webhook processing for payment providers
- **Refund System**: Automated refund processing
- **Payment Analytics**: Advanced reporting and analytics
- **Multi-currency Support**: Support for different currencies
- **Payment Scheduling**: Scheduled payment capabilities

## Support

For technical support or questions about the payment system, please refer to the codebase documentation or contact the development team. 