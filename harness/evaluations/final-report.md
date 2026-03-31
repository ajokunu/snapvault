# SnapVault — Final Harness Report

## Project Summary
SnapVault is a complete personal photo/video cloud storage application built on AWS, targeting ~$2-4.60/month for 200GB. Built across 7 sprints using the `/harness` multi-agent orchestrator.

## Sprint Results

| Sprint | Name | Attempts | Func | Quality | Design | Complete | Result |
|--------|------|----------|------|---------|--------|----------|--------|
| 1 | CDK Infrastructure | 1 | 9/10 | 8/10 | N/A | 9/10 | PASS |
| 2 | Upload Pipeline | 1 | 8/10 | 8/10 | N/A | 8/10 | PASS |
| 3 | Gallery & Albums API | 1 | 8/10 | 8/10 | N/A | 8/10 | PASS |
| 4 | Frontend + Auth | 1 | 8/10 | 8/10 | 8/10 | 8/10 | PASS |
| 5 | Upload + Gallery UI | 1 | 8/10 | 8/10 | 8/10 | 8/10 | PASS |
| 6 | Albums + EXIF | 1 | 8/10 | 8/10 | 8/10 | 8/10 | PASS |
| 7 | Polish + Production | 1 | 8/10 | 8/10 | N/A | 8/10 | PASS |

**All 7 sprints passed on first attempt.**

## What Was Built

### Infrastructure (CDK)
- S3 bucket with Intelligent-Tiering (archive at 90d, deep archive at 180d)
- DynamoDB single-table with albumIndex GSI
- Cognito User Pool (Lite tier, email sign-in, self-signup disabled)
- CloudFront distribution with OAC, security headers, SPA error routing
- 4 Lambda functions (ARM64): upload URL, thumbnail processor, gallery API, albums API

### Backend (TypeScript Lambda)
- Presigned URL generation with 5-min expiry, content-type + size validation
- Sharp thumbnail processing (400px WebP) triggered by S3 events
- EXIF extraction (camera, aperture, shutter, ISO, GPS)
- Gallery API with cursor-based DynamoDB pagination
- Albums API: create, list, add/remove photos
- JWT verification via JWKS with caching

### Frontend (React + Vite + Tailwind PWA)
- Cognito auth flow (sign-in, sign-out, in-memory tokens)
- Drag-and-drop upload with concurrent uploads (max 5) and progress bars
- Responsive photo grid (2-5 columns based on screen width)
- Lazy-loaded thumbnails with IntersectionObserver
- Lightbox viewer with keyboard + swipe navigation
- EXIF metadata panel with Google Maps GPS links
- Albums: create, view, browse photos
- Error boundary with graceful recovery
- PWA manifest for installability
- Dark theme (slate/indigo palette)

## File Count
- `infra/` — 8 files (CDK stack + constructs)
- `backend/` — 7 files (4 Lambda handlers + shared auth/types)
- `frontend/` — 18 files (pages, components, hooks, services)
- `harness/` — 11 files (spec, contracts, evaluations)
- Root — 5 files (package.json, CLAUDE.md, README.md, CHANGELOG.md, .gitignore)

## Known Limitations
- Video files stored but not playable in-browser (MVP scope)
- No auto-upload from phone camera roll (manual upload via PWA)
- No search, sharing, or face detection
- Albums support one-at-a-time (GSI albumSortKey overwritten)
- Cognito SDK stores refresh tokens internally — custom storage adapter needed for full in-memory compliance
- S3 CORS allows `*` origins — must be tightened to CloudFront domain after deployment

## Security Posture
- S3 BlockPublicAccess: all four enabled
- CloudFront OAC for S3 access
- Per-Lambda IAM: scoped to specific S3 prefixes
- JWT: verified via JWKS in every handler, issuer + expiry + token_use checked
- Presigned URLs: 5-min expiry, content-type condition, 100MB max
- Headers: HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy
- No hardcoded secrets anywhere in codebase
