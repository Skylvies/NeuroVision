import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, RefreshCw, Cpu, Timer, ClipboardList, FlaskConical } from "lucide-react";
import { Spinner } from "@heroui/react";
import { useSession } from "../hooks/useAnalysis.ts";
import { useProgress } from "../hooks/useProgress.ts";
import LiveAnalysis from "../components/analysis/LiveAnalysis.tsx";
import RiskGauge from "../components/analysis/RiskGauge.tsx";
import RiskExplanation from "../components/analysis/RiskExplanation.tsx";
import ConditionScores from "../components/analysis/ConditionScores.tsx";
import type { RiskLevel } from "../types/analysis.ts";

export default function Analysis() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: sessionDetail, isLoading, isError } = useSession(sessionId);

  const isProcessing =
    sessionDetail?.session.status === "processing" ||
    sessionDetail?.session.status === "pending";

  const progressState = useProgress(sessionId, isProcessing);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" color="primary" />
          <p className="text-xs font-mono text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (isError || !sessionDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-flex p-4 rounded-2xl bg-red-500/[0.08] border border-red-500/20 mb-5">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="font-display font-bold text-lg text-white mb-2">Session Not Found</h2>
          <p className="text-gray-400 text-sm mb-6">This analysis session could not be found.</p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-neuro-blue to-neuro-purple text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowLeft size={14} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (sessionDetail.session.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-8 text-center"
          >
            <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h2 className="font-display font-bold text-lg text-white mb-2">Analysis Failed</h2>
            <p className="text-gray-400 text-sm mb-2">
              {sessionDetail.session.error_message ?? "An unknown error occurred during analysis."}
            </p>
            <p className="font-mono text-xs text-gray-600 mb-6">{sessionDetail.session.filename}</p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neuro-blue text-white text-sm font-medium hover:bg-neuro-blue-hover transition-colors"
            >
              <RefreshCw size={13} />
              Try Again
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <LiveAnalysis
        progressState={progressState}
        filename={sessionDetail.session.filename}
      />
    );
  }

  if (sessionDetail.result) {
    const { result, session } = sessionDetail;
    const caseId = sessionId?.slice(0, 8).toUpperCase() ?? "--------";
    const analyzedAt = new Date(result.analyzed_at).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto px-4 py-8 pt-24"
      >
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="group inline-flex items-center gap-1.5 text-gray-600 hover:text-white text-xs font-display font-medium tracking-wide mb-6 transition-colors"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          New Analysis
        </button>

        {/* ── Diagnostic Report Card ── */}
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden">

          {/* Report header */}
          <div className="bg-neuro-card/70 border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Left: title + case id */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neuro-blue/[0.08] border border-neuro-blue/15">
                  <ClipboardList size={16} className="text-neuro-blue/70" />
                </div>
                <div>
                  <p className="text-[9px] font-mono text-gray-600 tracking-[0.2em] uppercase mb-0.5">
                    Diagnostic Report
                  </p>
                  <p className="font-mono text-sm font-medium text-white/80">
                    CASE{" "}
                    <span className="text-neuro-blue/80">#{caseId}</span>
                  </p>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/[0.06]" />
                <div className="hidden sm:block">
                  <p className="text-[9px] font-mono text-gray-600 mb-0.5">Analyzed</p>
                  <p className="font-mono text-xs text-gray-400">{analyzedAt}</p>
                </div>
              </div>

              {/* Right: status + metadata */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-display font-semibold tracking-wide px-2 py-1 rounded border ${
                    session.input_type === "video"
                      ? "bg-neuro-purple/10 text-neuro-purple border-neuro-purple/20"
                      : "bg-neuro-blue/10 text-neuro-blue border-neuro-blue/20"
                  }`}
                >
                  {session.input_type.toUpperCase()}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-gray-600 px-2 py-1 rounded border border-white/[0.06] bg-white/[0.02]">
                  <Cpu size={9} />
                  {result.num_windows} windows
                </span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-emerald-500/20 bg-emerald-500/[0.06]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="font-display font-semibold text-[10px] tracking-widest uppercase text-emerald-400">Complete</span>
                </div>
              </div>
            </div>

            {/* Filename row + optional video thumbnail */}
            <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-3">
              <Timer size={10} className="text-gray-700 flex-shrink-0" />
              <p className="text-[10px] font-mono text-gray-600 truncate flex-1">{session.filename}</p>
              {session.thumbnail && (
                <img
                  src={`data:image/jpeg;base64,${session.thumbnail}`}
                  alt="Video preview"
                  className="h-9 w-16 object-cover rounded-md border border-white/[0.08] flex-shrink-0 opacity-80"
                />
              )}
            </div>
          </div>

          {/* Experimental warning for video input */}
          {session.input_type === "video" && (
            <div className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06]">
              <FlaskConical size={14} className="text-amber-400/80 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-display font-semibold text-amber-400/90 mb-0.5">
                  Experimental — Video accuracy is limited
                </p>
                <p className="text-[10px] font-mono text-gray-500 leading-relaxed">
                  This model was trained on structured clinical eye-tracking tasks (Tobii saccade protocols).
                  Webcam video produces different gaze dynamics. Treat video results as indicative only — use
                  an eye-tracking data file (.txt / .csv) for more reliable output.
                </p>
              </div>
            </div>
          )}

          {/* Report body */}
          <div className="p-6 lg:p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
              {/* Risk gauge */}
              <div>
                <p className="text-[10px] font-display font-semibold tracking-widest uppercase text-gray-600 mb-5">
                  Risk Assessment
                </p>
                <RiskGauge
                  score={result.risk_score}
                  level={result.risk_level as RiskLevel}
                  recommendation={result.recommendation}
                />
              </div>

              {/* Explanation */}
              <div>
                <p className="text-[10px] font-display font-semibold tracking-widest uppercase text-gray-600 mb-5">
                  Detailed Breakdown
                </p>
                <RiskExplanation
                  numWindows={result.num_windows}
                  windowProbs={result.window_probs}
                />
              </div>
            </div>

            {/* Multi-condition indicators */}
            {result.condition_scores && (
              <div>
                <p className="text-[10px] font-display font-semibold tracking-widest uppercase text-gray-600 mb-4">
                  Multi-Condition Screening
                </p>
                <ConditionScores scores={result.condition_scores} />
              </div>
            )}
          </div>

          {/* Report footer */}
          <div className="bg-neuro-card/40 border-t border-white/[0.04] px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[9px] font-mono text-gray-700 tracking-wide">
              Generated by NeuroVision AI&nbsp;&nbsp;·&nbsp;&nbsp;BiLSTM v1.0&nbsp;&nbsp;·&nbsp;&nbsp;
              <span className="text-amber-600/70">NOT A CLINICAL DIAGNOSIS</span>
            </p>
            <p className="text-[9px] font-mono text-gray-700">Research use only</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" color="primary" />
    </div>
  );
}
