import { useEffect, useCallback, useState, useRef } from "react";
import { type PhotoItem } from "../services/api";
import { ExifPanel } from "./ExifPanel";

interface LightboxProps {
  photos: PhotoItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function Lightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
}: LightboxProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showExif, setShowExif] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const photo = photos[currentIndex];
  if (!photo) return null;

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setImageLoaded(false);
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, photos.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setImageLoaded(false);
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  // Touch/swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0]!.clientX,
      y: e.touches[0]!.clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const dx = e.changedTouches[0]!.clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0]!.clientY - touchStartRef.current.y;

    // Only horizontal swipes (not vertical scroll)
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }

    touchStartRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border-0"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/60 text-sm">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Previous */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-2 sm:left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border-0"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Image */}
      <div className="flex items-center justify-center w-full h-full p-4 sm:p-12">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        )}
        <img
          src={photo.originalUrl}
          alt={photo.fileName}
          onLoad={() => setImageLoaded(true)}
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* Next */}
      {currentIndex < photos.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-2 sm:right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border-0"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Info toggle button */}
      <button
        onClick={() => setShowExif(!showExif)}
        className={`absolute top-4 right-16 z-10 w-10 h-10 flex items-center justify-center rounded-full ${
          showExif ? "bg-indigo-500" : "bg-white/10 hover:bg-white/20"
        } text-white transition-colors cursor-pointer border-0`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* EXIF Panel */}
      {showExif && (
        <ExifPanel photo={photo} onClose={() => setShowExif(false)} />
      )}

      {/* Photo info bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <p className="text-white text-sm font-medium truncate">
              {photo.fileName}
            </p>
            <p className="text-white/50 text-xs">
              {new Date(photo.dateTaken).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {photo.camera && ` · ${photo.camera}`}
            </p>
          </div>
          <div className="text-white/50 text-xs text-right">
            {photo.width && photo.height && (
              <span>
                {photo.width}×{photo.height}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
