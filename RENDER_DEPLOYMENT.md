# Render.com Deployment Guide - Wave Laundry Backend

## Why Render?

- ✅ Easy GitHub integration
- ✅ Free tier with databases
- ✅ MySQL & PostgreSQL support
- ✅ Auto-deploys on git push
- ✅ Built-in environment variable management
- ✅ Free SSL/HTTPS

## Prerequisites

1. **Render account** - Sign up at https://render.com
2. **GitHub account** - Your code must be on GitHub
3. **Backend branch** - `railway-deployment` branch ready on GitHub

## Step 1: Connect GitHub to Render

1. Go to https://render.com and sign up/log in
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect account"** → Authorize GitHub
4. Select repository: `wave-laundry`
5. Click **"Connect"**

## Step 2: Configure Web Service

### Basic Settings:
- **Name**: `wave-laundry-backend`
- **Environment**: `Node`
- **Build Command**: `npm install` (automatic)
- **Start Command**: `npm start`
- **Branch**: `railway-deployment`
- **Plan**: Free (or Starter if you want always-on)

### Advanced Settings:
- **Auto-Deploy**: Enable (auto-deploy on git push)
- **Docker**: No (use Node runtime)

Click **"Create Web Service"**

## Step 3: Add MySQL Database

1. In Render dashboard, click **"New +"** → **"MySQL"**
2. Fill in:
   - **Name**: `wave-laundry-db`
   - **Database Name**: `wave_laundry`
   - **Username**: `admin` (or your choice)
   - **Plan**: Free (300MB)
3. Click **"Create Database"**

Wait for the database to be created (~2 minutes).

## Step 4: Configure Environment Variables

### In Web Service:

1. Go back to **Web Service** → **Environment**
2. Click **"Add Environment Variable"** and add:

```
NODE_ENV                production
PORT                    10000
DB_HOST                 {{mysql_hostname}}
DB_USER                 {{mysql_user}}
DB_PASSWORD             {{mysql_password}}
DB_NAME                 wave_laundry
DB_PORT                 3306
```

### Get Database Values:

1. Click on your MySQL database
2. Look for **"Connections"** section
3. Copy:
   - **Hostname** → DB_HOST
   - **Username** → DB_USER
   - **Password** → DB_PASSWORD
   - **Port** → DB_PORT (usually 3306)
   - **Database** → DB_NAME

**Example:**
```
DB_HOST      dpg-c1234567890a-abc1.render.com
DB_USER      admin
DB_PASSWORD  abc123XYZ789
DB_NAME      wave_laundry
DB_PORT      3306
```

## Step 5: Connect Database to Web Service

### Option A: Link Services in Render (Recommended)
1. In **Web Service** → **Environment**
2. Render should auto-suggest database variables
3. Click **"Link"** to auto-populate database credentials

### Option B: Manual Entry
Copy/paste database credentials from MySQL service → Web Service environment variables.

## Step 6: Deploy

1. Click **"Deploy"** button in Web Service
2. Wait for build to complete (~2-5 minutes)
3. Check **"Logs"** tab for build status
4. Once deployed, you'll get a URL like: `https://wave-laundry-backend.onrender.com`

## Step 7: Verify Deployment

```bash
# Test if backend is running
curl https://wave-laundry-backend.onrender.com/api/users

# Should return error (no route yet) but confirms server is up
# Error: Cannot POST /api/users
```

## Step 8: Database Migration

The backend automatically runs migrations on startup via `addMissingColumns()`.

This creates:
- ✅ Missing user table columns (push_token, dark_mode, notifications_enabled)
- ✅ notifications table
- ✅ delivery_addresses table

Check logs to confirm:
```
✅ Added push_token column
✅ Added dark_mode column
✅ Added notifications_enabled column
✅ Created notifications table
✅ Created delivery_addresses table
✅ Database schema migration completed!
```

## Step 9: Update Frontend API URL

Update your frontend code to use the Render backend:

**In `app/(tabs)/components/SettingsTab.tsx` and other files:**

```typescript
const API_BASE_URL = 'https://wave-laundry-backend.onrender.com/api';
const SOCKET_URL = 'https://wave-laundry-backend.onrender.com';  // WebSocket
```

**In any other API calls, replace:**
- `http://10.140.218.56:3000` → `https://wave-laundry-backend.onrender.com`

## Step 10: Test End-to-End

### Send Test Notification:
```bash
curl -X POST https://wave-laundry-backend.onrender.com/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"userIds": [1], "title": "Test", "body": "Real-time message!", "data": {}}'
```

### Expected Response:
```json
{
  "success": true,
  "message": "Notifications sent to 1 user(s)"
}
```

## Troubleshooting

### 1. **Build Fails**
- Check **Logs** tab in Render
- Verify `npm run build` works locally
- Ensure all TypeScript compiles

### 2. **Database Connection Error**
```
Error: connect ECONNREFUSED
```
- Verify DB_HOST, DB_USER, DB_PASSWORD are correct
- Ensure MySQL database is still running
- Check if private/public hostname is used

### 3. **"Cannot GET /" Error**
- This is normal (no root route defined)
- Try `/api/users` endpoint instead

### 4. **WebSocket Connection Fails**
- Use `https://` prefix (Render upgrades to wss automatically)
- Don't try to use `wss://` manually

### 5. **Cold Start / Service Spinning Down**
- Free tier shuts down after 15 min of inactivity
- First request takes 30+ seconds (cold start)
- Use **Starter** plan ($7/mo) for always-on

## Environment Variables Reference

| Variable | Value | Example |
|----------|-------|---------|
| `NODE_ENV` | `production` | - |
| `PORT` | `10000` | (Render assigns this) |
| `DB_HOST` | MySQL hostname | `dpg-abc123.render.com` |
| `DB_USER` | MySQL username | `admin` |
| `DB_PASSWORD` | MySQL password | `abc123XYZ` |
| `DB_NAME` | Database name | `wave_laundry` |
| `DB_PORT` | MySQL port | `3306` |

## Deployment Checklist

- [ ] GitHub account connected to Render
- [ ] Web Service created from `railway-deployment` branch
- [ ] MySQL database provisioned
- [ ] Environment variables configured
- [ ] Database linked to Web Service
- [ ] Web Service deployed successfully
- [ ] Logs show "Database schema migration completed!"
- [ ] API endpoints responding
- [ ] WebSocket connection working
- [ ] Frontend API URL updated
- [ ] Push notifications tested
- [ ] Real-time notifications working

## Auto-Deploy on Git Push

Render automatically deploys when you push to `railway-deployment` branch:

```bash
# Make changes
git add .
git commit -m "Update backend"
git push origin railway-deployment

# Render automatically redeploys!
```

## Support & Documentation

- **Render Docs**: https://render.com/docs
- **Node.js Guide**: https://render.com/docs/deploy-node-express-app
- **Database Guide**: https://render.com/docs/databases
- **Environment Variables**: https://render.com/docs/environment-variables

---

## Your Deployment URLs

Once deployed, you'll have:

```
Backend API:   https://wave-laundry-backend.onrender.com
Database:      Private connection within Render
WebSocket:     https://wave-laundry-backend.onrender.com (auto-upgraded to wss)
```

Update your frontend to use the HTTPS URL above.
