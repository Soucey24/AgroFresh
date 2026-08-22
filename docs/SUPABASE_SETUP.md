# Supabase Migration: Step-by-Step Implementation Guide

## Phase 1: Pre-Migration Setup (15 minutes)

### Step 1: Create Supabase Account & Project
1. Visit [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: agrofresh
   - **Database Password**: Strong password (save this!)
   - **Region**: Closest to your users
5. Click "Create new project" (takes ~2 minutes)

### Step 2: Get Supabase Credentials
Once project is created, go to **Settings → API**:
- Copy `Project URL` (supabase_url)
- Copy `anon public key` (supabase_anon_key)
- Copy `service_role secret` (supabase_service_role_key) - keep private!
- Go to **Database** settings to get your database password

### Step 3: Update Environment Variables
Create/update `.env` in `backend/`:

```env
# Supabase
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Direct Database Connection
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Other configs
SESSION_SECRET=your-secure-secret-key
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Phase 2: Database Setup (10 minutes)

### Step 1: Create Tables in Supabase
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire content from `backend/migrations/postgres-schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" (wait for green success message)

✅ All tables and types are now created!

## Phase 3: Code Changes (20 minutes)

### Step 1: Update Package Dependencies
```bash
cd backend

# Remove MySQL packages
npm remove mysql2 express-mysql-session

# Add Supabase packages
npm install @supabase/supabase-js pg connect-pg-simple
```

### Step 2: Update app.js
Replace `backend/app.js` with the content from `backend/app-supabase.js`:

```bash
cp app.js app.js.backup  # backup original
cp app-supabase.js app.js
```

OR manually update:
- Replace MySQL imports with Supabase imports
- Replace `mysql.createPool()` with Supabase client creation
- Replace session store from `express-mysql-session` to `connect-pg-simple`

### Step 3: Update Model Files
For each model file, choose one of these approaches:

**Option A: Use Supabase models (RECOMMENDED)**
```bash
# Rename old models as backup
mv backend/models/userModel.js backend/models/userModel-mysql.js
mv backend/models/cropModel.js backend/models/cropModel-mysql.js
mv backend/models/orderModel.js backend/models/orderModel-mysql.js
mv backend/models/paymentModel.js backend/models/paymentModel-mysql.js

# Use new Supabase models
cp backend/models/userModel-supabase.js backend/models/userModel.js
cp backend/models/cropModel-supabase.js backend/models/cropModel.js
cp backend/models/orderModel-supabase.js backend/models/orderModel.js
cp backend/models/paymentModel-supabase.js backend/models/paymentModel.js
```

**Option B: Manually update existing models**
Update each model file:
1. Change `import { db } from '../app.js'` to `import { supabase } from '../app.js'`
2. Replace MySQL queries with Supabase RLS queries (see example models)
3. Change ENUM values (PostgreSQL format may differ slightly)

### Step 4: Update Controllers
Update each controller to use new model functions:
- Timestamps: MySQL `TIMESTAMP` → PostgreSQL `TIMESTAMP WITH TIME ZONE`
- Query syntax: Change from mysql2 to Supabase JS client
- Error handling: Supabase returns `{ data, error }` objects

**Example migration in a controller:**

```javascript
// OLD (MySQL)
const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

// NEW (Supabase)
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

if (error) throw error;
```

## Phase 4: Data Migration (5-30 minutes depending on data size)

### If You Have Existing Data:

```bash
cd backend

# Run migration script
npm run migrate:supabase
```

This script will:
1. Connect to your old MySQL database
2. Connect to your new Supabase database
3. Copy all data while maintaining IDs and relationships
4. Handle JSON field conversions

⚠️ **Before running:**
- Ensure old MySQL database is still running
- Ensure all environment variables are set correctly
- Back up your MySQL database first

### If This is a Fresh Start:
Skip the migration - your tables are ready to use!

## Phase 5: Testing & Deployment (15 minutes)

### Step 1: Local Testing
```bash
npm run dev
```

Test these endpoints:
- ✅ User registration and login
- ✅ Create and view crops
- ✅ Place orders
- ✅ Process payments
- ✅ Check delivery tracking

### Step 2: Environment Check
- [ ] All `node_modules` installed
- [ ] Environment variables loaded
- [ ] Database connected (check Supabase dashboard)
- [ ] No errors in server logs

### Step 3: Deploy to Production
1. Update your production environment variables in hosting provider
2. Deploy backend code (same deployment process as before)
3. Test all endpoints in production
4. Monitor logs for errors

## Troubleshooting

### Connection Issues
**Problem**: Cannot connect to Supabase
```
Solution:
1. Check DATABASE_URL is correct
2. Verify database password is correct
3. Check that SSL is enabled (Supabase requires it)
4. Ensure your IP is not blocked (whitelist in Supabase)
```

### Enum Type Errors
**Problem**: "type ... already exists"
```
Solution:
- Drop and recreate the type:
  DROP TYPE IF EXISTS [type_name];
- Re-run the schema creation SQL
```

### Foreign Key Issues
**Problem**: "Referential integrity violation"
```
Solution:
- Ensure parent records exist before child records
- Migration script handles this automatically
- If manual migration, migrate in order: users → crops → orders → payments
```

### Session Storage Issues
**Problem**: "Session table not found"
```
Solution:
- connect-pg-simple auto-creates table on first run
- Or manually run in Supabase SQL:
  CREATE TABLE IF NOT EXISTS session (
    sid varchar PRIMARY KEY,
    sess json NOT NULL,
    expire timestamp NOT NULL
  );
```

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Create database schema
3. ✅ Update backend code
4. ✅ Migrate data (if needed)
5. ✅ Test thoroughly
6. ✅ Deploy to production
7. Consider: Row-Level Security (RLS) policies for data protection
8. Consider: Backups and disaster recovery plan

## Important Notes

- **Environment Variables**: Never commit `.env` to git
- **API Keys**: Service role key is private - never expose to frontend
- **Anon Key**: Use this for frontend Supabase client (not backend)
- **RLS**: Enable Row Level Security for production (in Supabase Dashboard)
- **Backups**: Supabase provides automatic backups (check settings)
- **Quotas**: Monitor usage in Supabase dashboard to stay within free tier limits

## Reverting to MySQL (if needed)

Keep your old app.js and models files:
- `backend/app.js.backup`
- `backend/models/*-mysql.js`

To revert: Restore these files and reinstall mysql2 dependencies.

---

**Estimated Total Time**: 60-90 minutes for complete migration

**Questions or Issues?** Check the Supabase docs: https://supabase.com/docs
