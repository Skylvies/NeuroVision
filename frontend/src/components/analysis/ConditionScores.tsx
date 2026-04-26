import { motion } from "framer-motion";
import { Brain, Cpu, FlaskConical, Activity } from "lucide-react";
import type { ReactNode } from "react";

interface ConditionScoresProps {
  scores: Record<string, number>;
}

interface ConditionConfig {
  label: string;
  description: string;
  icon: ReactNode;
  color: string;
  track: string;
  glow: string;
  badge: "ML MODEL" | "HEURISTIC";
  badgeColor: string;
}

const CONDITIONS: Record<string, ConditionConfig> = {
  parkinsons: {
    label: "Parkinson's Disease",
    description: "Oculomotor dysfunction via BiLSTM",
    icon: <Brain size={14} />,
    color: "#3b82f6",
    track: "#0e1a2e",
    glow: "rgba(59,130,246,0.15)",
    badge: "ML MODEL",
    badgeColor: "text-neuro-blue border-neuro-blue/30 bg-neuro-blue/10",
  },
  alzheimers: {
    label: "Alzheimer's Disease",
    description: "Gaze instability coefficient of variation",
    icon: <Activity size={14} />,
    color: "#a78bfa",
    track: "#1a0e2e",
    glow: "rgba(167,139,250,0.15)",
    badge: "HEURISTIC",
    badgeColor: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  },
  ms: {
    label: "Multiple Sclerosis",
    description: "Binocular discoordination (INO proxy)",
    icon: <Cpu size={14} />,
    color: "#06b6d4",
    track: "#0a1e24",
    glow: "rgba(6,182,212,0.15)",
    badge: "HEURISTIC",
    badgeColor: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  },
  huntingtons: {
    label: "Huntington's Disease",
    description: "Saccadic intrusion rate",
    icon: <FlaskConical size={14} />,
    color: "#f97316",
    track: "#2e180a",
    glow: "rgba(249,115,22,0.15)",
    badge: "HEURISTIC",
    badgeColor: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  },
};

const DISPLAY_ORDER = ["parkinsons", "alzheimers", "ms", "huntingtons"];

function scoreToLevel(score: number): { label: string; color: string } {
  if (score >= 0.75) return { label: "HIGH", color: "#ef4444" };
  if (score >= 0.45) return { label: "MOD", color: "#f59e0b" };
  return { label: "LOW", color: "#10b981" };
}

export default function ConditionScores({ scores }: ConditionScoresProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-white/[0.06] bg-neuro-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-sm text-white">
            Neurological Risk Indicators
          </h3>
          <p className="text-[11px] font-mono text-gray-600 mt-0.5">
            Oculomotor biomarker analysis — 4 conditions
          </p>
        </div>
        <span className="text-[10px] font-mono text-gray-700 bg-white/[0.03] border border-white/[0.05] px-2 py-1 rounded">
          EXPERIMENTAL
        </span>
      </div>

      {/* Condition rows */}
      <div className="divide-y divide-white/[0.04]">
        {DISPLAY_ORDER.map((key, i) => {
          const cfg = CONDITIONS[key];
          if (!cfg) return null;
          const rawScore = scores[key] ?? 0;
          const pct = Math.round(rawScore * 100);
          const { label: riskLabel, color: riskColor } = scoreToLevel(rawScore);

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
              className="px-5 py-4 group"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="mt-0.5 flex-shrink-0 p-1.5 rounded-lg border"
                  style={{
                    background: cfg.glow,
                    borderColor: `${cfg.color}30`,
                    color: cfg.color,
                  }}
                >
                  {cfg.icon}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-[13px] text-gray-200">
                      {cfg.label}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-semibold tracking-widest px-1.5 py-0.5 rounded border ${cfg.badgeColor}`}
                    >
                      {cfg.badge}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-gray-600 font-mono mt-0.5 truncate">
                    {cfg.description}
                  </p>

                  {/* Bar */}
                  <div className="mt-2.5 flex items-center gap-3">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: cfg.track }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: cfg.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.4 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                      />
                    </div>

                    {/* Score + level */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="font-mono font-semibold text-[13px] tabular-nums"
                        style={{ color: cfg.color }}
                      >
                        {pct}%
                      </span>
                      <span
                        className="text-[9px] font-mono font-bold tracking-widest px-1 py-0.5 rounded"
                        style={{ color: riskColor, background: `${riskColor}15` }}
                      >
                        {riskLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
        <p className="text-[10px] font-mono text-gray-700 leading-relaxed">
          <span className="text-neuro-blue">ML MODEL</span> uses a trained BiLSTM on clinical eye-tracking data.{" "}
          <span className="text-violet-400">HEURISTIC</span> scores derive from published oculomotor biomarker literature and are
          indicative only — not diagnostic. Consult a neurologist for clinical evaluation.
        </p>
      </div>
    </motion.div>
  );
}
