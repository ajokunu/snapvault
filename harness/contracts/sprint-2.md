# Sprint 2 Contract: Upload Pipeline (Presigned URLs + Thumbnail Lambda)

## What Will Be Built
Two Lambda functions wired into the CDK stack:
1. **get-upload-url**: Generates presigned S3 PUT URLs with security constraints
2. **process-thumbnail**: Triggered by S3 PutObject events, generates WebP thumbnails via Sharp, extracts EXIF, writes metadata to DynamoDB

## Files That Will Be Created/Modified
- `backend/package.json` — Lambda dependencies (Sharp, EXIF parser, AWS SDK)
- `backend/tsconfig.json` — TypeScript config for Lambda code
- `backend/src/get-upload-url/index.ts` — Presigned URL generator Lambda
- `backend/src/process-thumbnail/index.ts` — Thumbnail + EXIF processor Lambda
- `backend/src/shared/types.ts` — Shared TypeScript types
- `backend/src/shared/auth.ts` — JWT verification helper
- `infra/lib/constructs/api.ts` — Lambda constructs with Function URLs, IAM, S3 events

## Success Verification
1. [ ] `npx tsc --noEmit` passes for both infra and backend
2. [ ] `cdk synth` succeeds with Lambda functions, S3 event notification, and Function URLs in template
3. [ ] Upload URL Lambda has IAM permissions ONLY for s3:PutObject on the originals/ prefix
4. [ ] Thumbnail Lambda has IAM for s3:GetObject on originals/, s3:PutObject on thumbnails/, dynamodb:PutItem
5. [ ] Both Lambdas use ARM64 architecture in CDK config
6. [ ] Presigned URL logic includes: 5-min expiry, content-type condition, 100MB max size
7. [ ] JWT verification helper validates Cognito tokens with proper issuer/audience checks
8. [ ] No hardcoded secrets or AWS credentials in Lambda code

## Acceptance Thresholds
- Functionality: All verification steps pass
- Code Quality: Least-privilege IAM, proper error handling, types throughout
- Completeness: Both Lambdas fully implemented with CDK wiring
