# SnapVault

Ultra-cheap personal photo & video cloud storage on AWS. 200GB for ~$2-4.60/month.

## Architecture

```
Browser (React PWA)
  |
  +-- POST /api/upload-url --> Lambda --> presigned S3 PUT URL
  |
  +-- PUT file ------------>  S3 (originals/{userId}/{id})
  |                              | S3 Event
  |                              v
  |                        Lambda + Sharp (ARM64)
  |                          +-- thumbnails/ (400px WebP)
  |                          +-- DynamoDB (metadata + EXIF)
  |
  +-- GET /api/photos -----> Lambda --> DynamoDB --> paginated list
  +-- GET /api/albums -----> Lambda --> DynamoDB --> album CRUD
  |
  +-- GET /media/* --------> CloudFront --> S3 (OAC)
```

## Cost Breakdown (200GB stored)

| Service | Free Tier | Monthly Cost |
|---------|-----------|-------------|
| S3 Intelligent-Tiering | — | $2.00-4.60 |
| CloudFront | 1TB/mo free forever | $0.00 |
| Lambda | 1M req/mo free forever | $0.00 |
| DynamoDB | 25GB free forever | $0.00 |
| Cognito Lite | 10K MAU free | $0.00 |
| ACM Certificate | Always free | $0.00 |
| **Total** | | **~$2-4.60/mo** |

## Prerequisites

- Node.js 22+
- AWS CLI configured with credentials
- AWS CDK CLI (`npm i -g aws-cdk`)

## Deploy

```bash
# Install dependencies
npm install

# Deploy infrastructure
cd infra && npx cdk deploy

# Note the outputs (UserPoolId, UserPoolClientId, CloudFront URL, Function URLs)

# Create a Cognito user (self-signup disabled)
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username your@email.com \
  --temporary-password TempPass123!

# Configure frontend
cp frontend/.env.example frontend/.env
# Edit .env with values from CDK outputs

# Build and deploy frontend
cd frontend && npm run build
aws s3 sync dist/ s3://<BUCKET_NAME>/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

## Stack

- **Infrastructure**: AWS CDK (TypeScript)
- **Backend**: Lambda (TypeScript, ARM64) + DynamoDB + S3
- **Frontend**: React + Vite + Tailwind CSS (PWA)
- **Auth**: Cognito Lite (JWT)
- **CDN**: CloudFront with OAC

## Security

- S3 BlockPublicAccess on all four settings
- CloudFront OAC (no direct S3 access)
- Per-Lambda least-privilege IAM roles
- JWT verification in every Lambda handler
- Presigned URLs: 5-min expiry, content-type conditions
- In-memory auth tokens (never localStorage)
- HSTS, X-Frame-Options, X-Content-Type-Options headers
