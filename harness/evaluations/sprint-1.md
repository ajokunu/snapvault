# Sprint 1 Evaluation: CDK Infrastructure Foundation

## Verification Results
1. [PASS] `cdk synth` produces valid CloudFormation — exit code 0, only deprecation warning for pointInTimeRecovery
2. [PASS] S3 bucket uses IntelligentTiering — confirmed `IntelligentTieringConfigurations` in template with archive access tiers
3. [PASS] S3 BlockPublicAccess all four settings — BlockPublicAcls, BlockPublicPolicy, IgnorePublicAcls, RestrictPublicBuckets all true
4. [PASS] DynamoDB table has correct keys — PK=userId, SK=photoId, GSI albumIndex with PK=userId SK=albumSortKey
5. [PASS] Cognito User Pool present — AWS::Cognito::UserPool with email sign-in, UserPoolName=snapvault-users
6. [PASS] CloudFront OAC — AWS::CloudFront::OriginAccessControl present with OriginAccessControlOriginType=s3
7. [PASS] No hardcoded secrets — grep found no ARNs, account IDs, or credentials
8. [PASS] TypeScript strict compilation — `tsc --noEmit` exit code 0

## Grades
| Criterion | Score | Threshold | Result |
|-----------|-------|-----------|--------|
| Functionality | 9/10 | 7 | PASS |
| Code Quality | 8/10 | 6 | PASS |
| Completeness | 9/10 | 7 | PASS |

## Sprint Result: PASS

## Notes for Next Sprint
- The `pointInTimeRecovery` property uses a deprecated API — should migrate to `pointInTimeRecoverySpecification` when convenient (non-blocking)
- DynamoDB GSI sort key is `albumSortKey` (composite `albumId#photoId` value) — Sprint 2/3 must write this attribute correctly
- S3 CORS currently allows `*` origins — should be tightened to CloudFront domain once known
- CloudFront security headers include HSTS, X-Frame-Options DENY, X-Content-Type-Options, referrer-policy
