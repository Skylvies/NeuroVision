import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Brain, Eye, Activity, Scan } from "lucide-react";

const WORDS = ["Detect", "Screen", "Analyze", "Assess"];

const STATS = [
  { value: "98.36%", label: "Test Accuracy" },
  { value: "300",    label: "Frame Window" },
  { value: "BiLSTM", label: "Architecture" },
  { value: "<2s",    label: "Inference" },
];

const PILLS = [
  { icon: <Brain size={12} />,    text: "Bidirectional LSTM" },
  { icon: <Eye size={12} />,      text: "Oculomotor Biomarkers" },
  { icon: <Activity size={12} />, text: "Real-time Streaming" },
];

// Pre-computed iris tick marks (every 10°, major every 30°)
const TICKS = Array.from({ length: 36 }, (_, i) => {
  const angle = (i * 10 - 90) * (Math.PI / 180);
  const isMajor = i % 3 === 0;
  const innerR = isMajor ? 87 : 91;
  return {
    x1: 100 + innerR * Math.cos(angle),
    y1: 100 + innerR * Math.sin(angle),
    x2: 100 + 95 * Math.cos(angle),
    y2: 100 + 95 * Math.sin(angle),
    isMajor,
  };
});

// Pre-computed iris texture lines (60 radial lines, r=32→72)
const TEXTURE = Array.from({ length: 60 }, (_, i) => {
  const a = (i * 6) * (Math.PI / 180);
  return {
    x1: 100 + 32 * Math.cos(a), y1: 100 + 32 * Math.sin(a),
    x2: 100 + 72 * Math.cos(a), y2: 100 + 72 * Math.sin(a),
  };
});

function IrisScanSVG() {
  return (
    <div className="relative w-[300px] h-[300px] flex-shrink-0 select-none">
      {/* Ambient glow behind the iris */}
      <div className="absolute inset-[-15%] rounded-full bg-neuro-blue/[0.08] blur-3xl" />
      <div className="absolute inset-[10%] rounded-full bg-neuro-purple/[0.05] blur-2xl" />

      {/* Rotating conic scan trail (CSS animation via .iris-scan-trail) */}
      <div
        className="iris-scan-trail absolute inset-0 rounded-full overflow-hidden"
        style={{
          background:
            "conic-gradient(from -20deg, transparent 0deg, rgba(59,130,246,0.14) 50deg, rgba(139,92,246,0.08) 75deg, transparent 95deg)",
        }}
      />

      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
        {/* ── Outer boundary ring ── */}
        <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />

        {/* ── Iris rings ── */}
        <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(59,130,246,0.07)" strokeWidth="0.5" strokeDasharray="3 5" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(59,130,246,0.11)" strokeWidth="0.8" />
        <circle cx="100" cy="100" r="46" fill="none" stroke="rgba(59,130,246,0.07)" strokeWidth="0.5" strokeDasharray="2 4" />
        <circle cx="100" cy="100" r="32" fill="none" stroke="rgba(139,92,246,0.18)" strokeWidth="1" />

        {/* ── Iris texture lines ── */}
        {TEXTURE.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="rgba(59,130,246,0.065)" strokeWidth="0.5" />
        ))}

        {/* ── Tick marks ── */}
        {TICKS.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.isMajor ? "rgba(59,130,246,0.45)" : "rgba(59,130,246,0.18)"}
            strokeWidth={t.isMajor ? "1.5" : "0.5"} />
        ))}

        {/* ── Pupil fill ── */}
        <circle cx="100" cy="100" r="20" fill="rgba(7,9,14,0.97)" stroke="rgba(139,92,246,0.38)" strokeWidth="1.5" />

        {/* ── Pulse ring (SVG animate) ── */}
        <circle cx="100" cy="100" fill="none" stroke="rgba(139,92,246,0.18)" strokeWidth="1" r="24">
          <animate attributeName="r" values="24;28;24" dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.18;0.45;0.18" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* ── Crosshair lines ── */}
        <line x1="100" y1="74" x2="100" y2="83" stroke="rgba(59,130,246,0.55)" strokeWidth="1" />
        <line x1="100" y1="117" x2="100" y2="126" stroke="rgba(59,130,246,0.55)" strokeWidth="1" />
        <line x1="74"  y1="100" x2="83"  y2="100" stroke="rgba(59,130,246,0.55)" strokeWidth="1" />
        <line x1="117" y1="100" x2="126" y2="100" stroke="rgba(59,130,246,0.55)" strokeWidth="1" />

        {/* ── Center blink dot ── */}
        <circle cx="100" cy="100" r="3" fill="rgba(59,130,246,0.95)">
          <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite"
            calcMode="discrete" keyTimes="0;0.45;1" />
        </circle>

        {/* ── Rotating scan arm ── */}
        <g>
          <line x1="100" y1="100" x2="100" y2="9"
            stroke="rgba(59,130,246,0.65)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="100" cy="9" r="2.5" fill="rgba(59,130,246,0.9)" />
          <animateTransform attributeName="transform" type="rotate"
            from="0 100 100" to="360 100 100" dur="7s" repeatCount="indefinite" />
        </g>

        {/* ── Compass labels ── */}
        <text x="100" y="5.5" textAnchor="middle" fill="rgba(59,130,246,0.45)" fontSize="6" fontFamily="DM Mono, monospace">N</text>
        <text x="196" y="103" textAnchor="middle" fill="rgba(59,130,246,0.45)" fontSize="6" fontFamily="DM Mono, monospace">E</text>
        <text x="100" y="198" textAnchor="middle" fill="rgba(59,130,246,0.45)" fontSize="6" fontFamily="DM Mono, monospace">S</text>
        <text x="4" y="103" textAnchor="middle" fill="rgba(59,130,246,0.45)" fontSize="6" fontFamily="DM Mono, monospace">W</text>

        {/* ── Data readout arcs (decorative) ── */}
        <path d="M 152 52 A 73 73 0 0 1 148 148" fill="none" stroke="rgba(59,130,246,0.12)" strokeWidth="1" strokeDasharray="4 8" />
        <path d="M 48 52 A 73 73 0 0 0 52 148" fill="none" stroke="rgba(59,130,246,0.12)" strokeWidth="1" strokeDasharray="4 8" />
      </svg>

      {/* Floating label */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap">
        <div className="w-1 h-1 rounded-full bg-neuro-blue/40 animate-pulse" />
        <span className="font-mono text-[9px] text-neuro-blue/35 tracking-[0.2em] uppercase">
          Oculomotor Scanner
        </span>
        <div className="w-1 h-1 rounded-full bg-neuro-blue/40 animate-pulse" />
      </div>
    </div>
  );
}

export default function HeroBanner() {
  const [wordIndex, setWordIndex] = useState(0);
  const [scanY, setScanY] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % WORDS.length), 2400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const duration = 5000;
    const step = (ts: number) => {
      if (!start) start = ts;
      setScanY(((ts - start) % duration) / duration);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative pt-24 pb-20 px-4 overflow-hidden">
      {/* Oscilloscope grid */}
      <div className="absolute inset-0 osc-grid opacity-70" />

      {/* Sweeping scan line */}
      <div
        className="absolute left-0 right-0 h-px pointer-events-none z-10"
        style={{
          top: `${scanY * 100}%`,
          background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 25%, rgba(139,92,246,0.5) 75%, transparent 100%)",
          boxShadow: "0 0 12px 2px rgba(59,130,246,0.18)",
          opacity: scanY > 0.04 && scanY < 0.96 ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />

      {/* Ambient core glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-neuro-blue/[0.05] blur-[100px]" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[300px] rounded-full bg-neuro-purple/[0.04] blur-[80px]" />
      </div>

      {/* Corner markers */}
      <div className="absolute top-8 left-8 w-6 h-6 border-l-2 border-t-2 border-neuro-blue/20 rounded-tl" />
      <div className="absolute top-8 right-8 w-6 h-6 border-r-2 border-t-2 border-neuro-blue/20 rounded-tr" />
      <div className="absolute bottom-8 left-8 w-6 h-6 border-l-2 border-b-2 border-neuro-blue/20 rounded-bl" />
      <div className="absolute bottom-8 right-8 w-6 h-6 border-r-2 border-b-2 border-neuro-blue/20 rounded-br" />

      {/* ── Two-column layout ── */}
      <div className="relative max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

        {/* Left: text content */}
        <div className="flex-1 min-w-0 text-center lg:text-left">

          {/* Top badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neuro-blue/20 bg-neuro-blue/[0.07] text-xs mb-8"
          >
            <Scan size={11} className="text-neuro-blue" />
            <span className="font-display font-medium tracking-wider uppercase text-neuro-blue/80">
              AI Neurological Screening
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-neuro-blue animate-pulse" />
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6"
          >
            <h1 className="font-display font-extrabold leading-[1.05] tracking-tight">
              <span
                className="block text-[clamp(2.6rem,6vw,4.6rem)] overflow-hidden"
                style={{ height: "1.15em" }}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIndex}
                    initial={{ y: "105%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "-105%" }}
                    transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                    className="text-gradient block"
                  >
                    {WORDS[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="block text-[clamp(2.6rem,6vw,4.6rem)] text-white/90">
                Parkinson's Risk
              </span>
            </h1>
            <p className="mt-5 text-base text-gray-400/80 max-w-lg leading-relaxed font-light mx-auto lg:mx-0">
              Upload eye-tracking data or record live video to detect oculomotor
              biomarkers linked to Parkinson's Disease using deep learning.
            </p>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-wrap justify-center lg:justify-start gap-2 mb-10"
          >
            {PILLS.map((pill) => (
              <div
                key={pill.text}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neuro-card-alt/70 border border-white/[0.07] text-gray-400 text-xs font-medium backdrop-blur-sm hover:border-neuro-blue/25 hover:text-gray-200 transition-all"
              >
                <span className="text-neuro-blue">{pill.icon}</span>
                {pill.text}
              </div>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="inline-flex items-stretch rounded-2xl border border-white/[0.07] bg-neuro-card/60 backdrop-blur-sm divide-x divide-white/[0.06] overflow-hidden"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="px-5 py-3.5 text-center">
                <p className="font-mono font-medium text-lg text-gradient-soft tabular-nums">
                  {stat.value}
                </p>
                <p className="text-[9px] font-display font-medium uppercase tracking-widest text-gray-600 mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: iris visualization (desktop only) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
          className="hidden lg:flex flex-shrink-0 items-center justify-center pb-8"
        >
          <IrisScanSVG />
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-neuro-black to-transparent pointer-events-none" />
    </div>
  );
}
