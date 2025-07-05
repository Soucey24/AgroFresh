# AgroFresh Backend

This is the backend for the AgroFresh Ghana Market platform, built with Node.js, Express, MySQL, and session-based authentication.

## Features
- User registration and login (session-based)
- Role-based access (farmer, buyer, admin)
- Crop/product management
- Order management
- Local file uploads (avatars, crop images)

## Prerequisites
- Node.js (v18+ recommended)
- MySQL server

## Setup

1. **Clone the repo and install dependencies:**
   ```sh
   cd backend
   npm install
   ```

2. **Create a MySQL database:**
   ```sql
   CREATE DATABASE agrofresh;
   ```

3. **Configure environment variables:**
   Create a `.env` file in the `backend` folder with:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_mysql_password
   DB_NAME=agrofresh
   SESSION_SECRET=your_secret_key
   ```

4. **Run the server:**
   ```sh
   npm run dev
   # or
   npm start
   ```

5. **API will be available at:**
   - http://localhost:4000/

## Folder Structure
- `app.js` - Main Express app
- `/controllers` - Route handlers (to be created)
- `/models` - Database models (to be created)
- `/routes` - API routes (to be created)
- `/uploads` - Uploaded files (avatars, images)

## Next Steps
- Implement authentication routes
- Add user, crop, and order models and routes
- Connect frontend to backend 