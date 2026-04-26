import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";

export default function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Login failed. Check your credentials.";
      setError(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Card */}
        <div className="relative rounded-2xl border border-white/[0.07] bg-neuro-card overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neuro-blue/50 to-transparent" />

          <div className="px-8 py-10">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative p-3 rounded-xl mb-4">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neuro-blue/20 to-neuro-purple/15 border border-white/[0.08]" />
                <Brain size={22} className="relative text-neuro-blue" />
              </div>
              <h1 className="font-display font-bold text-xl text-white">Welcome back</h1>
              <p className="text-xs font-mono text-gray-500 mt-1">Sign in to your NeuroVision account</p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-display font-semibold tracking-widest uppercase text-gray-500">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-neuro-dark border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-600 font-mono outline-none focus:border-neuro-blue/50 focus:ring-1 focus:ring-neuro-blue/20 transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-display font-semibold tracking-widest uppercase text-gray-500">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-neuro-dark border border-white/[0.07] rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white placeholder-gray-600 font-mono outline-none focus:border-neuro-blue/50 focus:ring-1 focus:ring-neuro-blue/20 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-neuro-blue to-neuro-purple text-white text-sm font-display font-semibold tracking-wide hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn size={14} />
                )}
                {isLoading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-6 text-center text-xs font-mono text-gray-600">
              No account?{" "}
              <Link to="/register" className="text-neuro-blue hover:text-neuro-blue/80 transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
