import { useState, type FormEvent } from "react";

interface CreateAlbumModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateAlbumModal({ onClose, onCreate }: CreateAlbumModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");
    try {
      await onCreate(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create album");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-white mb-4">
          Create Album
        </h3>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Album name"
            autoFocus
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
          />

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
