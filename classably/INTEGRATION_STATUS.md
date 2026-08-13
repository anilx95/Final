# ClassAbly Integration Status

## Current Workspace
- Frontend: `web/` (React + Vite)
- Backend: `backend/` (FastAPI)
- Database: PostgreSQL via Docker Compose
- Redis: Redis via Docker Compose
- No `openapi.json` file present in repository root.

## Inspection Summary
- `web/package.json` confirms React 18, Vite, Tailwind, React Router, React Query, Axios.
- `web/src/api/client.ts` centralizes frontend API calls, but some endpoints may mismatch backend contract.
- `web/src/context/AuthContext.tsx` expects `login` and `register` responses to include `access_token` and `user`.
- Backend `/auth/login` returns `{ access_token, token_type }` only.
- Backend `/auth/register` returns User data only, no token.
- Backend auth token decode uses `id` claim, but token created with subject=user.email only.
- WebRTC signaling uses backend WebSocket at `/events/{classroom_id}` without auth.
- LectureStudio and StudentLiveLecture both hardcode classroom_id=1 and peer routing to `/events/1`.
- Backend `lecture_session_router.py` includes lecture session start/active/end and subtitles/raise-hand endpoints.

## Integration Status
- [ ] Backend starts without errors
- [ ] PostgreSQL connection works
- [ ] Frontend starts without errors
- [ ] Registration works
- [ ] Login works
- [ ] `/auth/me` works
- [ ] Authentication survives refresh
- [ ] Admin role routing works
- [ ] Teacher role routing works
- [ ] Student role routing works
- [ ] Admin APIs are connected
- [ ] Teacher APIs are connected
- [ ] Student APIs are connected
- [ ] Teacher starts lecture
- [ ] Teacher camera opens
- [ ] Teacher microphone opens
- [ ] WebSocket signaling connects
- [ ] Teacher and student join same lecture session
- [ ] WebRTC offer reaches student
- [ ] Student answer reaches teacher
- [ ] ICE candidates exchange
- [ ] Peer connection reaches connected state
- [ ] Student receives remote MediaStream
- [ ] Student sees teacher video
- [ ] Student hears teacher audio
- [ ] Late student joining works
- [ ] Refresh/reconnect works

## Critical Findings
- Backend token creation and decode contract mismatch.
- Frontend register/login expects backend to return auth token and user object together.
- Backend auth dependency expects JWT payload with `id`, but token is created with subject=email.
- Backend `ALLOWED_ORIGINS` currently includes localhost ports and may allow all origins if env not configured.
- No frontend `openapi.json`, but backend routes are visible in code.

## Next Steps
1. Fix backend auth token payload to include user ID and optionally email.
2. Fix backend login/register response contract or adapt frontend to current backend.
3. Verify `/auth/me` returns correct user model.
4. Ensure frontend `VITE_API_URL` and dev proxy configuration align with backend local host.
5. Validate role-based redirects and protected routes.
6. Test login/register flows with backend running.
7. Fix WebRTC signaling event routing and classroom IDs.
8. Test live lecture end-to-end after auth is stable.
