import { useState, useRef, type DragEvent } from "react";
import { type UploadItem } from "../hooks/useUpload";

interface UploadZoneProps {
  onFiles: (files: FileList | File[]) => void;
  uploads: UploadItem[];
  onClearCompleted: () => void;
  children: React.ReactNode;
}

export function UploadZone({
  onFiles,
  uploads,
  onClearCompleted,
  children,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files.length > 0) {
      onFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFiles(e.target.files);
      e.target.value = "";
    }
  };

  const activeUploads = uploads.filter(
    (u) => u.status === "uploading" || u.status === "pending"
  );
  const completedUploads = uploads.filter((u) => u.status === "complete");
  const errorUploads = uploads.filter((u) => u.status === "error");

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Photos</h2>
        <button
          onClick={handleFileSelect}
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
          Upload
        </button>
      </div>

      {/* Upload progress panel */}
      {uploads.length > 0 && (
        <div className="mb-6 bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">
              {activeUploads.length > 0
                ? `Uploading ${activeUploads.length} file${activeUploads.length !== 1 ? "s" : ""}...`
                : `${completedUploads.length} uploaded${errorUploads.length > 0 ? `, ${errorUploads.length} failed` : ""}`}
            </span>
            {activeUploads.length === 0 && (
              <button
                onClick={onClearCompleted}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {uploads.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 truncate flex-1 min-w-0">
                  {u.file.name}
                </span>
                {u.status === "uploading" && (
                  <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                )}
                {u.status === "complete" && (
                  <svg
                    className="w-4 h-4 text-green-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {u.status === "error" && (
                  <span className="text-xs text-red-400 shrink-0">
                    Failed
                  </span>
                )}
                {u.status === "pending" && (
                  <span className="text-xs text-slate-500 shrink-0">
                    Queued
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-indigo-500/10 border-2 border-dashed border-indigo-500 rounded-xl z-50 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="w-12 h-12 text-indigo-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-indigo-300 font-medium">
              Drop photos here to upload
            </p>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
