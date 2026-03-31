import { type PhotoItem } from "../services/api";

interface ExifPanelProps {
  photo: PhotoItem;
  onClose: () => void;
}

export function ExifPanel({ photo, onClose }: ExifPanelProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const details = [
    { label: "Filename", value: photo.fileName },
    {
      label: "Date Taken",
      value: new Date(photo.dateTaken).toLocaleString(),
    },
    {
      label: "Dimensions",
      value:
        photo.width && photo.height
          ? `${photo.width} × ${photo.height}`
          : undefined,
    },
    { label: "Size", value: photo.size ? formatSize(photo.size) : undefined },
    { label: "Camera", value: photo.camera },
    { label: "Aperture", value: photo.aperture },
    { label: "Shutter Speed", value: photo.shutterSpeed },
    { label: "ISO", value: photo.iso?.toString() },
    {
      label: "Location",
      value:
        photo.gpsLat && photo.gpsLon
          ? `${photo.gpsLat.toFixed(6)}, ${photo.gpsLon.toFixed(6)}`
          : undefined,
      href:
        photo.gpsLat && photo.gpsLon
          ? `https://www.google.com/maps?q=${photo.gpsLat},${photo.gpsLon}`
          : undefined,
    },
  ].filter((d) => d.value);

  return (
    <div className="absolute bottom-0 right-0 top-0 w-80 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 p-5 overflow-y-auto z-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Details</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer border-0 bg-transparent p-1"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {details.map((detail) => (
          <div key={detail.label}>
            <dt className="text-xs text-slate-500 mb-0.5">{detail.label}</dt>
            <dd className="text-sm text-slate-200">
              {detail.href ? (
                <a
                  href={detail.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  {detail.value} ↗
                </a>
              ) : (
                detail.value
              )}
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
}
