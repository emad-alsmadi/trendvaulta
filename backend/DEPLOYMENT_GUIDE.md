# Deploy Backend to Render - Step by Step Guide

## Overview
This guide will help you deploy your Craftify backend API from Railway to Render (free tier). Render allows multiple web services on the free plan, making it perfect for our backend.

## Prerequisites
- GitHub repository with your backend code
- MongoDB Atlas account (free tier)
- Render account (free tier)
- Gmail account (for email services)

---

## Step 1: Prepare Your Backend Code

### 1.1 Add Health Check Endpoint
Your `app.js` already includes the health check endpoint at `/api/health` that Render requires.

### 1.2 Update Package.json
Ensure your `package.json` has the correct start script:
```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  }
}
```

### 1.3 Environment Variables Template
Create `.env.example` file (already created) with all required variables.

---

## Step 2: Push Code to GitHub

### 2.1 Commit Your Changes
```bash
git add .
git commit -m "feat: add render deployment configuration"
git push origin main
```

### 2.2 Ensure Repository is Public
Render free tier works with public repositories.

---

## Step 3: Setup MongoDB Atlas

### 3.1 Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create new cluster (free tier - M0)
4. Choose region closest to your users

### 3.2 Configure Network Access
1. Go to Network Access
2. Add IP Address: `0.0.0.0/0` (allows all access)
3. This is required for Render's dynamic IPs

### 3.3 Create Database User
1. Go to Database Access
2. Add new user with username and password
3. Grant read/write permissions

### 3.4 Get Connection String
1. Go to your cluster
2. Click "Connect"
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Replace `<database>` with `craftify_templates`

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/craftify_templates
```

---

## Step 4: Deploy to Render

### 4.1 Create Render Account
1. Go to [Render](https://render.com)
2. Sign up with GitHub
3. Connect your GitHub account

### 4.2 Create New Web Service
1. Click "New +" > "Web Service"
2. Select your GitHub repository
3. Choose branch: `main`
4. Configure service settings:

#### Basic Settings:
- **Name**: `craftify-backend`
- **Region**: Oregon (or closest to you)
- **Plan**: Free
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### Advanced Settings:
- **Health Check Path**: `/api/health`
- **Auto-Deploy**: Yes (when you push to GitHub)

### 4.3 Configure Environment Variables
In the Environment section, add these variables:

#### Required Variables:
```
NODE_ENV=production
PORT=10000
MONGO_URL=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/craftify_templates
DB_NAME=craftify_templates
JWT_SECRET_KEY=your-super-secret-jwt-key-256-bits-long
JWT_EXPIRE=30d
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

#### Email Variables:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
FROM_EMAIL=noreply@craftify.com
FROM_NAME=Craftify Templates
```

**Important**: Replace all placeholder values with your actual values.

### 4.4 Deploy and Wait
1. Click "Create Web Service"
2. Wait for deployment (2-5 minutes)
3. Check logs for any errors

---

## Step 5: Configure Gmail for Email

### 5.1 Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Enable 2FA

### 5.2 Create App Password
1. Go to Google App Passwords
2. Select "Mail" for app
3. Select "Other (Custom name)" and enter "Craftify Backend"
4. Copy the generated password
5. Use this password in `EMAIL_PASS` environment variable

---

## Step 6: Test Your Deployment

### 6.1 Check Health Endpoint
Visit: `https://your-service-name.onrender.com/api/health`

Should return:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.456
}
```

### 6.2 Test API Endpoints
```bash
# Test templates endpoint
curl https://your-service-name.onrender.com/api/templates

# Test auth endpoint
curl -X POST https://your-service-name.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"123456"}'
```

---

## Step 7: Update Frontend Configuration

### 7.1 Update Frontend Environment
In your frontend, update the API URL:
```
NEXT_PUBLIC_API_URL=https://your-service-name.onrender.com
```

### 7.2 Update CORS
Your backend already allows all origins with `origin: true`, but you can restrict it:
```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.vercel.app'],
  credentials: true,
}));
```

---

## Step 8: Monitor and Maintain

### 8.1 Check Render Dashboard
- Monitor service status
- Check logs for errors
- View metrics and usage

### 8.2 Handle Free Tier Limitations
- **Sleep**: Free services sleep after 15 minutes inactivity
- **Wake-up**: First request after sleep may take longer
- **Build time**: Limited to 15 minutes per build

### 8.3 Backup Your Data
- MongoDB Atlas provides automatic backups
- Export important data regularly

---

## Troubleshooting

### Common Issues:

#### 1. Database Connection Error
```
Error: Could not connect to MongoDB
```
**Solution**: Check MONGO_URL format and whitelist IP (0.0.0.0/0)

#### 2. Port Binding Error
```
Error: listen EADDRINUSE :::3000
```
**Solution**: Use PORT=10000 (Render's required port)

#### 3. Environment Variables Not Loading
```
Error: JWT_SECRET_KEY is not defined
```
**Solution**: Check environment variables in Render dashboard

#### 4. Email Service Not Working
```
Error: Invalid login credentials
```
**Solution**: Use Gmail App Password, not regular password

#### 5. Service Not Starting
```
Error: Cannot find module
```
**Solution**: Check package.json and run `npm install`

---

## Next Steps

1. **Monitor Performance**: Use Render's metrics
2. **Add Logging**: Implement proper logging
3. **Set Up Alerts**: Configure email alerts for downtime
4. **Scale Up**: Upgrade to paid plan if needed
5. **Add CDN**: Consider CDN for static assets

---

## Support

If you encounter issues:
1. Check Render logs
2. Review MongoDB Atlas configuration
3. Verify environment variables
4. Test locally with same environment variables

---

**Your backend is now live on Render!**
