# Railway.com Deployment Guide - Wave Laundry Backend

## Prerequisites
1. Railway.com account (sign up at https://railway.app)
2. GitHub account (for easy deployment)
3. Backend code pushed to GitHub

## Step 1: Push Backend to GitHub

```bash
cd c:\Users\Princess Magbie\Desktop\wave-laundry\backend
git init
git add .
git commit -m "Wave Laundry Backend - Ready for Railway deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/wave-laundry-backend.git
git push -u origin main
```

## Step 2: Create Railway Project

1. Go to https://railway.app and log in
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize GitHub and select your `wave-laundry-backend` repository
5. Click "Deploy"

## Step 3: Set Up MySQL Database on Railway

1. In your Railway project, click "+ Add Service"
2. Select "MySQL" from the marketplace
3. Click "Add" to provision MySQL database
4. Railway will automatically create a new service

## Step 4: Configure Environment Variables

Railway automatically generates database connection variables. You need to map them:

### In Railway Dashboard:

1. Click on your Backend service
2. Go to "Variables" tab
3. Add/verify these environment variables:

```
NODE_ENV=production
PORT=3000

DB_HOST=${{MySQL.PRIVATE_URL}}  (or {{MySQL.RAILWAY_URL}} for public)
DB_USER=${{MySQL.USERNAME}}
DB_PASSWORD=${{MySQL.PASSWORD}}
DB_NAME=${{MySQL.DATABASE}}
DB_PORT=${{MySQL.PORT}}
```

**Note:** Railway uses reference syntax like `${{ServiceName.VariableName}}` to automatically inject values from linked services.

### Quick Setup:
1. Link MySQL service to Backend: In Backend service, go to "Variables" → "MySQL" service should auto-link
2. Click "MySQL" service details to see connection variables
3. Use these reference variables in your Backend

## Step 5: Database Migration

The backend automatically runs migrations on startup via `addMissingColumns()`. This will:
- Add missing columns to users table (push_token, dark_mode, notifications_enabled)
- Create notifications table
- Create delivery_addresses table

## Step 6: Verify Deployment

1. Check Railway deployment logs
2. Confirm `npm run build` completes successfully
3. Verify port 3000 is exposed
4. You'll get a Railway URL like: `https://wave-laundry-backend-prod.railway.app`

## Step 7: Update Frontend API Base URL

Update your frontend to point to the deployed backend:

In `app/(tabs)/components/SettingsTab.tsx` and other files:

```typescript
const API_BASE_URL = 'https://your-railway-url.railway.app/api';
const SOCKET_URL = 'https://your-railway-url.railway.app';  // or use wss:// for WebSocket
```

## Step 8: Environment Variables Reference

Create a `.env.local` file (DO NOT commit to git):

```
DB_HOST=your_mysql_host.railway.internal
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wave_laundry
DB_PORT=3306
NODE_ENV=production
PORT=3000
```

## Troubleshooting

### 1. **Build fails**
- Check logs: Railway Dashboard → Service → Logs
- Ensure `npm run build` runs locally without errors
- Verify all TypeScript files compile

### 2. **Database connection fails**
- Verify MySQL service is running
- Check DATABASE_URL format in logs
- Ensure backend can reach MySQL on private network

### 3. **Socket.io connection errors**
- Frontend must use HTTPS URL for Railway deployment
- WebSocket should work with `https://` prefix (Railway handles wss upgrade)
- Update SOCKET_URL in frontend to match backend URL

### 4. **Build timeout**
- Railway has a 45-minute build timeout
- If exceeded, optimize dependencies or split services

## Manual Database Setup (If Auto-migration Fails)

If tables aren't created automatically, connect to MySQL and run:

```sql
-- Add columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token VARCHAR(500) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSON DEFAULT NULL,
  target_user_id INT DEFAULT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_sent (target_user_id, sent_at)
);

-- Create delivery_addresses table
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);
```

## Deployment Checklist

- [ ] Backend code pushed to GitHub
- [ ] Railway project created
- [ ] MySQL database provisioned
- [ ] Environment variables configured
- [ ] Backend service deployed successfully
- [ ] Database migration completed
- [ ] API endpoints responding
- [ ] WebSocket connection working
- [ ] Frontend updated with new API URL
- [ ] Push notifications tested
- [ ] Real-time notifications working

## Support & Documentation

- Railway Docs: https://docs.railway.app
- Railway CLI: https://docs.railway.app/develop/cli
- MySQL on Railway: https://docs.railway.app/databases/mysql

---

**Your Backend URL will be:** `https://your-project.railway.app`
**Your WebSocket URL:** `https://your-project.railway.app` (Railway handles WebSocket upgrade)
