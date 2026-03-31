export function Gallery() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Photos</h2>
      </div>

      {/* Empty state — will be replaced with actual gallery in Sprint 5 */}
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-300 mb-1">
          No photos yet
        </h3>
        <p className="text-slate-500 text-sm max-w-xs">
          Drag and drop photos here or click upload to get started
        </p>
      </div>
    </div>
  );
}
