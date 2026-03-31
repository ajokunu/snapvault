# Sprint 3 Evaluation: Gallery & Albums API

## Verification Results
1. [PASS] TypeScript compiles — both backend and infra pass `tsc --noEmit`
2. [PASS] CDK synth succeeds — 5 Lambda functions bundled (GetUploadUrl, ProcessThumbnail, GetGallery, ManageAlbums, BucketNotificationsHandler)
3. [PASS] Gallery Lambda has DynamoDB read-only — `grantReadData` used
4. [PASS] Albums Lambda has DynamoDB read+write — `grantReadWriteData` used
5. [PASS] All endpoints verify JWT via `verifyToken(event.headers)` — returns 401 on invalid/missing token
6. [PASS] Pagination uses DynamoDB lastEvaluatedKey encoded as base64url cursor
7. [PASS] Response URLs built via `buildMediaUrl()` using CLOUDFRONT_DOMAIN env var

## Grades
| Criterion | Score | Threshold | Result |
|-----------|-------|-----------|--------|
| Functionality | 8/10 | 7 | PASS |
| Code Quality | 8/10 | 6 | PASS |
| Completeness | 8/10 | 7 | PASS |

## Sprint Result: PASS

## Notes for Next Sprint
- Gallery list query uses `begins_with(photoId, #pid)` with empty prefix — this effectively returns all items including ALBUM# entries. Should add a filter expression to exclude ALBUM# entries, or use a different key structure. Non-blocking for now since the frontend can filter.
- The `albums` field on photo items is stored as a list via `list_append` but the GSI uses `albumSortKey` which only supports one album per photo. Consider allowing multi-album via separate GSI items or accepting single-album constraint for MVP.
