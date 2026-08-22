# Supabase Migration Guide

## Step 1: Setup Supabase

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Copy your credentials:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon Key: Public key from API settings
   - Service Role Key: Private key (keep secret)
   - Database Password: From Database settings

## Step 2: Update Environment Variables

Replace your `.env` with:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_PASSWORD=your_db_password

# Database Connection (for direct PostgreSQL access if needed)
DATABASE_URL=postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres

# Session Configuration
SESSION_SECRET=your-secret-key-change-this

# Server Configuration
PORT=4000
NODE_ENV=development

# CORS and Frontend
FRONTEND_URL=http://localhost:3000
```

## Step 3: Install Dependencies

```bash
cd backend
npm install @supabase/supabase-js connect-pg-simple
npm install --save-dev node-pg-migrate  # for migrations
npm remove mysql2 express-mysql-session
```

## Step 4: Run PostgreSQL Schema Migration

Execute the SQL in `backend/migrations/postgres-schema.sql` in Supabase SQL Editor to create all tables and types.

## Step 5: Update Backend Code

See `updated-app.js` and other updated files in this directory.

## Step 6: Migrate Data (if you have existing data)

Use the migration script: `backend/scripts/migrateToSupabase.js`

## Key Differences

| Feature | MySQL | PostgreSQL |
|---------|-------|------------|
| AUTO_INCREMENT | INT AUTO_INCREMENT | SERIAL or BIGSERIAL |
| ENUM | ENUM('a','b') | CREATE TYPE enum_name AS ENUM |
| JSON | JSON support | JSONB (recommended) |
| Booleans | TINYINT(1) | BOOLEAN |
| Date Functions | NOW() | CURRENT_TIMESTAMP |
| Unique Constraint | UNIQUE KEY | UNIQUE constraint |

## Testing

1. Test local connection first with PostgreSQL
2. Test Supabase connection
3. Run backend tests
4. Verify all CRUD operations work
