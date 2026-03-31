# Sprint 1 Contract: CDK Infrastructure Foundation

## What Will Be Built
Complete AWS CDK infrastructure stack with all cloud resources needed for SnapVault:
- S3 bucket with Intelligent-Tiering and BlockPublicAccess
- DynamoDB table with single-table design and GSI
- Cognito User Pool (Lite tier, email sign-in)
- CloudFront distribution with OAC for S3 access
- Lambda function shells (placeholders for Sprint 2)

## Files That Will Be Created/Modified
- `infra/package.json` — CDK project dependencies
- `infra/tsconfig.json` — TypeScript config (strict mode)
- `infra/cdk.json` — CDK app config
- `infra/bin/app.ts` — CDK app entry point
- `infra/lib/snapvault-stack.ts` — Main stack composing all constructs
- `infra/lib/constructs/storage.ts` — S3 bucket construct
- `infra/lib/constructs/database.ts` — DynamoDB table + GSI construct
- `infra/lib/constructs/auth.ts` — Cognito construct
- `infra/lib/constructs/cdn.ts` — CloudFront distribution construct

## Success Verification
1. [ ] `cd infra && npx cdk synth` produces valid CloudFormation YAML/JSON without errors
2. [ ] S3 bucket in template uses IntelligentTiering and has BlockPublicAccess on all four settings
3. [ ] DynamoDB table has PK=userId, SK=photoId, GSI albumIndex with PK=userId SK=albumId#photoId
4. [ ] Cognito User Pool present with email sign-in configuration
5. [ ] CloudFront distribution uses OAC (not OAI) for S3 origin
6. [ ] No hardcoded AWS account IDs, regions, or secrets anywhere in code
7. [ ] `npx tsc --noEmit` passes with zero errors in strict mode

## Acceptance Thresholds
- Functionality: All verification steps pass
- Code Quality: No lint errors, types pass, no hardcoded secrets, clean construct separation
- Completeness: All 5 AWS resources present and properly configured
