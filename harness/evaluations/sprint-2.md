# Sprint 2 Evaluation: Upload Pipeline

## Verification Results
1. [PASS] `npx tsc --noEmit` passes for both infra and backend — exit code 0
2. [PASS] `cdk synth` succeeds — produces template with 3 Lambda functions (GetUploadUrl, ProcessThumbnail, plus a BucketNotificationsHandler)
3. [PASS] Upload URL Lambda IAM scoped to `s3:PutObject` on `originals/*` prefix only — verified in template line 612
4. [PASS] Thumbnail Lambda IAM: `s3:GetObject` on `originals/*`, `s3:PutObject` on `thumbnails/*`, DynamoDB write — verified in template lines 796, 814
5. [PASS] Both Lambdas use ARM64 — `Architectures: ["arm64"]` confirmed in template
6. [PASS] Presigned URL logic: 5-min expiry (PRESIGNED_URL_EXPIRY=300), content-type condition via ContentType param, 100MB max via fileSize validation
7. [PASS] JWT verification helper: validates issuer, audience, expiry, token_use, signature via JWKS with caching
8. [PASS] No hardcoded secrets — environment variables used for BUCKET_NAME, TABLE_NAME, USER_POOL_ID

## Grades
| Criterion | Score | Threshold | Result |
|-----------|-------|-----------|--------|
| Functionality | 8/10 | 7 | PASS |
| Code Quality | 8/10 | 6 | PASS |
| Completeness | 8/10 | 7 | PASS |

## Sprint Result: PASS

## Notes for Next Sprint
- Sharp bundling uses `commandHooks` with `npm install --cpu=arm64 --os=linux` since Docker is unavailable on this machine
- The `exif-reader` import uses `import exifReader from "exif-reader"` — verify this works at runtime since some exif libraries have different export patterns
- S3 CORS still allows `*` origins — should be tightened when CloudFront domain is known
- The ALLOWED_ORIGIN env var defaults to `*` — production deployment should set this to the actual CloudFront URL
