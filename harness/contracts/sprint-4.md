# Sprint 4 Contract: React Frontend Foundation + Auth

## What Will Be Built
Vite + React + Tailwind PWA scaffold with Cognito auth flow, protected routes, and app shell.

## Files That Will Be Created/Modified
- `frontend/package.json` — React + Vite + Tailwind dependencies
- `frontend/vite.config.ts` — Vite configuration with PWA plugin
- `frontend/tsconfig.json` — TypeScript config
- `frontend/tailwind.config.js` — Tailwind configuration
- `frontend/index.html` — HTML entry point with viewport meta
- `frontend/public/manifest.json` — PWA manifest
- `frontend/src/main.tsx` — React entry point
- `frontend/src/App.tsx` — Router setup with protected routes
- `frontend/src/index.css` — Tailwind imports + base styles
- `frontend/src/services/auth.ts` — Cognito auth service (in-memory tokens)
- `frontend/src/services/api.ts` — API client with auth headers
- `frontend/src/pages/Login.tsx` — Sign-in form
- `frontend/src/pages/Gallery.tsx` — Gallery page shell
- `frontend/src/components/AppShell.tsx` — Layout with header/nav
- `frontend/src/components/ProtectedRoute.tsx` — Auth guard

## Success Verification
1. [ ] `npm run build` produces a production build without errors
2. [ ] `npm run dev` starts dev server on localhost
3. [ ] Sign-in form renders and accepts email/password
4. [ ] Auth tokens stored in memory (not localStorage)
5. [ ] Protected routes redirect to login when unauthenticated
6. [ ] App shell with header renders on mobile and desktop
7. [ ] PWA manifest.json present
8. [ ] Tailwind CSS producing styles

## Acceptance Thresholds
- Functionality: Build succeeds, routes work, auth flow complete
- Code Quality: Types throughout, no any, proper component structure
- Design Quality: Clean, mobile-first, not default unstyled
- Completeness: All files created, auth flow end-to-end
