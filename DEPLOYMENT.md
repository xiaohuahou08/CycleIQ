# CycleIQ Deployment Guide

This document outlines the deployment process for the CycleIQ application, which consists of a Next.js frontend and Flask backend, with Supabase PostgreSQL as the database.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         ┌──────▼──────────┐      ┌──────▼──────────┐
         │   Vercel       │      │   Render        │
         │   (Frontend)   │      │   (Backend)     │
         └──────┬──────────┘      └──────┬──────────┘
                │                        │
                └──────────┬─────────────┘
                           │
                    ┌──────▼──────────┐
                    │    Supabase     │
                    │  (PostgreSQL)   │
                    └─────────────────┘
```

## Deployments

### 1. Database: Supabase PostgreSQL

CycleIQ uses Supabase as the database provider.

#### Setup Steps

1. Sign up for a [Supabase account](https://supabase.com)
2. Create a new project
3. Note the following values from your Supabase project:
   - Project URL (found in Settings > API)
   - Anon Public Key (found in Settings > API)
   - Project JWT Secret (found in Settings > API > JWT Settings)
   - Database Connection String (found in Settings > Database)

4. Run database migrations:
   - The SQL migration files are located in `supabase/migrations/`
   - You can run these migrations through the Supabase SQL Editor

#### Environment Variables for Supabase

```
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://user:password@host:port/dbname
```

### 2. Backend: Render

The Flask backend is deployed to Render.

#### Configuration Files

- `render.yaml`: Blueprint for Render deployment
- `backend/requirements.txt`: Python dependencies
- `Dockerfile`: Container configuration

#### Setup Steps

1. Sign up for a [Render account](https://render.com)
2. Create a new Web Service connected to your GitHub repository
3. Configure the following environment variables in Render:

```
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=your-secret-key-here
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=your-supabase-database-url
```

4. Deploy the service - Render will automatically build and deploy

#### Health Check Endpoint

Render will perform health checks on:
- `GET /health`

This endpoint returns:
```json
{
  "status": "ok",
  "timestamp": "2026-04-28T15:30:00.000Z"
}
```

### 3. Frontend: Vercel

The Next.js frontend is deployed to Vercel.

#### Setup Steps

1. Sign up for a [Vercel account](https://vercel.com)
2. Import your GitHub repository into Vercel
3. Configure the following environment variables in the Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

4. Configure the Project Settings:
   - Framework Preset: Next.js
   - Root Directory: apps/web

5. Deploy! Vercel will automatically deploy when you push to the main branch

## CORS Configuration

The Flask backend includes CORS configuration to allow requests from your Vercel frontend.

Update `backend/app.py` to include your frontend domain:

```python
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://your-cycleiq-app.vercel.app",
            "http://localhost:3000"
        ]
    }
})
```

## API Endpoints

### Authentication

All protected endpoints require a valid Supabase JWT in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Trades API

- `GET /api/trades` - List all trades for the authenticated user
  - Optional query params: `status=open`
- `POST /api/trades` - Create a new trade
- `GET /api/trades/<id>` - Get a specific trade
- `PUT /api/trades/<id>` - Update a trade
- `DELETE /api/trades/<id>` - Delete a trade

### Dashboard API

- `GET /api/dashboard/summary` - Get dashboard metrics summary
- `GET /api/dashboard/positions` - Get active positions grouped by ticker
- `GET /api/dashboard/cycles` - Get wheel cycle status per ticker

### Cycles API

- `GET /api/cycles` - List wheel strategy cycles

## Development Environment

### Running Locally

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
export FLASK_APP=app.py
export FLASK_ENV=development
# Set all necessary environment variables
flask run
```

#### Frontend

```bash
cd apps/web
npm install
npm run dev
```

#### Environment Variables for Local Development

Create `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Deployment Workflow

### Pull Requests

- When a PR is opened against main:
  - Vercel automatically creates a preview deployment
  - Render can optionally create a preview environment
  - GitHub Actions runs tests (if configured)

### Production Deployment

- When merging a PR to main:
  - Vercel automatically deploys to production
  - Render automatically deploys to production
  - Both deployments use the main branch

## Security Notes

1. Never commit environment variables or secrets to version control
2. Always use environment-specific configuration (dev, staging, prod)
3. Rotate secrets regularly
4. Enable 2FA on all platform accounts
5. Restrict database access IP addresses in Supabase

## Troubleshooting

### Backend Issues

- Check Render logs for errors
- Verify database connection strings and credentials
- Confirm CORS settings include your frontend domain
- Validate JWT token and Supabase configuration

### Frontend Issues

- Check browser console for API errors
- Verify environment variables are set correctly in Vercel
- Confirm backend is accessible and healthy

### Database Issues

- Check Supabase logs for connection errors
- Validate migration files were applied correctly
- Confirm RLS (Row Level Security) policies are configured properly
