# ClassAbly Production Status

## Current Inspection Summary

- Repository root: `classably/classably`
- Frontend: `web/` (React + Vite + TypeScript)
- Backend: `backend/` (FastAPI + SQLAlchemy + PostgreSQL/Redis)
- Live backend routes: currently `/api/auth/*` for auth routes.
- Existing integration issues addressed: backend auth route prefix updated to `/api/auth/*` and frontend auth client aligned.
- Live backend confirms supported auth routes are only `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, and `/api/auth/profile`.

## Initial Status

- Frontend startup: NOT YET VERIFIED
- Backend startup: VERIFIED (local workspace app serving Swagger/OpenAPI)
- Database: PARTIAL (configured via `.env` to PostgreSQL, yet runtime DB connectivity not fully validated)
- Authentication: VERIFIED for login/register route mapping
- Forgot/reset password: NOT SUPPORTED on current live backend
- Role routing: NOT YET VERIFIED
- WebSocket: NOT YET VERIFIED
- WebRTC: NOT YET VERIFIED

## First priorities

1. Confirm backend startup and database connectivity.
2. Confirm frontend startup and API integration.
3. Verify auth registration/login/session persistence.
4. Verify role-based route handling.

## Current known issues

- Frontend currently references `/api/auth/forgot-password` and `/api/auth/reset-password`, but the live backend does not expose those endpoints.
- Backend README still documents SQLite as the default, while `.env` currently points to PostgreSQL.
- Need to confirm server startup uses current local backend repository.

## Notes

- `backend/app/main.py` mounts auth router under `/api`, while the auth router itself is defined with prefix `/auth`.
- `web/src/api/client.ts` now points to `/api/auth/*`.
