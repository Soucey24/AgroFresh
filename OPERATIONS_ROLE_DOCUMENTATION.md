# Operations Role - Complete Documentation

## Overview
The **Operations Staff** role manages day-to-day logistics, quality control, and dispatch for the AgroFresh marketplace. Operations staff are created by admins and undergo a verification process (phone, Ghana card, face photo) before gaining full platform access.

---

## 1. ACCOUNT CREATION WORKFLOW

### Where Admin Creates Operations Staff
**Location**: `/admin/operations` (Admin Dashboard → Operations Tab)

**How to Create Operations Staff**:
1. Admin navigates to [Admin Dashboard](http://localhost:5173/admin)
2. Clicks on "Operations" tab (or visits `/admin/operations`)
3. In the form section at the top, enters:
   - **Name**: Full name of the operations staff member
   - **Email**: Unique email address (e.g., ops1@agrofresh.com)
   - **Phone**: Ghana phone number (0245123456 or 233245123456)
   - **Location**: Collection point location (e.g., "Accra Central Market")
   - **Password**: Temporary password (auto-generated or admin-provided)
4. Admin clicks "Create Operations User"
5. System automatically sends SMS to the phone number with:
   ```
   Welcome to AgroFresh!
   Email: [email]
   Password: [password]
   Login: http://localhost:8080/login
   After login, change password and upload documents
   ```

**Backend API**: `POST /api/users`
```javascript
{
  "name": "John Kwame",
  "email": "john.kwame@agrofresh.com",
  "phone": "0245123456",
  "location": "Accra Central Market",
  "password": "TempPass123!",
  "role": "operations"
}
```

---

## 2. ACCOUNT LIFECYCLE

### Stage 1: Account Created → SMS Sent
- **Time**: Immediate (0 seconds)
- **User State**: `password_changed = false`, `verification_status = 'pending'`
- **What Happens**: 
  - Supabase user record created
  - SMS sent to phone with credentials
  - User cannot access platform yet
- **SMS Content**: 
  ```
  Welcome to AgroFresh!
  Email: john.kwame@agrofresh.com
  Password: TempPass123!
  Login: http://localhost:8080/login
  After login, change password and upload documents
  ```

### Stage 2: Login & Force Password Change
- **When**: Staff logs in for first time
- **Login Credentials**: Email + temporary password from SMS
- **What Happens**:
  - Middleware checks `password_changed = false`
  - Redirects to `/change-password` page
  - Cannot access any dashboard until password changed
- **Password Requirements**:
  - Minimum 8 characters
  - Mix of uppercase and lowercase
  - At least one number
  - Special character recommended
- **Password Change Endpoint**: `POST /api/users/change-password`
```javascript
{
  "currentPassword": "TempPass123!",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```
- **Result**: Sets `password_changed = true`, allows dashboard access

### Stage 3: Document Upload & Verification
- **When**: After password change, staff visits `/operations-profile`
- **Required Documents**:
  - Ghana Card Photo (clear, well-lit)
  - Face Photo (clear view of face)
- **Upload Process**:
  1. Staff navigates to [Operations Profile](http://localhost:5173/operations-profile)
  2. Clicks file inputs to upload photos
  3. Previews appear before submit
  4. Clicks "Upload Documents" button
- **Backend Processing**:
  ```
  Photos received → Face.js verification service runs →
  If confidence >= 75% → Auto-approved
  If confidence < 75% or ML service unavailable → Pending manual review
  If approved → SMS notification sent
  ```
- **Upload Endpoint**: `POST /api/users/verify-photos`
```javascript
{
  "ghana_card_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "face_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

### Stage 4: Verification Complete
- **Status**: `verification_status = 'approved'` or `'rejected'`
- **If Approved**:
  - SMS confirmation sent
  - Full platform access granted
  - Can manage collection points, quality checks, dispatch
- **If Rejected**:
  - Reason provided in SMS
  - Can re-upload documents
  - Admin can approve manually from verification dashboard

---

## 3. OPERATIONS STAFF FUNCTIONS & PERMISSIONS

### Core Responsibilities

#### A. Collection Point Management
- **Tab**: "Pending Drops" (Orders in pending/paid/confirmed status)
- **Actions**:
  - View incoming orders from farmers
  - Verify order details (crop type, quantity, location)
  - Confirm collection at collection point
  - Track collection status
- **Database Fields Accessed**:
  - orders.status (pending → confirmed)
  - orders.collection_point
  - orders.timestamp

#### B. Quality Control
- **Tab**: "Quality Checks" (Orders in preparing/ready/packed status)
- **Component**: `QualityCheckForm` in `/components/operations/QualityCheckForm.tsx`
- **Actions**:
  - Inspect crop quality against standards
  - Record quality scores (0-100)
  - Take photos of produce
  - Approve or reject lots
  - Generate quality reports
- **Quality Check Fields**:
  - Appearance (color, size consistency)
  - Ripeness
  - Damage assessment
  - Pest signs
  - Overall score
- **Database Updates**: `quality_checks` table
  - `crop_id`: Which crop
  - `staff_id`: Which operations staff
  - `score`: Quality rating
  - `status`: 'approved' | 'rejected'
  - `notes`: Detailed findings

#### C. Dispatch Management
- **Tab**: "Dispatch Board" (Orders in shipped/dispatched/delivered status)
- **Actions**:
  - Create dispatch batches
  - Assign drivers
  - Select delivery provider
  - Enter tracking number
  - Monitor delivery status
- **Dispatch Form Fields**:
  - Provider (company name)
  - Tracking Number
  - Tracking URL
  - Estimated Delivery Date
- **Database Updates**: `orders` table
  - `shipping_provider`
  - `tracking_number`
  - `status`: 'dispatched'
  - `dispatched_at`: timestamp

#### D. Payout Management
- **Tab**: "Payouts"
- **Actions**:
  - View farmer payout summaries
  - Approve payout requests
  - Track payment status
  - Generate payout reports
- **Payout Process**:
  - Filter by status (pending, completed, failed)
  - Verify amounts against orders completed
  - Approve for payment processing
  - Monitor completion
- **Database**: `payouts` table
  - `status`: 'pending' | 'completed' | 'failed'
  - `amount`: Calculated from order total
  - `payment_method`: farmer's payout method
  - `processed_at`: timestamp

---

## 4. DATABASE SCHEMA FOR OPERATIONS

### users Table (Operations Staff)
```sql
-- Core identity
id UUID PRIMARY KEY
name VARCHAR(255)
email VARCHAR(255) UNIQUE
phone VARCHAR(30) -- Ghana card phone number
role VARCHAR(50) = 'operations'
location VARCHAR(255) -- Collection point location

-- Authentication
password_hash VARCHAR(255) -- Hashed with bcryptjs
password_changed BOOLEAN DEFAULT false
last_login TIMESTAMP WITH TIME ZONE

-- Verification
ghana_card_photo BYTEA -- Base64 encoded image
face_photo BYTEA -- Base64 encoded image
verification_status VARCHAR(20) DEFAULT 'pending'
  -- 'pending': Awaiting verification
  -- 'approved': Verified and active
  -- 'rejected': Failed verification
verification_notes TEXT -- Admin notes
verified_at TIMESTAMP WITH TIME ZONE

-- Timestamps
created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()

-- Indexes for fast lookups
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_verification_status ON users(verification_status);
CREATE INDEX idx_users_password_changed ON users(password_changed);
```

### quality_checks Table
```sql
id UUID PRIMARY KEY
crop_id UUID REFERENCES crops(id)
staff_id UUID REFERENCES users(id) -- Operations staff who did check
order_id UUID REFERENCES orders(id)

-- Quality Metrics
appearance_score INTEGER -- 0-100
ripeness_score INTEGER -- 0-100
damage_assessment TEXT -- Description of damage
pest_signs BOOLEAN DEFAULT false
overall_score INTEGER -- 0-100

-- Status
status VARCHAR(20) DEFAULT 'pending'
  -- 'pending': Under review
  -- 'approved': Passed quality
  -- 'rejected': Failed quality
notes TEXT -- Detailed findings
photos TEXT[] -- Array of photo URLs

created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
completed_at TIMESTAMP WITH TIME ZONE
```

---

## 5. API ENDPOINTS FOR OPERATIONS STAFF

### Authentication
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Operations staff login |
| POST | `/api/auth/logout` | Operations staff logout |

### Password Management
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/users/change-password` | Change password on first login |

### Profile & Verification
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/users/profile/me` | Get current user profile |
| POST | `/api/users/verify-photos` | Upload Ghana card + face photo |

### Orders Management
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/orders` | List all orders for dispatch |
| PUT | `/api/orders/:id` | Update order status |

### Quality Checks
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/quality-checks` | Submit quality check |
| PUT | `/api/quality-checks/:id` | Update quality check result |

### Payouts
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/payouts` | List all pending payouts |
| PUT | `/api/payouts/:id` | Approve/process payout |

---

## 6. SMS MESSAGES SENT TO OPERATIONS STAFF

### 1. Account Creation (Auto-sent)
```
Welcome to AgroFresh!
Email: john.kwame@agrofresh.com
Password: TempPass123!
Login: http://localhost:8080/login
After login, change password and upload documents
```
**Service**: `sendOperationsCredentials(phone, email, password, loginUrl)`

### 2. Verification Approved (Auto-sent after auto-verify)
```
Great news! Your verification is approved. 
You can now access the full operations dashboard.
```
**Service**: `sendVerificationStatus(phone, 'approved', message)`

### 3. Verification Rejected (Auto-sent by admin)
```
Your verification was not approved. 
Reason: Face does not match Ghana card clearly
Please re-upload your documents and try again.
```
**Service**: `sendVerificationStatus(phone, 'rejected', reason)`

---

## 7. ADMIN VERIFICATION DASHBOARD

### Location
**URL**: `/admin/verifications` (Not yet built - Step 4)

### Features (To Be Implemented)
- **Stats Cards**:
  - Operations Pending: X
  - Operations Approved: X
  - Operations Rejected: X
  - Farmers Pending: X
  - Farmers Approved: X
  - Farmers Rejected: X

- **Pending Verification List**:
  - Shows all users with `verification_status = 'pending'`
  - Columns: Name, Email, Phone, Role, Submission Date
  - Actions: View Photos, Approve, Reject

- **Verification Modal**:
  - Shows user info
  - Displays Ghana card photo
  - Displays face photo
  - Shows ML confidence score (if auto-verified)
  - Options: Approve, Reject with reason

- **History Tab**:
  - Shows completed verifications
  - Admin who approved/rejected
  - Timestamp
  - Notes

---

## 8. KEY DIFFERENTIATORS FROM FARMERS

| Feature | Operations | Farmers |
|---------|-----------|---------|
| **Created By** | Admin only | Self-registration |
| **Credential Method** | SMS sent by admin | Email signup link |
| **Required on Signup** | Phone mandatory | Optional |
| **Verification Documents** | Ghana Card + Face Photo | Custom docs (FDA, etc.) |
| **Verification Method** | Face.js auto + manual | Document review only |
| **Primary Function** | Logistics/QA | Selling produce |
| **Dashboard Access** | Collection points, QA, dispatch | Sales, inventory, payouts |
| **Phone Requirement** | Required (SMS) | Optional |

---

## 9. SECURITY & ROLE PERMISSIONS

### Operations Role Restrictions
Operations staff **cannot**:
- Create admin accounts
- View other users' financial data
- Access system settings
- Create/delete farmers or buyers
- Process payments (read-only on payouts)
- View sensitive verification data of other staff

Operations staff **can**:
- View assigned collection point orders
- Update order quality/status
- View their own profile & verification status
- Change their password
- View pending payouts for orders they processed

---

## 10. TROUBLESHOOTING & COMMON ISSUES

### Issue: SMS Not Received
**Cause**: Phone number format incorrect or ARkesel API down
**Solution**: 
- Verify phone format: 0245123456 or 233245123456
- Check ARkesel API status
- Check `/backend/.env` for ARKESEL_API_KEY

### Issue: Staff Can't Login After Password Change
**Cause**: Session not cleared or cache issue
**Solution**:
- Clear browser cookies
- Log out completely
- Try incognito mode
- Verify password_changed flag is true in database

### Issue: Verification Photos Not Uploading
**Cause**: File size > 5MB or format not image
**Solution**:
- Compress images to < 5MB
- Ensure PNG/JPG format
- Check browser console for errors

### Issue: Auto-Verification Not Working
**Cause**: Face.js service not running or confidence too low
**Solution**:
- Ensure ML service running at FACE_API_URL (localhost:8001)
- Photos must be high quality and well-lit
- Faces must be clearly visible
- Admin can manually approve from dashboard

---

## 11. DATABASE MIGRATION

Run these queries in Supabase to set up operations staff tables:

```sql
-- Add operations staff columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ghana_card_photo BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS face_photo BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
CREATE INDEX IF NOT EXISTS idx_users_password_changed ON users(password_changed);
CREATE INDEX IF NOT EXISTS idx_users_phone_verification ON users(phone, verification_status);
CREATE INDEX IF NOT EXISTS idx_users_role_verification ON users(role, verification_status);

-- Quality checks table
CREATE TABLE IF NOT EXISTS quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES crops(id),
  staff_id UUID REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  appearance_score INTEGER,
  ripeness_score INTEGER,
  damage_assessment TEXT,
  pest_signs BOOLEAN DEFAULT false,
  overall_score INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

---

## SUMMARY

**Operations Staff Workflow:**
```
1. Admin creates account in /admin/operations
2. SMS sent to staff phone with login credentials
3. Staff logs in → redirected to /change-password (forced)
4. Staff creates secure password → gains access
5. Staff visits /operations-profile to upload Ghana Card + Face
6. System auto-verifies photos or marks for manual review
7. If approved → SMS confirmation + full access
8. Staff manages collections, quality checks, dispatch, payouts
9. Admin monitors verification status in /admin/verifications (TODO)
```

**Files Involved:**
- Frontend: `src/pages/admin/Operations.tsx`, `src/pages/OperationsProfile.tsx`, `src/pages/ChangePassword.tsx`
- Backend: `backend/controllers/userController.js`, `backend/services/smsService.js`, `backend/services/faceVerification.js`
- Database: `DATABASE_MIGRATIONS.sql` with all operations tables

This documentation is complete as of the implementation date.
