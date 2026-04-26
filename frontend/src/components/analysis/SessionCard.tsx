import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, Video, Clock, ChevronRight, Loader2 } from "lucide-react";
import type { SessionDetail } from "../../types/analysis.ts";

interface SessionCardProps { sessionDetail: SessionDetail; }

const RISK_CONFIG = {
  HIGH:     { color: "#ef4444", bg: "bg-red-500/[0.08]",     border: "border-red-500/20",     dot: "bg-red-500"     },
  MODERATE: { color: "#f59e0b", bg: "bg-amber-500/[0.08]",   border: "border-amber-500/20",   dot: "bg-amber-500"   },
  LOW:      { color: "#10b981", bg: "bg-emerald-500/[0.08]", border: "border-emerald-500/20", dot: "bg-emerald-500" },
};

export default function SessionCard({ sessionDetail }: SessionCardProps) {
  const navigate = useNavigate();
  const { session, result } = sessionDetail;
  const riskCfg = result ? RISK_CONFIG[result.risk_level as keyof typeof RISK_CONFIG] : null;

  const date = new Date(session.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <motion.div
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15 }}
      onClick={() => navigate(`/analysis/${session.id}`)}
      className="relative bg-neuro-card border border-white/[0.06] rounded-xl p-4 cursor-pointer group overflow-hidden transition-all duration-200 hover:border-white/[0.10]"
    >
      {/* Hover left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-neuro-blue to-neuro-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />

      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-neuro-blue/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative flex items-center gap-4">
        {/* Type icon */}
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-neuro-blue/12 to-neuro-purple/8 border border-white/[0.06] flex-shrink-0">
          {session.input_type === "video"
            ? <Video size={16} className="text-neuro-blue" />
            : <FileText size={16} className="text-neuro-blue" />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{session.filename}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock size={10} className="text-gray-600" />
            <span className="text-[11px] font-mono text-gray-600">{date}</span>
            <span
              className={`text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-md border ${
                session.input_type === "video"
                  ? "bg-neuro-purple/10 text-neuro-purple border-neuro-purple/20"
                  : "bg-neuro-blue/10 text-neuro-blue border-neuro-blue/20"
              }`}
            >
              {session.input_type.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Risk badge */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {result && riskCfg ? (
            <div
              className={`px-3 py-1.5 rounded-lg border ${riskCfg.bg} ${riskCfg.border} text-center min-w-[64px]`}
              style={{ boxShadow: `0 0 12px ${riskCfg.color}18` }}
            >
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${riskCfg.dot}`} />
                <p className="font-display font-bold text-[10px] tracking-wider" style={{ color: riskCfg.color }}>
                  {result.risk_level}
                </p>
              </div>
              <p className="font-mono text-[11px] font-medium text-gray-500 tabular-nums">
                {(result.risk_score * 100).toFixed(0)}%
              </p>
            </div>
          ) : (
            <span
              className={`text-[11px] font-display font-semibold tracking-wide px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                session.status === "processing"
                  ? "bg-neuro-blue/10 text-neuro-blue border-neuro-blue/20"
                  : session.status === "error"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-gray-500/10 text-gray-500 border-gray-500/20"
              }`}
            >
              {session.status === "processing" && <Loader2 size={9} className="animate-spin" />}
              {session.status.toUpperCase()}
            </span>
          )}
          <ChevronRight
            size={14}
            className="text-gray-700 group-hover:text-neuro-blue transition-colors"
          />
        </div>
      </div>
    </motion.div>
  );
}
