# Deploying on Vercel (frontend + API)

## Why data/images broke

1. **API URL** – The app used `http://localhost:5000` in many places. In production the browser must call your **real API URL**. That is now centralized: set **`VITE_API_BASE_URL`** at build time (see below).

2. **MongoDB** – The API needs **`MONGO_URI`** in the **backend** Vercel project. If it’s missing or wrong, no DB data loads. In **MongoDB Atlas → Network Access**, allow **`0.0.0.0/0`** (or Vercel’s IPs) so serverless can connect.

3. **CORS** – In the **backend** project, set **`CORS_ORIGIN`** to your live frontend, e.g.  
   `https://your-app.vercel.app`  
   (comma-separate if you have preview URLs too.)

4. **Product images (`/uploads/...`)** – On Vercel, the API filesystem is **temporary**. Files saved under `uploads/` **do not persist** across deployments or cold starts. Images you uploaded **only on your PC** are **not** on Vercel. For production you should use **Cloudinary**, **S3**, or similar and store **full URLs** in MongoDB—or run the API on a VPS with a persistent disk.

---

## Frontend (Vite) on Vercel

| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_BASE_URL` | `https://your-api-project.vercel.app` | **Yes** |

- No trailing slash.
- Add this in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use a preview API).
- **Redeploy** the frontend after changing it (Vite bakes this in at **build** time).

---

## Backend (Express API) on Vercel

Set at least:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Your frontend origin(s), comma-separated |
| `JWT_SECRET` / auth-related vars | As in your local `.env` |
| `RAZORPAY_*`, `EMAIL_*`, etc. | If you use those features |

Redeploy after editing env vars.

---

## Quick checklist

- [ ] Frontend: `VITE_API_BASE_URL` = deployed API URL → redeploy frontend  
- [ ] Backend: `MONGO_URI` + Atlas network allows connections  
- [ ] Backend: `CORS_ORIGIN` includes your frontend URL  
- [ ] Images: plan for object storage or persistent server if you need uploads in production  
