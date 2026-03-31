# Changelog

## [0.2.0] - 2026-03-31

### Added
- **CDK Infrastructure**: S3 (Intelligent-Tiering), DynamoDB, Cognito, CloudFront (OAC)
- **Upload Pipeline**: Presigned URL generation, Sharp thumbnail processor (ARM64), EXIF extraction
- **Gallery API**: Paginated photo listing, single photo metadata, cursor-based pagination
- **Albums API**: Create albums, add/remove photos, album photo listing via DynamoDB GSI
- **React Frontend**: Vite + Tailwind PWA with Cognito auth, protected routes
- **Photo Upload UI**: Drag-and-drop zone, concurrent uploads (max 5), per-file progress bars
- **Gallery UI**: Responsive photo grid (2-5 columns), lazy-loaded thumbnails, infinite scroll
- **Lightbox Viewer**: Full-resolution image viewer, keyboard + swipe navigation
- **EXIF Panel**: Camera, aperture, shutter speed, ISO, GPS with Google Maps link
- **Albums UI**: Create albums, album grid with covers, album detail view
- **Error Boundary**: Graceful error recovery with reload button
- **Security**: BlockPublicAccess, OAC, least-privilege IAM, JWT verification, in-memory auth tokens
- **README**: Architecture diagram, cost breakdown, deploy instructions

## [0.1.0] - 2026-03-31

### Added
- Project initialization with monorepo workspace structure
- CLAUDE.md project conventions
- `/harness` skill for multi-agent build orchestration
