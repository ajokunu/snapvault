import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { verifyToken, AuthError, corsHeaders } from "../shared/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN ?? "";

const PAGE_SIZE = 50;

function buildMediaUrl(key: string): string {
  if (CLOUDFRONT_DOMAIN) {
    return `https://${CLOUDFRONT_DOMAIN}/${key}`;
  }
  return key;
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const headers = corsHeaders();

  if (event.requestContext.http.method === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const tokenPayload = await verifyToken(event.headers);
    const userId = tokenPayload.sub;
    const method = event.requestContext.http.method;
    const path = event.rawPath;

    // GET /api/photos/:id — single photo
    const photoIdMatch = path.match(/\/api\/photos\/([A-Z0-9]+)$/i);
    if (method === "GET" && photoIdMatch) {
      const photoId = photoIdMatch[1]!;
      return await getPhoto(userId, photoId, headers);
    }

    // GET /api/photos — list photos
    if (method === "GET" && path === "/api/photos") {
      const cursor = event.queryStringParameters?.cursor;
      const limit = Math.min(
        parseInt(event.queryStringParameters?.limit ?? String(PAGE_SIZE), 10),
        100
      );
      return await listPhotos(userId, limit, cursor, headers);
    }

    // DELETE /api/photos/:id
    if (method === "DELETE" && photoIdMatch) {
      return {
        statusCode: 501,
        headers,
        body: JSON.stringify({ error: "Delete not yet implemented" }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        statusCode: err.statusCode,
        headers,
        body: JSON.stringify({ error: err.message }),
      };
    }
    console.error("Gallery API error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}

async function getPhoto(
  userId: string,
  photoId: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResultV2> {
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId, photoId },
    })
  );

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Photo not found" }),
    };
  }

  const photo = result.Item;
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ...photo,
      originalUrl: buildMediaUrl(photo.s3Key as string),
      thumbnailUrl: buildMediaUrl(photo.thumbnailKey as string),
    }),
  };
}

async function listPhotos(
  userId: string,
  limit: number,
  cursor: string | undefined,
  headers: Record<string, string>
): Promise<APIGatewayProxyResultV2> {
  const exclusiveStartKey = cursor
    ? JSON.parse(Buffer.from(cursor, "base64url").toString())
    : undefined;

  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :uid AND begins_with(photoId, #pid)",
      ExpressionAttributeNames: { "#pid": "" },
      ExpressionAttributeValues: { ":uid": userId },
      ScanIndexForward: false, // newest first (ULID sorts chronologically)
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const photos = (result.Items ?? []).map((item) => ({
    ...item,
    originalUrl: buildMediaUrl(item.s3Key as string),
    thumbnailUrl: buildMediaUrl(item.thumbnailKey as string),
  }));

  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url")
    : null;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      photos,
      nextCursor,
      count: photos.length,
    }),
  };
}
