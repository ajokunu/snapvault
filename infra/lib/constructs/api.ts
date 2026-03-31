import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";
import * as path from "path";

export interface ApiConstructProps {
  bucket: s3.IBucket;
  table: dynamodb.ITable;
  userPool: cognito.IUserPool;
}

export class ApiConstruct extends Construct {
  public readonly getUploadUrlFunction: nodejs.NodejsFunction;
  public readonly processThumbnailFunction: nodejs.NodejsFunction;
  public readonly getUploadUrlFunctionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const backendRoot = path.join(__dirname, "..", "..", "..", "backend");

    // Shared Lambda settings
    const sharedLambdaProps: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: [],
      },
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
        TABLE_NAME: props.table.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
        NODE_OPTIONS: "--enable-source-maps",
      },
    };

    // --- Get Upload URL Lambda ---
    this.getUploadUrlFunction = new nodejs.NodejsFunction(
      this,
      "GetUploadUrl",
      {
        ...sharedLambdaProps,
        functionName: "snapvault-get-upload-url",
        entry: path.join(backendRoot, "src", "get-upload-url", "index.ts"),
        handler: "handler",
        description: "Generates presigned S3 upload URLs for photo uploads",
      }
    );

    // Least privilege: only PutObject to originals/ prefix
    this.getUploadUrlFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:PutObject"],
        resources: [`${props.bucket.bucketArn}/originals/*`],
      })
    );

    // Function URL for the upload endpoint
    this.getUploadUrlFunctionUrl = this.getUploadUrlFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // Auth handled in Lambda via JWT
      cors: {
        allowedOrigins: ["*"], // Tightened to CloudFront domain in production
        allowedHeaders: ["Content-Type", "Authorization"],
        allowedMethods: [lambda.HttpMethod.POST, lambda.HttpMethod.OPTIONS],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // --- Process Thumbnail Lambda ---
    this.processThumbnailFunction = new nodejs.NodejsFunction(
      this,
      "ProcessThumbnail",
      {
        ...sharedLambdaProps,
        functionName: "snapvault-process-thumbnail",
        entry: path.join(
          backendRoot,
          "src",
          "process-thumbnail",
          "index.ts"
        ),
        handler: "handler",
        timeout: cdk.Duration.minutes(2),
        memorySize: 1024, // Sharp needs more memory for image processing
        description:
          "Generates thumbnails and extracts EXIF from uploaded photos",
        bundling: {
          ...sharedLambdaProps.bundling,
          // Sharp requires platform-specific binary for ARM64 Lambda
          nodeModules: ["sharp"],
          commandHooks: {
            beforeBundling(): string[] { return []; },
            afterBundling(_inputDir: string, outputDir: string): string[] {
              return [
                `cd "${outputDir}"`,
                "npm install --cpu=arm64 --os=linux sharp",
              ];
            },
            beforeInstall(): string[] { return []; },
          },
        },
      }
    );

    // Least privilege: read originals, write thumbnails, write DynamoDB
    this.processThumbnailFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject"],
        resources: [`${props.bucket.bucketArn}/originals/*`],
      })
    );

    this.processThumbnailFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:PutObject"],
        resources: [`${props.bucket.bucketArn}/thumbnails/*`],
      })
    );

    props.table.grantWriteData(this.processThumbnailFunction);

    // S3 event trigger: PutObject to originals/ prefix
    props.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(this.processThumbnailFunction),
      { prefix: "originals/" }
    );

    // --- Gallery API Lambda ---
    const getGalleryFunction = new nodejs.NodejsFunction(
      this,
      "GetGallery",
      {
        ...sharedLambdaProps,
        functionName: "snapvault-get-gallery",
        entry: path.join(backendRoot, "src", "get-gallery", "index.ts"),
        handler: "handler",
        description: "Lists photos and returns photo metadata",
      }
    );

    props.table.grantReadData(getGalleryFunction);

    const getGalleryFunctionUrl = getGalleryFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedHeaders: ["Content-Type", "Authorization"],
        allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.OPTIONS],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // --- Albums API Lambda ---
    const manageAlbumsFunction = new nodejs.NodejsFunction(
      this,
      "ManageAlbums",
      {
        ...sharedLambdaProps,
        functionName: "snapvault-manage-albums",
        entry: path.join(backendRoot, "src", "manage-albums", "index.ts"),
        handler: "handler",
        description: "Album CRUD and photo-album management",
      }
    );

    props.table.grantReadWriteData(manageAlbumsFunction);

    const manageAlbumsFunctionUrl = manageAlbumsFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedHeaders: ["Content-Type", "Authorization"],
        allowedMethods: [
          lambda.HttpMethod.GET,
          lambda.HttpMethod.POST,
          lambda.HttpMethod.DELETE,
          lambda.HttpMethod.OPTIONS,
        ],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Outputs
    new cdk.CfnOutput(this, "UploadUrlEndpoint", {
      value: this.getUploadUrlFunctionUrl.url,
      description: "Lambda Function URL for upload URL generation",
    });

    new cdk.CfnOutput(this, "GalleryEndpoint", {
      value: getGalleryFunctionUrl.url,
      description: "Lambda Function URL for gallery API",
    });

    new cdk.CfnOutput(this, "AlbumsEndpoint", {
      value: manageAlbumsFunctionUrl.url,
      description: "Lambda Function URL for albums API",
    });
  }
}
