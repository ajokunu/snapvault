# Sprint 3 Contract: Gallery & Albums API

## What Will Be Built
Lambda functions for the gallery and album management API, all behind Lambda Function URLs with JWT auth:
1. **get-gallery**: List photos with cursor-based pagination, get single photo metadata
2. **manage-albums**: CRUD for albums, add/remove photos from albums

## Files That Will Be Created/Modified
- `backend/src/get-gallery/index.ts` — Photo listing + single photo handler
- `backend/src/manage-albums/index.ts` — Album CRUD handler
- `infra/lib/constructs/api.ts` — Add new Lambda functions with Function URLs and IAM

## Success Verification
1. [ ] `npx tsc --noEmit` passes for backend and infra
2. [ ] `cdk synth` succeeds with new Lambda functions in template
3. [ ] Gallery Lambda reads from DynamoDB (read permissions only)
4. [ ] Albums Lambda has DynamoDB read+write permissions
5. [ ] All endpoints verify JWT and scope to authenticated user
6. [ ] Pagination uses DynamoDB lastEvaluatedKey (cursor), not offset
7. [ ] Response URLs use CloudFront domain prefix from CLOUDFRONT_DOMAIN env var

## Acceptance Thresholds
- Functionality: All verification steps pass
- Code Quality: Proper auth, typed responses, error handling
- Completeness: All 6 API endpoints implemented
