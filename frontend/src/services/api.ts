import { getAccessToken } from "./auth";
import { config } from "./config";

async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error("Session expired");
  }

  return response;
}

export interface PhotoItem {
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
  status: string;
  originalUrl: string;
  thumbnailUrl: string;
  createdAt: string;
}

export interface PhotoListResponse {
  photos: PhotoItem[];
  nextCursor: string | null;
  count: number;
}

export interface AlbumItem {
  albumId: string;
  albumName: string;
  photoCount: number;
  coverThumbnailUrl: string | null;
  createdAt: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  photoId: string;
  s3Key: string;
}

export async function getUploadUrl(
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<UploadUrlResponse> {
  const res = await authFetch(config.uploadUrlEndpoint, {
    method: "POST",
    body: JSON.stringify({ fileName, contentType, fileSize }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to get upload URL");
  }

  return res.json();
}

export async function uploadFile(
  file: File,
  presignedUrl: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.send(file);
  });
}

export async function getPhotos(
  cursor?: string,
  limit = 50
): Promise<PhotoListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  const res = await authFetch(
    `${config.galleryEndpoint}api/photos?${params}`
  );

  if (!res.ok) throw new Error("Failed to load photos");
  return res.json();
}

export async function getPhoto(photoId: string): Promise<PhotoItem> {
  const res = await authFetch(
    `${config.galleryEndpoint}api/photos/${photoId}`
  );

  if (!res.ok) throw new Error("Failed to load photo");
  return res.json();
}

export async function getAlbums(): Promise<{ albums: AlbumItem[] }> {
  const res = await authFetch(`${config.albumsEndpoint}api/albums`);
  if (!res.ok) throw new Error("Failed to load albums");
  return res.json();
}

export async function createAlbum(
  albumName: string
): Promise<{ albumId: string }> {
  const res = await authFetch(`${config.albumsEndpoint}api/albums`, {
    method: "POST",
    body: JSON.stringify({ albumName }),
  });
  if (!res.ok) throw new Error("Failed to create album");
  return res.json();
}

export async function addPhotosToAlbum(
  albumId: string,
  photoIds: string[]
): Promise<void> {
  const res = await authFetch(
    `${config.albumsEndpoint}api/albums/${albumId}/photos`,
    {
      method: "POST",
      body: JSON.stringify({ photoIds }),
    }
  );
  if (!res.ok) throw new Error("Failed to add photos to album");
}

export async function getAlbumPhotos(
  albumId: string,
  cursor?: string
): Promise<PhotoListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await authFetch(
    `${config.albumsEndpoint}api/albums/${albumId}/photos?${params}`
  );

  if (!res.ok) throw new Error("Failed to load album photos");
  return res.json();
}
