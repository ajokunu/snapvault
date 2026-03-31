import { useState, useEffect, useCallback, useRef } from "react";
import { getPhotos, type PhotoItem } from "../services/api";

export function useGallery() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);

  const loadPhotos = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      cursorRef.current = null;
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await getPhotos(
        reset ? undefined : cursorRef.current ?? undefined
      );
      cursorRef.current = result.nextCursor;
      setHasMore(result.nextCursor !== null);

      if (reset) {
        setPhotos(result.photos);
      } else {
        setPhotos((prev) => [...prev, ...result.photos]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos(true);
  }, [loadPhotos]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadPhotos(false);
    }
  }, [loadPhotos, loadingMore, hasMore]);

  const refresh = useCallback(() => {
    loadPhotos(true);
  }, [loadPhotos]);

  return { photos, loading, loadingMore, error, hasMore, loadMore, refresh };
}
