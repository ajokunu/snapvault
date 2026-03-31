import { useState, useCallback } from "react";
import { getUploadUrl, uploadFile } from "../services/api";

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
  photoId?: string;
}

const MAX_CONCURRENT = 5;

export function useUpload(onComplete?: () => void) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const updateUpload = useCallback(
    (id: string, update: Partial<UploadItem>) => {
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...update } : u))
      );
    },
    []
  );

  const processFile = useCallback(
    async (item: UploadItem) => {
      try {
        updateUpload(item.id, { status: "uploading", progress: 0 });

        // Get presigned URL
        const { uploadUrl, photoId } = await getUploadUrl(
          item.file.name,
          item.file.type,
          item.file.size
        );

        // Upload directly to S3
        await uploadFile(item.file, uploadUrl, (progress) => {
          updateUpload(item.id, { progress });
        });

        updateUpload(item.id, {
          status: "complete",
          progress: 100,
          photoId,
        });
      } catch (err) {
        updateUpload(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    },
    [updateUpload]
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newUploads: UploadItem[] = fileArray.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      // Process with concurrency limit
      const queue = [...newUploads];
      let active = 0;

      const processNext = async () => {
        while (queue.length > 0 && active < MAX_CONCURRENT) {
          const next = queue.shift();
          if (!next) break;
          active++;
          processFile(next).finally(() => {
            active--;
            processNext();
            // Check if all done
            setUploads((current) => {
              const allDone = current.every(
                (u) => u.status === "complete" || u.status === "error"
              );
              if (allDone && onComplete) {
                setTimeout(onComplete, 1000);
              }
              return current;
            });
          });
        }
      };

      processNext();
    },
    [processFile, onComplete]
  );

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== "complete"));
  }, []);

  return { uploads, addFiles, clearCompleted };
}
