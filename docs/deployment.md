# Deployment Guide

CareerGPT is container-ready and can be deployed to modern cloud platforms (Render, Railway, Fly.io, AWS) using the provided `docker-compose.yml` or standard CI/CD hooks.

## Prerequisites
- A PostgreSQL 15+ database (e.g., Supabase, Neon, AWS RDS).
- Object Storage (Supabase Storage or AWS S3) for resumes.
- An API Key for Gemini or OpenAI.

## Local Deployment (Docker Compose)
1. Copy `.env.example` to `.env` and fill the variables.
2. Ensure Docker Desktop is running.
3. Run: `docker-compose up --build -d`
4. Access the frontend at `http://localhost:8080`.

## Production Deployment (Platform as a Service)

### Backend
1. Link your GitHub repository to a PaaS (e.g., Render Web Service).
2. Set the Build Command: `pip install -r requirements.txt`
3. Set the Start Command: `gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000`
4. Configure all environment variables (from `.env.production`).

### Frontend
1. Link the repository to Vercel, Netlify, or Cloudflare Pages.
2. Set Root Directory: `frontend`
3. Set Build Command: `npm run build`
4. Configure Environment Variable: `VITE_API_URL` pointing to your backend HTTPS URL.

## HTTPS & Domains
Ensure that the Frontend URL requires HTTPS. The Backend PaaS automatically provisions TLS/SSL certificates for the API endpoints. Ensure CORS origins correctly point to your custom domains.
