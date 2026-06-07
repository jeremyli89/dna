import { Link, useLocation } from "react-router-dom";
import { logout } from "../hooks/useAuth";
import type { User } from "../types";

interface NavbarProps {
  user: User | null;
}

export function Navbar({ user }: NavbarProps) {
  const location = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        location.pathname === to
          ? "text-white"
          : "text-dna-muted hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-dna-border bg-dna-bg/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-gradient">
              SPOTIFY DNA
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-6">
            {navLink("/dashboard", "Dashboard")}
            {navLink("/import", "Import")}
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.display_name || ""}
                className="h-8 w-8 rounded-full object-cover border border-dna-border"
              />
            )}
            {!user?.avatar_url && user && (
              <div className="h-8 w-8 rounded-full bg-dna-accent/20 flex items-center justify-center text-xs font-bold text-dna-accent">
                {(user.display_name || user.spotify_id || "?")[0].toUpperCase()}
              </div>
            )}
            <span className="hidden sm:block text-sm text-dna-muted">
              {user?.display_name || user?.spotify_id}
            </span>
            <button
              onClick={logout}
              className="text-xs text-dna-muted hover:text-white transition-colors ml-2"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
