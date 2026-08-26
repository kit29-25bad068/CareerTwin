# CareerTwin AI - Deployment Guide

This guide walks you through deploying **CareerTwin AI** to production using **MongoDB Atlas** (for free cloud database) and **Render** (or **Railway** / **Vercel**).

---

## 📋 Step 1: Set Up Free Cloud MongoDB (MongoDB Atlas)

Because your local `mongodb://localhost:27017` only runs on your computer, your deployed app needs a cloud MongoDB database:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account.
2. Click **Create Deployment** and select the **M0 Free** shared cluster tier.
3. Under **Security Quickstart / Database Access**:
   - Create a database user (e.g., username: `admin`, generate/set a strong password).
4. Under **Network Access**:
   - Click **Add IP Address** -> Select **Allow Access From Anywhere** (`0.0.0.0/0`) -> Click **Confirm**.
5. Click **Connect** -> **Drivers** (Node.js) -> Copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/careertwin?retryWrites=true&w=majority
   ```
   *(Replace `<username>` and `<password>` with your actual MongoDB credentials)*.

---

## 📦 Step 2: Push Your Code to GitHub

Open PowerShell in the project folder:
```powershell
cd C:\Users\Lenovo\.gemini\antigravity\scratch\CareerTwin

# Initialize Git repository
git init
git add .
git commit -m "Initial commit of CareerTwin AI"

# Link to your GitHub repository
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/careertwin-ai.git
git push -u origin main
```

---

## 🚀 Step 3: Deploy to Render (Recommended)

[Render](https://render.com/) is the easiest and most reliable free platform for full-stack Node.js + Express apps with long-running AI streams and file handling.

1. Sign up / Log in to [Render.com](https://render.com/).
2. In the Render Dashboard, click **New +** -> **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your `careertwin-ai` GitHub repository.
4. Configure the service settings:
   - **Name:** `careertwin-ai` (or your preferred name)
   - **Language / Runtime:** `Node`
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`

5. Scroll down to **Environment Variables** and add the following keys:

| Environment Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string from Step 1 |
| `JWT_SECRET` | *(Random long string)* | e.g. `career_twin_production_secret_key_2026_xyz` |
| `GEMINI_API_KEY` | `AIzaSy...` | Your Google AI Studio API key |
| `WHISPER_API_KEY` | `sk-...` | Optional: OpenAI/Whisper key (if omitted, falls back gracefully) |
| `GITHUB_TOKEN` | `ghp_...` | Optional: for higher GitHub API rate limits |

6. Click **Create Web Service**.
7. Render will build the project and deploy it. In about 1-2 minutes, you will get a live URL (e.g. `https://careertwin-ai.onrender.com`).

---

## ⚡ Option B: Deploy to Railway

1. Go to [Railway.app](https://railway.app/) and sign in with GitHub.
2. Click **New Project** -> **Deploy from GitHub repo** -> Select your `careertwin-ai` repository.
3. Click on the created service -> **Variables** tab -> Add the environment variables (`MONGODB_URI`, `GEMINI_API_KEY`, `JWT_SECRET`, `NODE_ENV=production`).
4. Under **Settings** -> **Networking** -> Click **Generate Domain**.
5. Your app is live!

---

## ▲ Option C: Deploy to Vercel

The repository already contains [`vercel.json`](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/CareerTwin/vercel.json) pre-configured.

1. Install Vercel CLI or go to [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project** -> Import your GitHub repository.
3. Under **Environment Variables**, add:
   - `MONGODB_URI`
   - `GEMINI_API_KEY`
   - `JWT_SECRET`
4. Click **Deploy**.

---

## 🔍 Verification After Deployment

Once deployed, test the following:
1. Visit `https://your-deployed-url.com/api/health` -> Verify it returns `{"status": "healthy"}`.
2. Register a new user on `https://your-deployed-url.com/register.html`.
3. Check that your dashboard loads and connects with your Gemini AI key.
