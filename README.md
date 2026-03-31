<p align="center">
  <img src="logo.png" alt="SnapVault" width="200" />
</p>

<h1 align="center">SnapVault</h1>

<p align="center">Personal photo and video storage on AWS. 200GB for about $3/month.</p>

---

Born from a [LinkedIn joke](https://www.linkedin.com/feed/) about parents filling up their phone storage with kid photos. Turns out you can beat iCloud's $0.99/50GB plan with some AWS free tiers and a weekend of work.

## How it works

You upload photos from your browser. They go straight to S3 (no server in the middle). A Lambda picks up the new file, generates a thumbnail, pulls the EXIF data, and writes it all to DynamoDB. CloudFront serves everything.

```
Browser (PWA)
  |
  +-- gets a presigned URL from Lambda
  +-- uploads directly to S3
  |       |
  |       +-- S3 event triggers thumbnail Lambda (Sharp, ARM64)
  |       +-- writes metadata + EXIF to DynamoDB
  |
  +-- gallery API reads from DynamoDB
  +-- images served through CloudFront
```

## What it costs

Most of the stack sits on permanent AWS free tiers. The only real cost is S3 storage.

| Service | Monthly |
|---------|---------|
| S3 Intelligent-Tiering (200GB) | $2-4.60 |
| CloudFront (1TB/mo free) | $0 |
| Lambda (1M req/mo free) | $0 |
| DynamoDB (25GB free) | $0 |
| Cognito (10K users free) | $0 |
| **Total** | **~$3/mo** |

Old photos automatically move to cheaper storage tiers over time. S3 Intelligent-Tiering handles this without any config.

## Features

- Drag and drop upload with progress bars
- Responsive photo grid (2-5 columns depending on screen)
- Lightbox with keyboard and swipe navigation
- EXIF metadata panel (camera, aperture, shutter speed, ISO, GPS with map link)
- Albums
- PWA (installable on your phone)
- Dark theme

## Stack

- **Infra**: CDK (TypeScript)
- **Backend**: Lambda on ARM64, DynamoDB, S3
- **Frontend**: React, Vite, Tailwind
- **Auth**: Cognito
- **CDN**: CloudFront with OAC

## Getting started

You need Node 22+, the AWS CLI, and CDK (`npm i -g aws-cdk`).

```bash
npm install

# deploy the infrastructure
cd infra && npx cdk deploy

# create yourself a user (self-signup is off)
aws cognito-idp admin-create-user \
  --user-pool-id <from CDK output> \
  --username you@email.com \
  --temporary-password TempPass123!

# set up the frontend config
cp frontend/.env.example frontend/.env
# fill in the values from CDK outputs

# build and push the frontend
cd frontend && npm run build
aws s3 sync dist/ s3://<bucket>/ --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

## Security

S3 is locked down (BlockPublicAccess on everything, CloudFront OAC for access). Each Lambda gets its own IAM role scoped to only the S3 prefixes and DynamoDB operations it needs. Auth tokens stay in memory, never localStorage. Presigned upload URLs expire after 5 minutes and enforce content-type and size limits. CloudFront adds HSTS, X-Frame-Options, and X-Content-Type-Options headers.
