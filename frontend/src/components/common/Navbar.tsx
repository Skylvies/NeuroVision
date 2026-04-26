import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Brain, History, Home, LogIn, LogOut, User, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext.tsx";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const navLinks = [
    { to: "/", label: "Home", icon: <Home size={14} /> },
    { to: "/history", label: "History", icon: <History size={14} /> },
  ];

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/");
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.05]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neuro-blue/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative p-1.5 rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neuro-blue/25 to-neuro-purple/20 border border-white/10 rounded-lg" />
            <Brain size={17} className="relative text-neuro-blue" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight">
            <span className="text-gradient">Neuro</span>
            <span className="text-white/90">Vision</span>
          </span>
          <span className="hidden sm:inline-flex items-center text-[9px] font-mono font-medium tracking-widest uppercase px-1.5 py-0.5 rounded bg-neuro-card-alt border border-white/[0.06] text-gray-500">
            research
          </span>
        </Link>

        {/* Right: nav links + auth */}
        <div className="flex items-center gap-0.5">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200 ${
                  isActive ? "text-white" : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
              >
                {isActive && (
                  <>
                    <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-neuro-blue/12 to-neuro-purple/8 border border-neuro-blue/15" />
                    <span className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-neuro-blue/60 to-neuro-purple/60 rounded-full" />
                  </>
                )}
                <span className={`relative ${isActive ? "text-neuro-blue" : ""}`}>{link.icon}</span>
                <span className="relative font-display">{link.label}</span>
              </Link>
            );
          })}

          <div className="w-px h-5 bg-white/[0.06] mx-1" />

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-neuro-blue/40 to-neuro-purple/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <User size={10} className="text-white/70" />
                </div>
                <span className="font-mono text-[11px] max-w-[120px] truncate hidden sm:block">{user.email}</span>
                <ChevronDown size={11} className={`transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-white/[0.08] bg-neuro-card shadow-xl overflow-hidden z-50">
                  <div className="px-3.5 py-3 border-b border-white/[0.05]">
                    <p className="text-[9px] font-mono text-gray-600 tracking-widest uppercase mb-0.5">Signed in as</p>
                    <p className="text-xs font-mono text-gray-300 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
                  >
                    <LogOut size={13} />
                    <span className="font-display font-medium">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <LogIn size={13} />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
