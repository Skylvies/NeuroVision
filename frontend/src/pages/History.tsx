import { motion } from "framer-motion";
import { ScanEye, Inbox, LogIn } from "lucide-react";
import { Spinner } from "@heroui/react";
import { Link } from "react-router-dom";
import { useSessions } from "../hooks/useAnalysis.ts";
import { useAuth } from "../context/AuthContext.tsx";
import SessionCard from "../components/analysis/SessionCard.tsx";

export default function History() {
  const { user } = useAuth();
  const { data: sessions, isLoading, isError } = useSessions();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pt-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 pb-6 border-b border-white/[0.06]"
      >
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neuro-blue/20 to-neuro-purple/15 border border-white/[0.08]" />
            <ScanEye size={18} className="relative text-neuro-blue" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white leading-tight">
              Analysis History
            </h1>
            <p className="text-xs font-mono text-gray-600 mt-0.5">
              {user ? `Signed in as ${user.email}` : "Your past screening sessions"}
            </p>
          </div>
          {sessions && sessions.length > 0 && (
            <div className="ml-auto px-2.5 py-1 rounded-lg bg-neuro-card-alt border border-white/[0.06]">
              <span className="font-mono text-xs text-gray-500 tabular-nums">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Not logged in */}
      {!user && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="inline-flex p-5 rounded-2xl bg-neuro-card border border-white/[0.06] mb-6">
            <LogIn size={32} className="text-gray-600" />
          </div>
          <h2 className="font-display font-semibold text-base text-gray-300 mb-2">
            Sign in to view your history
          </h2>
          <p className="text-sm text-gray-600 font-light mb-8 max-w-xs mx-auto">
            Create an account to save analyses and track results across sessions.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-neuro-blue to-neuro-purple text-white text-sm font-display font-semibold hover:opacity-90 transition-opacity"
            >
              <LogIn size={14} />
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/[0.08] text-gray-400 text-sm font-display font-medium hover:bg-white/[0.04] transition-colors"
            >
              Create Account
            </Link>
          </div>
        </motion.div>
      )}

      {/* Logged in states */}
      {user && isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner size="lg" color="primary" />
          <p className="text-xs font-mono text-gray-600">Fetching sessions...</p>
        </div>
      )}

      {user && isError && (
        <div className="text-center py-24">
          <p className="text-sm text-red-400 font-mono">Failed to load history.</p>
        </div>
      )}

      {user && sessions && sessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24"
        >
          <div className="inline-flex p-5 rounded-2xl bg-neuro-card border border-white/[0.05] mb-5">
            <Inbox size={36} className="text-gray-700" />
          </div>
          <h2 className="font-display font-semibold text-base text-gray-400 mb-2">
            No analyses yet
          </h2>
          <p className="text-sm text-gray-600 font-light">
            Upload an eye-tracking file or video to get started.
          </p>
        </motion.div>
      )}

      {user && sessions && sessions.length > 0 && (
        <div className="space-y-2.5">
          {sessions.map((sd, i) => (
            <motion.div
              key={sd.session.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <SessionCard sessionDetail={sd} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
