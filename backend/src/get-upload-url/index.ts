import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ulid } from "ulid";
import { verifyToken, AuthError, corsHeaders } from "../shared/auth";
import {
  UploadUrlRequest,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  PRESIGNED_URL_EXPIRY,
} from "../shared/types";

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME!;

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const headers = corsHeaders();

  // Handle CORS preflight
  if (event.requestContext.http.method === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    // Verify JWT
    const tokenPayload = await verifyToken(event.headers);
    const userId = tokenPayload.sub;

    // Parse and validate request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Request body is required" }),
      };
    }

    const body = JSON.parse(event.body) as UploadUrlRequest;

    if (!body.fileName || !body.contentType || !body.fileSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "fileName, contentType, and fileSize are required",
        }),
      };
    }

    // Validate content type
    if (
      !ALLOWED_MIME_TYPES.includes(
        body.contentType as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Invalid content type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
        }),
      };
    }

    // Validate file size
    if (body.fileSize > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        }),
      };
    }

    // Generate photo ID and S3 key
    const photoId = ulid();
    const extension = body.fileName.split(".").pop() ?? "bin";
    const s3Key = `originals/${userId}/${photoId}.${extension}`;

    // Generate presigned URL with conditions
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: body.contentType,
      ContentLength: body.fileSize,
      Metadata: {
        "user-id": userId,
        "photo-id": photoId,
        "original-filename": encodeURIComponent(body.fileName),
      },
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        uploadUrl,
        photoId,
        s3Key,
      }),
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        statusCode: err.statusCode,
        headers,
        body: JSON.stringify({ error: err.message }),
      };
    }

    console.error("Error generating upload URL:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}
