import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Spinner } from "@heroui/react";
import { Upload, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

interface UploadCardProps {
  title: string;
  description: string;
  accept: string;
  acceptLabel: string;
  icon: ReactNode;
  onFile: (file: File) => void;
  isLoading: boolean;
}

export default function UploadCard({
  title, description, accept, acceptLabel, icon, onFile, isLoading,
}: UploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => { setSelectedFile(file.name); onFile(file); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isLoading ? { y: -4 } : {}}
      transition={{ duration: 0.35 }}
      className={`relative rounded-2xl cursor-pointer overflow-hidden corner-bracket group ${
        isLoading ? "pointer-events-none opacity-60" : ""
      }`}
      onClick={() => !isLoading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {/* Animated gradient border */}
      <div
        className={`absolute inset-0 rounded-2xl transition-opacity duration-400 ${
          isDragOver ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.5) 0%, rgba(139,92,246,0.5) 100%)",
          padding: "1px",
        }}
      >
        <div className="w-full h-full rounded-2xl bg-neuro-card" />
      </div>

      {/* Base border */}
      <div className={`absolute inset-0 rounded-2xl border transition-colors duration-300 ${
        isDragOver ? "border-neuro-blue/50 bg-neuro-blue/[0.04]" : "border-white/[0.07]"
      }`} />

      {/* Card body */}
      <div className="relative bg-neuro-card m-[1px] rounded-2xl p-8 flex flex-col items-center text-center gap-5">
        {/* Icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-neuro-blue/20 to-neuro-purple/15 blur-xl" />
          <div className="relative p-4 rounded-2xl bg-gradient-to-br from-neuro-blue/12 to-neuro-purple/8 border border-white/[0.07]">
            <span className="text-neuro-blue">{icon}</span>
          </div>
        </div>

        {/* Text */}
        <div>
          <h3 className="font-display font-semibold text-base text-white mb-1.5">{title}</h3>
          <p className="text-sm text-gray-400/80 leading-relaxed">{description}</p>
        </div>

        {/* Status */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-neuro-blue text-sm font-medium">
            <Spinner size="sm" color="primary" />
            <span>Uploading...</span>
          </div>
        ) : selectedFile ? (
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
            <CheckCircle2 size={14} />
            <span className="truncate max-w-48 font-mono text-xs">{selectedFile}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-gray-500 text-sm group-hover:text-gray-300 transition-colors">
            <Upload size={13} />
            <span>Drop or click to browse</span>
          </div>
        )}

        <p className="text-[11px] font-mono text-gray-600">{acceptLabel}</p>
      </div>
    </motion.div>
  );
}
