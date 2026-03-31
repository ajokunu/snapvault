import { useState, useEffect, useCallback } from "react";
import {
  getAlbums,
  createAlbum,
  getAlbumPhotos,
  type AlbumItem,
  type PhotoItem,
} from "../services/api";
import { CreateAlbumModal } from "../components/CreateAlbumModal";
import { PhotoGrid } from "../components/PhotoGrid";
import { Lightbox } from "../components/Lightbox";

export function Albums() {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumItem | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<PhotoItem[]>([]);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const loadAlbums = useCallback(async () => {
    try {
      const result = await getAlbums();
      setAlbums(result.albums);
    } catch (err) {
      console.error("Failed to load albums:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const handleCreateAlbum = async (name: string) => {
    await createAlbum(name);
    await loadAlbums();
  };

  const handleAlbumClick = async (album: AlbumItem) => {
    setSelectedAlbum(album);
    setAlbumLoading(true);
    try {
      const result = await getAlbumPhotos(album.albumId);
      setAlbumPhotos(result.photos);
    } catch (err) {
      console.error("Failed to load album photos:", err);
    } finally {
      setAlbumLoading(false);
    }
  };

  // Album detail view
  if (selectedAlbum) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              setSelectedAlbum(null);
              setAlbumPhotos([]);
            }}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-1"
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
          <h2 className="text-xl font-semibold text-white">
            {selectedAlbum.albumName}
          </h2>
          <span className="text-sm text-slate-500">
            {selectedAlbum.photoCount} photos
          </span>
        </div>

        <PhotoGrid
          photos={albumPhotos}
          loading={albumLoading}
          loadingMore={false}
          hasMore={false}
          onLoadMore={() => {}}
          onPhotoClick={setLightboxIndex}
        />

        {!albumLoading && albumPhotos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-500">
              No photos in this album yet. Add photos from the gallery.
            </p>
          </div>
        )}

        {lightboxIndex !== null && (
          <Lightbox
            photos={albumPhotos}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </div>
    );
  }

  // Albums list view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Albums</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Album
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-300 mb-1">
            No albums yet
          </h3>
          <p className="text-slate-500 text-sm">
            Create an album to organize your photos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {albums.map((album) => (
            <button
              key={album.albumId}
              onClick={() => handleAlbumClick(album)}
              className="group text-left bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer p-0"
            >
              <div className="aspect-square bg-slate-900 overflow-hidden">
                {album.coverThumbnailUrl ? (
                  <img
                    src={album.coverThumbnailUrl}
                    alt={album.albumName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-slate-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-white truncate">
                  {album.albumName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {album.photoCount} photo{album.photoCount !== 1 ? "s" : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAlbumModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateAlbum}
        />
      )}
    </div>
  );
}
