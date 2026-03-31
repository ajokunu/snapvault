export interface PhotoMetadata {
  userId: string;
  photoId: string;
  fileName: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
  dateTaken: string;
  camera?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  gpsLat?: number;
  gpsLon?: number;
  albums?: string[];
  albumSortKey?: string;
  status: "processing" | "ready" | "failed";
  createdAt: string;
  s3Key: string;
  thumbnailKey: string;
}

export interface UploadUrlRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  photoId: string;
  s3Key: string;
}

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const PRESIGNED_URL_EXPIRY = 300; // 5 minutes
