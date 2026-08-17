# Deployment Guide for Render

## 📋 Prerequisites

- Render account (render.com)
- GitHub repository with this code
- Google Gemini API key

## 🚀 Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Create New Web Service on Render

1. Go to [render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Fill in the following:

| Setting | Value |
|---------|-------|
| **Name** | smartedubuddy-backend |
| **Environment** | Node |
| **Region** | Your closest region |
| **Branch** | main |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Runtime** | Node 18 (or latest) |

### 3. Set Environment Variables

In Render dashboard, go to **Environment**:

```
AI_API_KEY=your_actual_gemini_api_key_here
NODE_ENV=production
PORT=10000
LOG_LEVEL=info
```

**DO NOT** commit `.env` file to GitHub. Only set it in Render dashboard.

### 4. Deploy

Click **Deploy** and wait for build to complete.

## ✅ Verify Deployment

Test your endpoints:

```bash
# Health Check
curl https://your-app-name.onrender.com/api/health

# Chat Request
curl -X POST https://your-app-name.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is AI?"}'
```

## 🔧 Troubleshooting

### Issue: Build Fails

**Check:**
1. `npm install` completes successfully
2. No syntax errors in `src/` files
3. All required dependencies in `package.json`

**Run locally:**
```bash
npm install
npm start
```

### Issue: "Brain Error" on Arduino

**Check:**
1. API_API_KEY is set in Render environment
2. Backend is running (check `/api/health`)
3. Arduino is pointing to correct backend URL
4. Internet connection is stable

### Issue: Port Issues

Render assigns ports dynamically. The code reads from `PORT` environment variable, which is **already configured** in `src/config/config.js`:

```javascript
port: process.env.PORT || 3000,
```

### Issue: High Memory Usage

If Render shows memory issues:
1. Reduce logging (set `LOG_LEVEL=warn`)
2. Check for memory leaks in services
3. Monitor with `npm run test`

## 📊 Monitoring

### View Logs
In Render dashboard, click **Logs** to see real-time application output.

### Common Log Patterns

✅ **Success:**
```
[timestamp] [INFO] [Server] SmartEduBuddy Brain is running on port 10000
[timestamp] [INFO] [ChatController] 🎙️ Robot sent a request!
```

❌ **Error:**
```
[timestamp] [ERROR] [AIService] API Key is missing in environment variables
```

## 🔄 Auto-Deploy

Render automatically redeploys when you push to GitHub. To disable:
- Go to **Settings** → **Auto-Deploy** → Toggle Off

## 🛑 Stop/Delete Service

- **Pause:** Settings → Suspend Service
- **Delete:** Settings → Delete Web Service

## 💡 Local Development vs Production

| Environment | Command | Restart | nodemon |
|---|---|---|---|
| **Local** | `npm run dev` | Auto | ✅ Yes |
| **Production** | `npm start` | Manual | ❌ No |

## 📝 Important Notes

1. **Never commit `.env`** - Always use Render environment variables
2. **API Key Security** - Keep your Gemini API key private
3. **Node Version** - Use Node 18+ for best compatibility
4. **Cold Starts** - First request may take 30+ seconds on free tier
5. **Logs Retention** - Render keeps 24 hours of logs

## 🎯 Next Steps

1. Verify deployment is working
2. Update Arduino with your backend URL:
   ```
   String serverURL = "https://your-app-name.onrender.com/api/chat";
   ```
3. Test full end-to-end communication
4. Monitor logs regularly

---

**Support:** Check [Render Docs](https://render.com/docs) for additional help
