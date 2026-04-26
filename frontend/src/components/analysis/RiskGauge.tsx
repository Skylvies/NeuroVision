import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import type { RiskLevel } from "../../types/analysis.ts";

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  recommendation: string;
}

const LEVEL_CONFIG: Record<RiskLevel, {
  color: string; glow: string; bg: string; border: string;
  icon: ReactNode; pulse: string; track: string;
}> = {
  HIGH: {
    color: "#ef4444", glow: "rgba(239,68,68,0.25)",
    bg: "bg-red-500/[0.08]", border: "border-red-500/20",
    icon: <AlertTriangle size={20} className="text-red-400" />,
    pulse: "risk-pulse-high", track: "#2a1010",
  },
  MODERATE: {
    color: "#f59e0b", glow: "rgba(245,158,11,0.25)",
    bg: "bg-amber-500/[0.08]", border: "border-amber-500/20",
    icon: <AlertCircle size={20} className="text-amber-400" />,
    pulse: "risk-pulse-moderate", track: "#1e1a0a",
  },
  LOW: {
    color: "#10b981", glow: "rgba(16,185,129,0.25)",
    bg: "bg-emerald-500/[0.08]", border: "border-emerald-500/20",
    icon: <CheckCircle size={20} className="text-emerald-400" />,
    pulse: "risk-pulse-low", track: "#0a1e16",
  },
};

// Build SVG tick marks for the semicircle gauge
function GaugeTicks({ color }: { color: string }) {
  const cx = 50, cy = 50, r = 44;
  const ticks = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg viewBox="0 0 100 100" className="gauge-ticks absolute inset-0 w-full h-full" style={{ transform: "rotate(0deg)" }}>
      {ticks.map((i) => {
        const angle = (180 - i * 18) * (Math.PI / 180);
        const isMajor = i % 5 === 0;
        const len = isMajor ? 5 : 3;
        const x1 = cx + (r - 1) * Math.cos(angle);
        const y1 = cy - (r - 1) * Math.sin(angle);
        const x2 = cx + (r - 1 + len) * Math.cos(angle);
        const y2 = cy - (r - 1 + len) * Math.sin(angle);
        return (
          <line
            key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth={isMajor ? "0.8" : "0.5"}
            strokeOpacity={isMajor ? 0.5 : 0.25}
          />
        );
      })}
    </svg>
  );
}

export default function RiskGauge({ score, level, recommendation }: RiskGaugeProps) {
  const cfg = LEVEL_CONFIG[level];
  const pct = Math.round(score * 100);
  const chartData = [{ value: pct, fill: cfg.color }];

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className="flex flex-col items-center gap-5"
    >
      {/* Gauge container */}
      <div className="relative w-60 h-60">
        {/* Outer ambient glow */}
        <div
          className="absolute inset-6 rounded-full blur-2xl"
          style={{ background: cfg.glow, opacity: 0.5 }}
        />

        {/* Tick marks overlay */}
        <GaugeTicks color={cfg.color} />

        {/* Recharts radial bar */}
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="65%" outerRadius="82%"
            startAngle={180} endAngle={0}
            data={chartData}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: cfg.track }}
              dataKey="value"
              angleAxisId={0}
              cornerRadius={12}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-7">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 300 }}
            className={`p-2 rounded-full ${cfg.bg} border ${cfg.border} ${cfg.pulse}`}
          >
            {cfg.icon}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="font-mono font-medium text-[2.6rem] leading-none mt-2 tabular-nums"
            style={{ color: cfg.color }}
          >
            {pct}<span className="text-2xl opacity-70">%</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.52 }}
            className="flex items-center gap-1.5 mt-1"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: cfg.color }}
            />
            <p className="font-display text-[10px] font-bold tracking-[0.2em] uppercase"
              style={{ color: cfg.color, opacity: 0.75 }}>
              {level} RISK
            </p>
          </motion.div>
        </div>
      </div>

      {/* Threshold legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-4 text-[10px] font-mono text-gray-600"
      >
        <span><span className="text-emerald-500">▬</span> &lt;45% LOW</span>
        <span><span className="text-amber-500">▬</span> 45–75% MOD</span>
        <span><span className="text-red-500">▬</span> &gt;75% HIGH</span>
      </motion.div>

      {/* Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className={`w-full rounded-xl p-4 border ${cfg.bg} ${cfg.border} relative overflow-hidden`}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${cfg.color}, transparent 65%)` }}
        />
        <p className="relative text-sm text-center text-gray-200 leading-relaxed font-light">
          {recommendation}
        </p>
      </motion.div>
    </motion.div>
  );
}
