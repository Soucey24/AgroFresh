# AgroFresh Ghana Market - Quick Start Guide

## 🚀 Getting Started

This guide will help you set up and run the AgroFresh Ghana Market platform with delivery integration.

## Prerequisites

- Node.js (v16 or higher)
- MySQL database
- Sendstack account (for delivery services)

## Installation

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Database Setup

1. Create a MySQL database named `agrofresh`
2. Update database credentials in `backend/env.example` and rename to `.env`

### 3. Environment Configuration

Create `backend/.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=Dela
DB_PASS=RockZ@1234
DB_NAME=agrofresh

# Session Configuration
SESSION_SECRET=your-secret-key-change-this

# Sendstack Configuration (get from Sendstack dashboard)
SENDSTACK_APP_ID=your_sendstack_app_id
SENDSTACK_APP_SECRET=your_sendstack_app_secret
SENDSTACK_API_KEY=your_sendstack_api_key

# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 4. Start the Application

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## Testing the Delivery System

### 1. Run Setup Check

```bash
cd backend
npm run setup
```

This will verify:
- Environment variables
- Database connection
- Sendstack API credentials
- Webhook endpoint

### 2. Test Order Flow

1. Register as a buyer
2. Browse crops and add to cart
3. Proceed to checkout
4. Fill delivery information
5. Complete payment
6. Check order tracking

### 3. Monitor Logs

Watch the backend console for:
- Sendstack API calls
- Webhook processing
- Order status updates

## Production Deployment

### 1. Environment Setup

```bash
# Set production environment variables
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

### 2. Database Migration

Run any pending database migrations:

```bash
cd backend
node scripts/addMissingColumns.js
node scripts/addTrackingFieldsToOrders.js
```

### 3. Webhook Configuration

In your Sendstack dashboard, set webhook URL to:
```
https://your-domain.com/api/webhooks/sendstack
```

### 4. Deploy

Deploy to your preferred hosting platform (Heroku, DigitalOcean, AWS, etc.)

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify MySQL is running
   - Check database credentials
   - Ensure database exists

2. **Sendstack 401 Error**
   - Verify API credentials in .env
   - Check Sendstack dashboard for correct keys

3. **Webhook Not Working**
   - Ensure backend is publicly accessible
   - Check webhook URL in Sendstack dashboard
   - Verify webhook endpoint is working

### Debug Commands

```bash
# Check delivery system setup
cd backend && npm run setup

# Poll delivery status manually
cd backend && npm run poll-delivery

# Test webhook endpoint
curl -X POST http://localhost:4000/api/webhooks/sendstack \
  -H "Content-Type: application/json" \
  -d '{"tracking_number":"TEST123","status":"In Transit"}'
```

## Support

- Check `DELIVERY_SYSTEM.md` for detailed delivery setup
- Review server logs for error messages
- Contact Sendstack support for API issues

## Next Steps

1. Customize the business address in delivery service
2. Add more delivery providers (Bolt, Glovo)
3. Implement real-time tracking
4. Add delivery cost calculation
5. Set up monitoring and alerts 