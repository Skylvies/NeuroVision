import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart2, ShieldAlert } from "lucide-react";

interface RiskExplanationProps {
  numWindows: number;
  windowProbs: number[];
}

function getBarColor(prob: number): string {
  if (prob > 0.75) return "#ef4444";
  if (prob >= 0.45) return "#f59e0b";
  return "#10b981";
}

export default function RiskExplanation({
  numWindows,
  windowProbs,
}: RiskExplanationProps) {
  const chartData = windowProbs.map((prob, i) => ({
    window: i + 1,
    probability: Math.round(prob * 100),
  }));

  const highCount = windowProbs.filter((p) => p > 0.75).length;
  const modCount = windowProbs.filter((p) => p >= 0.45 && p <= 0.75).length;
  const lowCount = windowProbs.filter((p) => p < 0.45).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-5"
    >
      {/* Window stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { count: lowCount, label: "Low Risk", color: "#10b981", bg: "bg-emerald-500/8", border: "border-emerald-500/20" },
          { count: modCount, label: "Moderate", color: "#f59e0b", bg: "bg-amber-500/8", border: "border-amber-500/20" },
          { count: highCount, label: "High Risk", color: "#ef4444", bg: "bg-red-500/8", border: "border-red-500/20" },
        ].map(({ count, label, color, bg, border }) => (
          <div
            key={label}
            className={`rounded-xl ${bg} border ${border} p-3.5 text-center relative overflow-hidden`}
          >
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{ background: `radial-gradient(ellipse at 50% 100%, ${color}, transparent 70%)` }}
            />
            <p className="relative font-mono text-2xl font-medium tabular-nums" style={{ color }}>
              {count}
            </p>
            <p className="relative text-[10px] font-display font-semibold tracking-widest uppercase text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-window probability chart */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={13} className="text-gray-500" />
          <p className="text-xs text-gray-500">
            PD probability across {numWindows} temporal windows
          </p>
          <span className="ml-auto text-[10px] text-gray-600 flex items-center gap-2">
            <span className="text-emerald-500">■</span>LOW
            <span className="text-amber-500">■</span>MOD
            <span className="text-red-500">■</span>HIGH
          </span>
        </div>
        <div className="h-48 bg-neuro-dark rounded-xl p-3 border border-white/[0.05]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="10%" margin={{ left: -12 }}>
              <XAxis
                dataKey="window"
                tick={{ fill: "#4b5563", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#4b5563", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#131620",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  color: "#ecedee",
                  fontSize: "11px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
                formatter={(value) => [`${value}%`, "PD Probability"]}
                labelFormatter={(label) => `Window ${label as string}`}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
              <ReferenceLine y={45} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Bar dataKey="probability" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.probability / 100)}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-neuro-dark border border-white/[0.06]"
      >
        <ShieldAlert size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          <strong className="text-gray-400">Research tool only.</strong>{" "}
          NeuroVision is not a certified medical device. Results are indicative screening
          signals only. Always consult a qualified neurologist for clinical assessment.
        </p>
      </motion.div>
    </motion.div>
  );
}
