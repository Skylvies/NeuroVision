import { Brain } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative mt-24">
      {/* Top separator with gradient */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-neuro-blue/8 border border-neuro-blue/15">
              <Brain size={14} className="text-neuro-blue/60" />
            </div>
            <div>
              <span className="font-display font-semibold text-sm text-gradient-soft">NeuroVision</span>
              <span className="text-gray-600 text-xs ml-2 font-light">
                Research screening tool — not a clinical diagnosis.
              </span>
            </div>
          </div>

          {/* Right tags */}
          <div className="flex items-center gap-2">
            {["BiLSTM", "MediaPipe", "FastAPI", "React"].map((tag) => (
              <span key={tag} className="text-[10px] font-mono text-gray-700 px-2 py-0.5 rounded bg-neuro-card border border-white/[0.04]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
