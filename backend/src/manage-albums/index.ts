import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { verifyToken, AuthError, corsHeaders } from "../shared/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN ?? "";

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

    // POST /api/albums — create album
    if (method === "POST" && path === "/api/albums") {
      return await createAlbum(userId, event.body, headers);
    }

    // GET /api/albums — list albums
    if (method === "GET" && path === "/api/albums") {
      return await listAlbums(userId, headers);
    }

    // GET /api/albums/:id/photos — list album photos
    const albumPhotosMatch = path.match(
      /\/api\/albums\/([A-Z0-9]+)\/photos$/i
    );
    if (method === "GET" && albumPhotosMatch) {
      const albumId = albumPhotosMatch[1]!;
      const cursor = event.queryStringParameters?.cursor;
      return await listAlbumPhotos(userId, albumId, cursor, headers);
    }

    // POST /api/albums/:id/photos — add photos to album
    if (method === "POST" && albumPhotosMatch) {
      const albumId = albumPhotosMatch[1]!;
      return await addPhotosToAlbum(userId, albumId, event.body, headers);
    }

    // DELETE /api/albums/:albumId/photos/:photoId — remove photo from album
    const removePhotoMatch = path.match(
      /\/api\/albums\/([A-Z0-9]+)\/photos\/([A-Z0-9]+)$/i
    );
    if (method === "DELETE" && removePhotoMatch) {
      const albumId = removePhotoMatch[1]!;
      const photoId = removePhotoMatch[2]!;
      return await removePhotoFromAlbum(userId, albumId, photoId, headers);
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
    console.error("Albums API error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
}

async function createAlbum(
  userId: string,
  body: string | undefined,
  headers: Record<string, string>
): Promise<APIGatewayProxyResultV2> {
  if (!body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Request body required" }),
    };
  }

  const { albumName } = JSON.parse(body) as { albumName?: string };
  if (!albumName || albumName.trim().length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "albumName is required" }),
    };
  }

  const albumId = ulid();

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId,
        photoId: `ALBUM#${albumId}`,
        albumId,
        albumName: albumName.trim(),
        photoCount: 0,
        coverPhotoId: null,
        createdAt: new Date().toISOString(),
      },
    })
  );

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ albumId, albumName: albumName.trim() }),
  };
}

async function listAlbums(
  userId: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResultV2> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        "userId = :uid AND begins_with(photoId, :prefix)",
      ExpressionAttributeValues: {
        ":uid": userId,
        ":prefix": "ALBUM#",
      },
      ScanIndexForward: false,
    })
  );

  const albums = (result.Items ?? []).map((item) => ({
    albumId: item.albumId,
    albumName: item.albumName,
    photoCount: item.photoCount ?? 0,
    coverPhotoId: item.coverPhotoId,
    coverThumbnailUrl: item.coverThumbnailKey
      ? buildMediaUrl(item.coverThumbnailKey as string)
      : null,
    createdAt: item.createdAt,
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ albums }),
  };
}

async function listAlbumPhotos(
  userId: string,
  albumId: string,
  cursor: string | undefined,
  headers: Record<string, string>
): Promise<APIGatewayProxyResultV2> {
  const exclusiveStartKey = cursor
    ? JSON.parse(Buffer.from(cursor, "base64url").toString())
    : undefined;

  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "albumIndex",
      KeyConditionExpression:
        "userId = :uid AND begins_with(albumSortKey, :prefix)",
      ExpressionAttributeValues: {
        ":uid": userId,
        ":prefix": `${albumId}#`,
      },
      ScanIndexForward: false,
      Limit: 50,
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
    body: JSON.stringify({ photos, nextCursor, count: photos.length }),
  };
}

async function addPhotosToAlbum(
  userId: string,
  albumId: string,
  body: string | undefined,
  headers: Record<string, string>
): Promise<APIGatewayProxyResultV2> {
  if (!body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Request body required" }),
    };
  }

  const { photoIds } = JSON.parse(body) as { photoIds?: string[] };
  if (!photoIds || photoIds.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "photoIds array is required" }),
    };
  }

  // Verify album exists
  const album = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId, photoId: `ALBUM#${albumId}` },
    })
  );

  if (!album.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Album not found" }),
    };
  }

  let addedCount = 0;
  let firstThumbnailKey: string | null = null;

  for (const pid of photoIds) {
    // Get the photo to copy its data to the album index
    const photo = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId, photoId: pid },
      })
    );

    if (!photo.Item) continue;

    // Update the photo's albumSortKey for GSI querying
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId, photoId: pid },
        UpdateExpression:
          "SET albumSortKey = :ask, albums = list_append(if_not_exists(albums, :empty), :albumList)",
        ExpressionAttributeValues: {
          ":ask": `${albumId}#${pid}`,
          ":empty": [],
          ":albumList": [albumId],
        },
      })
    );

    addedCount++;
    if (!firstThumbnailKey && photo.Item.thumbnailKey) {
      firstThumbnailKey = photo.Item.thumbnailKey as string;
    }
  }

  // Update album photo count and cover
  const updateExpression = firstThumbnailKey
    ? "SET photoCount = photoCount + :count, coverThumbnailKey = if_not_exists(coverThumbnailKey, :cover)"
    : "SET photoCount = photoCount + :count";

  const expressionValues: Record<string, unknown> = { ":count": addedCount };
  if (firstThumbnailKey) {
    expressionValues[":cover"] = firstThumbnailKey;
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId, photoId: `ALBUM#${albumId}` },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
    })
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ added: addedCount }),
  };
}

async function removePhotoFromAlbum(
  userId: string,
  albumId: string,
  photoId: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResultV2> {
  // Remove albumSortKey from the photo
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId, photoId },
      UpdateExpression: "REMOVE albumSortKey",
    })
  );

  // Decrement album count
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { userId, photoId: `ALBUM#${albumId}` },
      UpdateExpression: "SET photoCount = photoCount - :one",
      ExpressionAttributeValues: { ":one": 1 },
    })
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ removed: true }),
  };
}
