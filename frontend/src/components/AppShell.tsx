import { Link, Outlet, useNavigate } from "react-router-dom";
import { signOut, getAuthState } from "../services/auth";

export function AppShell() {
  const navigate = useNavigate();
  const { email } = getAuthState();

  const handleSignOut = () => {
    signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 no-underline">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-lg font-semibold text-white">
                SnapVault
              </span>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-1">
              <Link
                to="/"
                className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline"
              >
                Photos
              </Link>
              <Link
                to="/albums"
                className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline"
              >
                Albums
              </Link>
            </nav>

            {/* User */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden sm:inline">
                {email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
