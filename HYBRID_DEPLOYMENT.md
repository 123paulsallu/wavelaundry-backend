# Hybrid Deployment Guide: Railway MySQL + Render Node.js

## Architecture

```
┌─────────────────────────┐
│   Render Node.js        │
│   Wave Laundry Backend  │
│   (Web Server)          │
└────────────┬────────────┘
             │ TCP Connection
             │ Port 3306
             ↓
┌─────────────────────────┐
│   Railway MySQL         │
│   Database              │
│   (Private Network)     │
└─────────────────────────┘
```

## Prerequisites

1. **Railway account** - https://railway.app
2. **Render account** - https://render.com
3. **GitHub account** - Code on `railway-deployment` branch
4. **Backend code ready** - MySQL configuration (already done)

---

## STEP 1: Create MySQL Database on Railway

### On Railway Dashboard:

1. Go to https://railway.app
2. Click **"New Project"**
3. Click **"Provision MySQL"**
4. Fill in:
   ```
   Database Name: wave_laundry
   ```
5. Click **"Create"** and wait 2-3 minutes

### Get Database Credentials:

1. Click on the MySQL database you created
2. Go to **"Data"** tab or **"Connect"** section
3. Copy these credentials (you'll need them for Render):

```
Railway MySQL Connection Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Host:     (something like: db.railway.app or mysql.railway.app)
Port:     3306 (or your port number)
Username: root (or admin)
Password: (your password)
Database: wave_laundry
```

**⭐ IMPORTANT: Save these credentials!** You'll use them in Render.

---

## STEP 2: Create Node.js Server on Render

### On Render Dashboard:

1. Go to https://render.com
2. Click **"New +"** → **"Web Service"**
3. Click **"Deploy from GitHub"** → Authorize if needed
4. Select repository: **`wave-laundry`**
5. Fill in:

```
Name:              wave-laundry-backend
Environment:       Node
Build Command:     (leave empty/default)
Start Command:     npm start
Branch:            railway-deployment  ⭐ IMPORTANT!
Plan:              Free
```

6. Click **"Create Web Service"**

---

## STEP 3: Configure Environment Variables in Render

### In Render Web Service → "Environment" tab:

Click **"Add Environment Variable"** and add these (from Railway credentials):

```
NODE_ENV        production
PORT            10000
DB_HOST         <Railway MySQL host>
DB_USER         root
DB_PASSWORD     <Railway MySQL password>
DB_NAME         wave_laundry
DB_PORT         3306
```

**Example:**
```
NODE_ENV = production
PORT = 10000
DB_HOST = db.railway.app
DB_USER = root
DB_PASSWORD = abc123XYZ789def
DB_NAME = wave_laundry
DB_PORT = 3306
```

---

## STEP 4: Deploy

1. In Render, click **"Deploy"** button
2. Watch the logs for success message:
   ```
   ✅ npm install completed
   ✅ npm run build completed
   ✅ Server running on port 10000
   ✅ Database schema migration completed!
   ```

3. Once deployed, you get a URL like:
   ```
   https://wave-laundry-backend.onrender.com
   ```

---

## STEP 5: Verify Connection

Test if backend can reach Railway MySQL:

```bash
# Test health check (your backend has database connected)
curl https://wave-laundry-backend.onrender.com/api/users
```

Should return something (error is okay, means server responded).

If you get timeout or connection error → Database credentials are wrong.

---

## STEP 6: Update Frontend API URL

In `app/(tabs)/components/SettingsTab.tsx` and all API calls:

```typescript
// OLD (local)
const API_BASE_URL = 'http://10.140.218.56:3000/api';
const SOCKET_URL = 'http://10.140.218.56:3000';

// NEW (Render)
const API_BASE_URL = 'https://wave-laundry-backend.onrender.com/api';
const SOCKET_URL = 'https://wave-laundry-backend.onrender.com';
```

---

## STEP 7: Test Notifications

Send test notification:

```bash
curl -X POST https://wave-laundry-backend.onrender.com/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"userIds": [1], "title": "Test", "body": "Live notification!", "data": {}}'
```

Expected response:
```json
{"success": true, "message": "Notifications sent to 1 user(s)"}
```

---

## Troubleshooting

### 1. **"Unable to connect to database"**

**Problem:** Database credentials wrong

**Solution:**
- Verify Railway credentials are correct
- Check DB_HOST, DB_USER, DB_PASSWORD in Render env vars
- Railway might use different host for public vs private
- Try: `mysql.railway.app` or `db.railway.app`

### 2. **"Connection timeout"**

**Problem:** Railway MySQL unreachable from Render

**Solution:**
- Verify Railway database is running
- Check if you need to use public connection string
- Render servers need public Railway host (not internal network)

### 3. **Build fails on Render**

**Problem:** TypeScript compilation error

**Solution:**
- Check Render logs → click **"Logs"** tab
- Verify `npm run build` works locally
- Ensure branch is `railway-deployment`

### 4. **Service shuts down after 15 minutes**

**Problem:** Free Render tier spins down inactive services

**Solution:**
- Upgrade to **Starter** plan ($7/mo) for always-on
- Or keep free tier (will cold-start on first request)

---

## Environment Variables Checklist

| Variable | Source | Example |
|----------|--------|---------|
| `NODE_ENV` | Type manually | `production` |
| `PORT` | Render assigns | `10000` |
| `DB_HOST` | Railway credentials | `db.railway.app` |
| `DB_USER` | Railway credentials | `root` |
| `DB_PASSWORD` | Railway credentials | `abc123XYZ` |
| `DB_NAME` | Railway credentials | `wave_laundry` |
| `DB_PORT` | Railway credentials | `3306` |

---

## Deployment Flow

```
1. Local Development
   ├─ Frontend: http://localhost:3000 (Expo)
   └─ Backend: http://localhost:3000 (Node.js)
   └─ Database: localhost:3306 (MySQL)

2. Commit & Push to GitHub
   └─ git push origin railway-deployment

3. Render Auto-Deployment
   └─ Pulls from railway-deployment branch
   └─ Runs: npm install
   └─ Runs: npm run build (via postinstall)
   └─ Runs: npm start

4. Live
   ├─ Frontend: Expo App (on device)
   ├─ Backend: https://wave-laundry-backend.onrender.com
   └─ Database: Railway MySQL (private connection)
```

---

## Auto-Deploy on Git Push

Any changes to `railway-deployment` branch auto-deploy:

```bash
# Make changes
git add .
git commit -m "Update backend"
git push origin railway-deployment

# Render automatically redeploys within 1-2 minutes!
```

---

## Your Live Deployment URLs

```
Backend API:      https://wave-laundry-backend.onrender.com
API Endpoints:    https://wave-laundry-backend.onrender.com/api
WebSocket:        https://wave-laundry-backend.onrender.com (wss:// for secure)
Database:         Railway MySQL (private, not exposed)
```

---

## Next Steps

1. ✅ Create MySQL on Railway
2. ✅ Create Node.js service on Render
3. ✅ Configure environment variables
4. ✅ Deploy
5. ✅ Update frontend API URL
6. ✅ Test notifications
7. ✅ Monitor logs

---

## Support

- **Railway Docs:** https://docs.railway.app/databases/mysql
- **Render Docs:** https://render.com/docs/deploy-node-express-app
- **GitHub Status:** Check railway-deployment branch commits

---

**Your Wave Laundry backend is now live! 🚀**
