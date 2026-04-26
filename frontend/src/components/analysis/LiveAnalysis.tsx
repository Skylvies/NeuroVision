import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Sliders, Layers, Brain, Sparkles,
  Database, CheckCircle, AlertCircle, Loader2, Terminal,
} from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer,
} from "recharts";
import type { ProgressState } from "../../hooks/useProgress.ts";
import RiskGauge from "./RiskGauge.tsx";
import type { RiskLevel } from "../../types/analysis.ts";

interface LiveAnalysisProps {
  progressState: ProgressState;
  filename: string;
}

type StageKey = "parse"|"normalize"|"windows"|"inference"|"aggregate"|"saving"|"complete"|"error";

const STAGE_CONFIG: Record<StageKey, { icon: ReactNode; color: string; sigil: string }> = {
  parse:     { icon: <FileText size={12} />,   color: "text-blue-400",    sigil: "01" },
  normalize: { icon: <Sliders size={12} />,    color: "text-cyan-400",    sigil: "02" },
  windows:   { icon: <Layers size={12} />,     color: "text-purple-400",  sigil: "03" },
  inference: { icon: <Brain size={12} />,      color: "text-amber-400",   sigil: "04" },
  aggregate: { icon: <Sparkles size={12} />,   color: "text-emerald-400", sigil: "05" },
  saving:    { icon: <Database size={12} />,   color: "text-sky-400",     sigil: "06" },
  complete:  { icon: <CheckCircle size={12} />,color: "text-green-400",   sigil: "OK" },
  error:     { icon: <AlertCircle size={12} />,color: "text-red-400",     sigil: "ER" },
};

function getStageCfg(stage: string) {
  return STAGE_CONFIG[stage as StageKey] ?? {
    icon: <Loader2 size={12} className="animate-spin" />,
    color: "text-gray-500", sigil: "--",
  };
}

function barColor(p: number) {
  if (p > 0.75) return "#ef4444";
  if (p >= 0.45) return "#f59e0b";
  return "#10b981";
}

function getTimestamp() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

export default function LiveAnalysis({ progressState, filename }: LiveAnalysisProps) {
  const { logs, latest, resultEntry, partialWindowProbs } = progressState;
  const chartData = partialWindowProbs.map((p, i) => ({ i, prob: p }));
  const logEndRef = useRef<HTMLDivElement>(null);
  const progress = latest?.progress ?? 0;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pt-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-7 flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="font-display font-bold text-xl text-white mb-0.5">
            Analyzing Eye Movements
          </h1>
          <p className="text-xs font-mono text-gray-500 truncate max-w-sm">{filename}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neuro-blue/10 border border-neuro-blue/15 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-neuro-blue animate-pulse" />
          <span className="text-[10px] font-mono font-medium text-neuro-blue tracking-wider">PROCESSING</span>
        </div>
      </motion.div>

      {/* Progress bar */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-mono text-gray-500 truncate max-w-xs">
            {latest?.message ?? "Initializing pipeline..."}
          </span>
          <span className="text-[11px] font-mono font-medium text-neuro-blue/80 tabular-nums ml-2">
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 bg-neuro-card rounded-full overflow-hidden">
          {/* Track marks */}
          <div className="relative h-full">
            {[25, 50, 75].map((p) => (
              <div key={p} className="absolute top-0 bottom-0 w-px bg-white/[0.06]"
                style={{ left: `${p}%` }} />
            ))}
            <motion.div
              className="h-full progress-shimmer rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Terminal log */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Terminal size={11} className="text-gray-600" />
            <span className="text-[10px] font-display font-semibold tracking-widest uppercase text-gray-600">
              System Log
            </span>
            <div className="ml-auto flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500/40" />
              <div className="w-2 h-2 rounded-full bg-amber-500/40" />
              <div className="w-2 h-2 rounded-full bg-green-500/40" />
            </div>
          </div>
          <div className="bg-[#080c14] rounded-xl border border-white/[0.05] overflow-hidden crt-lines">
            {/* Terminal header */}
            <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2">
              <span className="font-mono text-[10px] text-gray-600">neurovision@inference:~$</span>
              <span className="w-2 h-3 bg-gray-600/50 cursor-blink inline-block" />
            </div>
            <div className="p-4 h-72 overflow-y-auto space-y-1.5">
              {logs.length === 0 && (
                <div className="text-gray-600 flex items-center gap-2 font-mono text-[11px]">
                  <Loader2 size={10} className="animate-spin" />
                  Establishing connection...
                </div>
              )}
              {logs.map((log, i) => {
                const cfg = getStageCfg(log.stage);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-2 font-mono text-[11px]"
                  >
                    {/* Sigil / stage code */}
                    <span className={`flex-shrink-0 w-5 text-center font-bold ${cfg.color} opacity-60`}>
                      {cfg.sigil}
                    </span>
                    <span className="flex-shrink-0 text-gray-700">{getTimestamp()}</span>
                    <span className={`flex-shrink-0 mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                    <span className="text-gray-300/80">{log.message}</span>
                    {log.type === "windows" && log.window_count && (
                      <span className="ml-auto text-purple-400/70 font-medium whitespace-nowrap">
                        ×{log.window_count}
                      </span>
                    )}
                  </motion.div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div>
          <AnimatePresence mode="wait">
            {resultEntry?.risk_score !== undefined ? (
              <motion.div
                key="gauge"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <p className="text-[10px] font-display font-semibold tracking-widest uppercase text-gray-600 mb-3">
                  Risk Assessment
                </p>
                <RiskGauge
                  score={resultEntry.risk_score}
                  level={resultEntry.risk_level as RiskLevel}
                  recommendation={resultEntry.recommendation ?? ""}
                />
              </motion.div>
            ) : chartData.length > 0 ? (
              <motion.div
                key="chart"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-display font-semibold tracking-widest uppercase text-gray-600">
                    Live Inference
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-gray-600 tabular-nums">
                    {chartData.length} / {latest?.message?.match(/\/(\d+)/)?.[1] ?? "?"} windows
                  </span>
                </div>
                <div className="bg-[#080c14] rounded-xl border border-white/[0.05] p-4 h-[17.5rem] crt-lines">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -18 }}>
                      <XAxis dataKey="i" hide />
                      <YAxis
                        domain={[0, 1]} tickCount={3}
                        tick={{ fill: "#374151", fontSize: 9, fontFamily: "DM Mono" }}
                        tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                      />
                      <ReferenceLine y={0.75} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} />
                      <ReferenceLine y={0.45} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.4} />
                      <Tooltip
                        formatter={(val) => [(val as number).toFixed(3), "PD prob"]}
                        labelFormatter={(i) => `Window ${(i as number) + 1}`}
                        contentStyle={{
                          background: "#0b0f1a", border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 8, fontSize: 11, fontFamily: "DM Mono",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                        }}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar dataKey="prob" isAnimationActive={false} radius={[2, 2, 0, 0]}>
                        {chartData.map((e, idx) => (
                          <Cell key={idx} fill={barColor(e.prob)} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2 font-mono text-[10px] text-gray-600">
                  <span><span className="text-emerald-500">■</span> LOW</span>
                  <span><span className="text-amber-500">■</span> MODERATE</span>
                  <span><span className="text-red-500">■</span> HIGH</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                className="flex flex-col items-center justify-center h-72 text-gray-700"
              >
                <Brain size={40} className="mb-3 opacity-15" />
                <p className="text-xs font-mono">Probability chart appears during inference</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
