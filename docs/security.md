# Security & Compliance

CareerGPT implements security best practices targeting OWASP standards.

## 1. Secrets Management
- All keys (`SECRET_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`) reside exclusively backend-side.
- The React frontend relies entirely on secure JWTs for state verification.

## 2. Authentication & Authorization
- Passwords are cryptographically hashed using `pbkdf2_sha256` (via Passlib).
- JWTs expire after `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Every protected endpoint forces `Depends(get_current_user)`.
- User Data Isolation: Resources (Resume, Graph, Interview) are filtered by `user_id == current_user.id`.

## 3. Upload Security
- Strict MIME-type checking (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
- Max payload size checks (10MB).
- Uploads are renamed using unique UUIDs (`resume_id`) preventing Path Traversal.

## 4. Rate Limiting
- Core endpoints (`/auth/login`, `/resume/upload`, `/interview/answer`) are wrapped in a sliding-window rate limit dependency.

## 5. Network (CORS)
- `CORS_ORIGINS` explicitly whitelists trusted domains (no wildcard `*` for production).
