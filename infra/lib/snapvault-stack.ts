import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { StorageConstruct } from "./constructs/storage";
import { DatabaseConstruct } from "./constructs/database";
import { AuthConstruct } from "./constructs/auth";
import { CdnConstruct } from "./constructs/cdn";
import { ApiConstruct } from "./constructs/api";

export class SnapVaultStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const storage = new StorageConstruct(this, "Storage");
    const database = new DatabaseConstruct(this, "Database");
    const auth = new AuthConstruct(this, "Auth");
    const cdn = new CdnConstruct(this, "Cdn", {
      bucket: storage.bucket,
    });
    new ApiConstruct(this, "Api", {
      bucket: storage.bucket,
      table: database.table,
      userPool: auth.userPool,
    });

    // Outputs for frontend configuration
    new cdk.CfnOutput(this, "BucketName", {
      value: storage.bucket.bucketName,
      description: "S3 bucket for photo storage",
    });

    new cdk.CfnOutput(this, "TableName", {
      value: database.table.tableName,
      description: "DynamoDB table for photo metadata",
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: auth.userPool.userPoolId,
      description: "Cognito User Pool ID",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: auth.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    });

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${cdn.distribution.distributionDomainName}`,
      description: "CloudFront distribution URL",
    });
  }
}
