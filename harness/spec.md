# SnapVault — Product Spec

## Overview
SnapVault is a personal photo/video cloud storage app built on AWS, targeting ~$2-4.60/month for 200GB. It uses S3 Intelligent-Tiering for storage with CloudFront, Lambda, DynamoDB, and Cognito all riding permanent free tiers. The frontend is a mobile-first PWA with drag-drop uploads, a gallery grid, lightbox viewer, albums, and EXIF metadata display.

## Architecture
```
Browser (React PWA)
  │
  ├── POST /api/upload-url ──→ Lambda (generates presigned S3 PUT URL)
  │
  ├── PUT file ──────────────→ S3 (originals/{userId}/{photoId})
  │                              │ S3 Event Notification
  │                              ▼
  │                        Lambda + Sharp (ARM64)
  │                          ├── writes thumbnail to S3 (thumbnails/{userId}/{photoId})
  │                          └── writes metadata to DynamoDB
  │
  ├── GET /api/photos ──────→ Lambda ──→ DynamoDB ──→ paginated photo list
  ├── GET /api/albums ──────→ Lambda ──→ DynamoDB ──→ album CRUD
  │
  └── GET /media/* ─────────→ CloudFront ──→ S3 (OAC, no direct S3 access)

Infrastructure: AWS CDK (TypeScript)
Auth: Cognito Lite (JWT verified in every Lambda handler)
```

## Sprint Plan

### Sprint 1: CDK Infrastructure Foundation
**Delivers:** Deployable CDK stack with S3 bucket (Intelligent-Tiering), DynamoDB table, Cognito User Pool, and CloudFront distribution. No application code yet — just the cloud resources.
**Success criteria:**
- [ ] `cdk synth` produces valid CloudFormation without errors
- [ ] S3 bucket uses IntelligentTiering with archive access tiers enabled
- [ ] S3 bucket has BlockPublicAccess enabled on all four settings
- [ ] DynamoDB table has PK=userId (String), SK=photoId (String), and a GSI named albumIndex (PK=userId, SK=albumId#photoId)
- [ ] Cognito User Pool configured with email sign-in, self-signup disabled
- [ ] CloudFront distribution uses OAC for S3 origin access
- [ ] No hardcoded AWS account IDs, regions, or secrets in code
- [ ] TypeScript compiles with strict mode, no errors
**Depends on:** nothing

### Sprint 2: Upload Pipeline (Presigned URLs + Thumbnail Lambda)
**Delivers:** Two Lambda functions: one generates presigned S3 upload URLs, one processes uploads (generates thumbnails via Sharp, extracts EXIF, writes DynamoDB). Both wired into CDK stack with proper IAM and S3 event triggers.
**Success criteria:**
- [ ] Upload URL Lambda generates valid presigned PUT URLs scoped to user's prefix
- [ ] Presigned URLs have 5-minute expiry, content-type condition, 100MB content-length limit
- [ ] Thumbnail Lambda triggers on S3 PutObject to `originals/` prefix
- [ ] Thumbnails generated at 400px width in WebP format, written to `thumbnails/` prefix
- [ ] EXIF data (date, camera, GPS, dimensions) extracted and stored in DynamoDB
- [ ] Lambda IAM roles follow least privilege (each Lambda only accesses what it needs)
- [ ] Both Lambdas use ARM64 architecture
- [ ] `cdk synth` still succeeds with new resources
**Depends on:** Sprint 1

### Sprint 3: Gallery & Albums API
**Delivers:** Lambda functions for listing photos (paginated), getting single photo metadata, and album CRUD (create, list, add/remove photos). All behind Lambda Function URLs with JWT auth verification.
**Success criteria:**
- [ ] GET /api/photos returns paginated photo list for authenticated user (DynamoDB cursor pagination)
- [ ] GET /api/photos/:id returns single photo with full metadata including EXIF
- [ ] POST /api/albums creates a named album
- [ ] GET /api/albums lists user's albums with cover photo
- [ ] POST /api/albums/:id/photos adds photos to album
- [ ] DELETE /api/albums/:id/photos/:photoId removes photo from album
- [ ] All endpoints verify Cognito JWT and scope queries to the authenticated user's partition
- [ ] Response URLs point to CloudFront (not raw S3)
- [ ] Invalid/missing JWT returns 401
**Depends on:** Sprint 2

### Sprint 4: React Frontend Foundation + Auth
**Delivers:** Vite + React + Tailwind project with Cognito auth flow (sign-in, sign-out), protected routes, app shell with navigation, and PWA manifest. Deployed as static files to S3 + CloudFront.
**Success criteria:**
- [ ] `npm run build` produces a working production build
- [ ] `npm run dev` starts dev server on localhost
- [ ] Sign-in form authenticates against Cognito and stores tokens in memory (not localStorage)
- [ ] Protected routes redirect to sign-in when unauthenticated
- [ ] App shell renders with header/nav on mobile and desktop
- [ ] Tailwind CSS configured and producing styles
- [ ] PWA manifest.json present with app name, icons, theme color
- [ ] Service worker registered for offline capability
- [ ] Mobile viewport meta tag present, responsive layout works
**Depends on:** Sprint 3

### Sprint 5: Photo Upload + Gallery UI
**Delivers:** Drag-and-drop upload with progress bars, responsive photo grid with lazy-loaded thumbnails, and lightbox viewer with keyboard/swipe navigation.
**Success criteria:**
- [ ] Drag-and-drop zone accepts files and initiates upload flow
- [ ] File picker button also available for upload
- [ ] Upload shows per-file progress bar with percentage
- [ ] Multiple files upload concurrently (max 5 simultaneous)
- [ ] Gallery renders thumbnails in responsive grid (2 cols mobile, 3 tablet, 4+ desktop)
- [ ] Thumbnails lazy-load with IntersectionObserver (not all at once)
- [ ] Clicking thumbnail opens lightbox with full-resolution image
- [ ] Lightbox supports arrow keys and swipe gestures for navigation
- [ ] Infinite scroll loads next page when approaching bottom
- [ ] Empty state shown when no photos uploaded yet
- [ ] Upload errors display clearly (not silent failures)
**Depends on:** Sprint 4

### Sprint 6: Albums + EXIF Display
**Delivers:** Album management UI (create, view, add photos) and EXIF metadata panel in the lightbox viewer.
**Success criteria:**
- [ ] User can create a new album with a name
- [ ] Albums page shows grid of albums with cover photo thumbnails
- [ ] Clicking an album shows only that album's photos in a grid
- [ ] Photos can be added to albums from the gallery view (multi-select + assign)
- [ ] EXIF panel in lightbox shows: date taken, camera model, dimensions, aperture, shutter speed, ISO
- [ ] GPS coordinates shown as a Google Maps link (if present in EXIF)
- [ ] Empty states handled (no albums, empty album)
- [ ] Delete photo functionality with confirmation
**Depends on:** Sprint 5

### Sprint 7: Polish & Production Readiness
**Delivers:** Error boundaries, loading skeletons, optimized S3 lifecycle, security headers, and documentation.
**Success criteria:**
- [ ] Error boundary catches component errors with friendly fallback UI
- [ ] Loading skeletons show during data fetches (not blank screens or spinners)
- [ ] S3 lifecycle rule transitions objects untouched for 30 days to Infrequent Access
- [ ] CloudFront response headers include: Strict-Transport-Security, Content-Security-Policy, X-Frame-Options DENY, X-Content-Type-Options nosniff
- [ ] CloudFront cache behaviors: thumbnails 1 year, API no-cache, frontend assets hashed filenames
- [ ] No unhandled promise rejections in browser console during normal use
- [ ] README.md with: architecture diagram, prerequisites, deploy instructions, cost estimate
- [ ] CHANGELOG.md updated with all sprint deliverables
**Depends on:** Sprint 6

## Data Model

### DynamoDB Table: `snapvault-photos`

**Primary Key:** PK = `userId` (String), SK = `photoId` (String, ULID for sort order)

**Attributes:**
- `fileName` (String) — original filename
- `contentType` (String) — MIME type
- `size` (Number) — bytes
- `width` (Number) — pixel width
- `height` (Number) — pixel height
- `dateTaken` (String) — ISO date from EXIF or upload time
- `camera` (String) — camera model from EXIF
- `aperture` (String) — f-stop
- `shutterSpeed` (String) — exposure time
- `iso` (Number) — ISO speed
- `gpsLat` (Number) — latitude
- `gpsLon` (Number) — longitude
- `albums` (StringSet) — album IDs this photo belongs to
- `status` (String) — `processing` | `ready` | `failed`
- `createdAt` (String) — ISO timestamp
- `s3Key` (String) — original file S3 key
- `thumbnailKey` (String) — thumbnail S3 key

**GSI: `albumIndex`**
- PK = `userId` (String)
- SK = `albumId#photoId` (String)
- Projects all attributes

### Albums
Albums are stored as items in the same table with SK = `ALBUM#albumId`:
- `albumName` (String)
- `coverPhotoId` (String)
- `photoCount` (Number)
- `createdAt` (String)

## Out of Scope (MVP)
- Video playback/streaming (videos stored but not played in-browser)
- Auto-upload from phone camera roll (manual upload only)
- Sharing/public links
- Face detection or AI tagging
- Multi-user collaboration (single-family use)
- Search functionality
- Bulk download/export
- Image editing
