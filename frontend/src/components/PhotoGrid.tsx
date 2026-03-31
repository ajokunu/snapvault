import { useEffect, useRef, useCallback } from "react";
import { type PhotoItem } from "../services/api";

interface PhotoGridProps {
  photos: PhotoItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onPhotoClick: (index: number) => void;
}

export function PhotoGrid({
  photos,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onPhotoClick,
}: PhotoGridProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const sentinelCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
            onLoadMore();
          }
        },
        { rootMargin: "200px" }
      );

      observerRef.current.observe(node);
      sentinelRef.current = node;
    },
    [hasMore, loadingMore, onLoadMore]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-slate-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {photos.map((photo, index) => (
          <button
            key={photo.photoId}
            onClick={() => onPhotoClick(index)}
            className="aspect-square relative overflow-hidden rounded-lg bg-slate-800 group cursor-pointer border-0 p-0"
          >
            <LazyImage
              src={photo.thumbnailUrl}
              alt={photo.fileName}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelCallback} className="h-10 mt-4">
          {loadingMore && (
            <div className="flex justify-center">
              <div className="w-6 h-6 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function LazyImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((node: HTMLImageElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;

    imgRef.current = node;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          node.src = node.dataset.src ?? "";
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observerRef.current.observe(node);
  }, []);

  return (
    <img
      ref={setRef}
      data-src={src}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}
