# Troubleshooting Guide

## Frontend Fails to Connect to API
- **Symptom**: Network error in browser console.
- **Fix**: Verify `VITE_API_URL` exactly matches the backend origin. Check if `CORS_ORIGINS` in backend `.env.production` includes the frontend URL.

## Database Migrations Fail
- **Symptom**: `UndefinedTable` or schema mismatch errors.
- **Fix**: Re-trigger initialization or manually clear and recreate the DB if you are in development. For production, ensure PostgreSQL has active connections remaining.

## LLM Provider Times Out or Fails
- **Symptom**: Mock content returned during production, or 500 API errors.
- **Fix**: Check `api/system/llm-status`. Ensure API keys are active. Rate limiting from free-tier AI keys often causes fallback behavior. Ensure you have funded accounts.

## File Upload Fails
- **Symptom**: 400 Payload Too Large or Server Error.
- **Fix**: Ensure Nginx/Proxy isn't blocking sizes > 10MB. Verify `STORAGE_PROVIDER` bucket permissions (Supabase RLS policies must allow backend service key operations).
