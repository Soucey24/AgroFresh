# AgroFresh Ghana Market - Delivery System

## Overview

The AgroFresh Ghana Market platform integrates with Sendstack for delivery services. This document provides setup instructions and troubleshooting guidance.

## Current Delivery Provider

### Sendstack Integration

**Status**: Integrated with fallback support
**API Documentation**: https://docs.sendstack.africa/

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=Dela
DB_PASS=RockZ@1234
DB_NAME=agrofresh

# Session Configuration
SESSION_SECRET=your-secret-key-change-this

# Sendstack Configuration
SENDSTACK_APP_ID=your_sendstack_app_id
SENDSTACK_APP_SECRET=your_sendstack_app_secret
SENDSTACK_API_KEY=your_sendstack_api_key

# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 2. Sendstack Dashboard Configuration

1. **Get API Credentials**:
   - Log into your Sendstack dashboard
   - Navigate to API settings
   - Copy your `app_id`, `app_secret`, and `api_key`

2. **Configure Webhook URL**:
   - Set webhook URL to: `https://your-domain.com/api/webhooks/sendstack`
   - For local development with ngrok: `https://your-ngrok-url.ngrok.io/api/webhooks/sendstack`

### 3. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ..
npm install
```

## API Endpoints

### Delivery Creation
- **POST** `/api/orders/delivery`
- Creates a delivery booking with Sendstack
- Requires authentication

### Order Tracking
- **GET** `/api/orders/:id/tracking`
- Returns tracking information for an order
- Requires authentication

### Webhook Handler
- **POST** `/api/webhooks/sendstack`
- Receives status updates from Sendstack
- No authentication required (webhook)

## Delivery Flow

1. **Order Creation**: Customer places order with delivery information
2. **Delivery Booking**: System creates delivery booking with Sendstack
3. **Tracking**: Customer can track delivery status
4. **Status Updates**: Sendstack sends webhooks with status updates
5. **Fallback**: If Sendstack fails, system creates mock tracking

## Error Handling

### Sendstack API Errors
- **401 Unauthorized**: Check API credentials
- **404 Not Found**: Verify API endpoints
- **Rate Limiting**: Implement retry logic

### Fallback System
- Creates mock tracking numbers if Sendstack fails
- Maintains order flow even with delivery service issues
- Provides basic tracking information

## Testing

### Local Development
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm run dev`
3. Use ngrok for webhook testing: `ngrok http 4000`

### Production Deployment
1. Set up environment variables
2. Configure webhook URL in Sendstack dashboard
3. Deploy backend to your server
4. Update frontend API base URL

## Monitoring

### Logs to Monitor
- Sendstack API calls and responses
- Webhook processing
- Order status updates
- Error messages

### Health Checks
- Delivery service availability
- Webhook endpoint accessibility
- Database connectivity

## Troubleshooting

### Common Issues

1. **401 Unauthorized from Sendstack**
   - Verify API credentials in environment variables
   - Check Sendstack dashboard for correct credentials

2. **Webhook Not Receiving Updates**
   - Verify webhook URL in Sendstack dashboard
   - Check server logs for webhook processing
   - Ensure webhook endpoint is publicly accessible

3. **Orders Not Creating Deliveries**
   - Check delivery service logs
   - Verify order creation flow
   - Check database connectivity

### Debug Commands

```bash
# Test Sendstack API
curl -X POST https://api.sendstack.africa/api/v1/deliveries \
  -H "app_id: YOUR_APP_ID" \
  -H "app_secret: YOUR_APP_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"orderType":"PROCESSING","pickup":{"address":"Accra, Ghana","pickupName":"Test","pickupNumber":"123"},"drops":[{"address":"Test Address","recipientName":"Test User","recipientNumber":"123"}]}'

# Test webhook endpoint
curl -X POST http://localhost:4000/api/webhooks/sendstack \
  -H "Content-Type: application/json" \
  -d '{"tracking_number":"TEST123","status":"In Transit"}'
```

## Future Enhancements

### Additional Delivery Providers
- **Bolt**: Food delivery service
- **Glovo**: On-demand delivery
- **Jumia Express**: E-commerce logistics

### Features to Add
- Real-time delivery tracking
- Delivery cost calculation
- Multiple delivery options
- Delivery time estimation

## Support

For technical support:
1. Check server logs for error messages
2. Verify environment configuration
3. Test API endpoints manually
4. Contact Sendstack support for API issues

## Security Notes

- Never commit API credentials to version control
- Use environment variables for sensitive data
- Implement rate limiting for API endpoints
- Validate webhook signatures (if supported) 