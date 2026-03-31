import { S3Event } from "aws-lambda";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import sharp from "sharp";
import exifReader from "exif-reader";
import { PhotoMetadata } from "../shared/types";

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const BUCKET_NAME = process.env.BUCKET_NAME!;
const TABLE_NAME = process.env.TABLE_NAME!;

const THUMBNAIL_WIDTH = 400;

interface ExifData {
  Make?: string;
  Model?: string;
  DateTimeOriginal?: Date;
  FNumber?: number;
  ExposureTime?: number;
  ISOSpeedRatings?: number;
  GPSLatitude?: number;
  GPSLongitude?: number;
  GPSLatitudeRef?: string;
  GPSLongitudeRef?: string;
}

function parseGpsCoord(
  coord: number | undefined,
  ref: string | undefined
): number | undefined {
  if (coord === undefined || ref === undefined) return undefined;
  return ref === "S" || ref === "W" ? -coord : coord;
}

export async function handler(event: S3Event): Promise<void> {
  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const size = record.s3.object.size;

    // Extract userId and photoId from key: originals/{userId}/{photoId}.{ext}
    const keyParts = key.split("/");
    if (keyParts.length < 3 || keyParts[0] !== "originals") {
      console.error(`Unexpected key format: ${key}`);
      continue;
    }

    const userId = keyParts[1]!;
    const fileNameWithExt = keyParts[2]!;
    const photoId = fileNameWithExt.split(".")[0]!;
    const extension = fileNameWithExt.split(".").pop() ?? "bin";

    try {
      // Get the original image from S3
      const getResponse = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
      );

      const bodyBytes = await getResponse.Body!.transformToByteArray();
      const imageBuffer = Buffer.from(bodyBytes);

      // Get image metadata via Sharp
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;
      const contentType = getResponse.ContentType ?? `image/${extension}`;

      // Extract EXIF data
      let exifData: ExifData = {};
      if (metadata.exif) {
        try {
          const parsed = exifReader(metadata.exif);
          exifData = {
            Make: parsed.Image?.Make as string | undefined,
            Model: parsed.Image?.Model as string | undefined,
            DateTimeOriginal: parsed.Photo?.DateTimeOriginal as
              | Date
              | undefined,
            FNumber: parsed.Photo?.FNumber as number | undefined,
            ExposureTime: parsed.Photo?.ExposureTime as number | undefined,
            ISOSpeedRatings: parsed.Photo?.ISOSpeedRatings as
              | number
              | undefined,
            GPSLatitude: parsed.GPSInfo?.GPSLatitude as number | undefined,
            GPSLongitude: parsed.GPSInfo?.GPSLongitude as number | undefined,
            GPSLatitudeRef: parsed.GPSInfo?.GPSLatitudeRef as
              | string
              | undefined,
            GPSLongitudeRef: parsed.GPSInfo?.GPSLongitudeRef as
              | string
              | undefined,
          };
        } catch (exifErr) {
          console.warn(`EXIF parsing failed for ${key}:`, exifErr);
        }
      }

      // Generate thumbnail (WebP, 400px wide)
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(THUMBNAIL_WIDTH, undefined, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const thumbnailKey = `thumbnails/${userId}/${photoId}.webp`;

      // Upload thumbnail to S3
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      // Retrieve original filename from object metadata
      const originalFilename = getResponse.Metadata?.["original-filename"]
        ? decodeURIComponent(getResponse.Metadata["original-filename"])
        : fileNameWithExt;

      // Format camera info
      const camera = [exifData.Make, exifData.Model]
        .filter(Boolean)
        .join(" ")
        .trim() || undefined;

      // Format aperture
      const aperture = exifData.FNumber
        ? `f/${exifData.FNumber}`
        : undefined;

      // Format shutter speed
      const shutterSpeed = exifData.ExposureTime
        ? exifData.ExposureTime >= 1
          ? `${exifData.ExposureTime}s`
          : `1/${Math.round(1 / exifData.ExposureTime)}s`
        : undefined;

      // Build metadata record
      const photoMetadata: PhotoMetadata = {
        userId,
        photoId,
        fileName: originalFilename,
        contentType,
        size,
        width,
        height,
        dateTaken: exifData.DateTimeOriginal
          ? exifData.DateTimeOriginal.toISOString()
          : new Date().toISOString(),
        camera,
        aperture,
        shutterSpeed,
        iso: exifData.ISOSpeedRatings,
        gpsLat: parseGpsCoord(
          exifData.GPSLatitude,
          exifData.GPSLatitudeRef
        ),
        gpsLon: parseGpsCoord(
          exifData.GPSLongitude,
          exifData.GPSLongitudeRef
        ),
        status: "ready",
        createdAt: new Date().toISOString(),
        s3Key: key,
        thumbnailKey,
      };

      // Write metadata to DynamoDB
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: photoMetadata,
        })
      );

      console.log(`Processed ${key}: thumbnail=${thumbnailKey}, metadata written`);
    } catch (err) {
      console.error(`Error processing ${key}:`, err);

      // Write failure record so the UI can show status
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            userId,
            photoId,
            fileName: fileNameWithExt,
            status: "failed",
            s3Key: key,
            createdAt: new Date().toISOString(),
            error: err instanceof Error ? err.message : "Unknown error",
          },
        })
      );
    }
  }
}
