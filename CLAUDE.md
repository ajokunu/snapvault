# SnapVault

Personal photo/video cloud storage. Target cost: ~$2-4.60/mo for 200GB on AWS.

## Stack
- Infrastructure: AWS CDK (TypeScript)
- Backend: Lambda (TypeScript, ARM64) + DynamoDB + S3
- Frontend: React + Vite + Tailwind CSS (TypeScript, PWA)
- Auth: Cognito Lite
- CDN: CloudFront

## Conventions
- All TypeScript, strict mode
- No secrets in code — use CDK context or environment variables
- Lambda functions: one handler per directory under `backend/src/`
- CDK constructs: one construct per file under `infra/lib/constructs/`
- Frontend: functional components, custom hooks for data fetching
- Commits: `sprint-N: feature name` format during harness builds
- Presigned URLs for all uploads (browser → S3 direct)
- In-memory auth tokens only (never localStorage)
- S3 BlockPublicAccess enabled, CloudFront OAC for access

## Architecture
- S3 Intelligent-Tiering for storage (auto-optimizes cost)
- Lambda Function URLs behind CloudFront (no API Gateway cost)
- DynamoDB single-table design (PK: userId, SK: photoId, GSI for albums)
- Sharp on ARM64 Lambda for thumbnail generation
- CloudFront serves static frontend + images + API
