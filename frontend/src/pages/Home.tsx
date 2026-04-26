import { FileText, Video, Upload, Brain, BarChart2 } from "lucide-react";
import HeroBanner from "../components/home/HeroBanner.tsx";
import UploadCard from "../components/home/UploadCard.tsx";
import WebcamCapture from "../components/home/WebcamCapture.tsx";
import { useDataUpload, useVideoUpload } from "../hooks/useAnalysis.ts";

export default function Home() {
  const dataUpload = useDataUpload();
  const videoUpload = useVideoUpload();

  return (
    <div className="min-h-screen">
      <HeroBanner />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        {/* Upload section */}
        <h2 className="text-center text-[10px] font-display font-semibold text-gray-600 mb-6 uppercase tracking-[0.2em]">
          Choose Input Type
        </h2>

        {/* Top row: file upload cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <UploadCard
            title="Eye-Tracking Data"
            description="Upload raw eye-tracking data exported from clinical software (tobii, eyelink, etc.)"
            accept=".txt,.csv,.tsv"
            acceptLabel="Accepts .txt, .csv, .tsv — up to 200 MB"
            icon={<FileText size={28} />}
            onFile={(file) => dataUpload.mutate(file)}
            isLoading={dataUpload.isPending}
          />

          <UploadCard
            title="Eye Movement Video"
            description="Upload a face-forward video. MediaPipe will extract iris positions automatically."
            accept=".mp4,.avi,.mov,.mkv,.webm"
            acceptLabel="Accepts .mp4, .avi, .mov — up to 200 MB"
            icon={<Video size={28} />}
            onFile={(file) => videoUpload.mutate(file)}
            isLoading={videoUpload.isPending}
          />
        </div>

        {/* Webcam row */}
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" />
          <div className="relative flex justify-center mb-4">
            <span className="px-3 bg-neuro-black text-[10px] font-display font-semibold text-gray-600 uppercase tracking-[0.2em]">
              or use your webcam
            </span>
          </div>
          <WebcamCapture
            onFile={(file) => videoUpload.mutate(file)}
            isLoading={videoUpload.isPending}
          />
        </div>

        {/* Error display */}
        {(dataUpload.isError || videoUpload.isError) && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400">
              Upload failed:{" "}
              {(dataUpload.error ?? videoUpload.error)?.message ??
                "Unknown error"}
            </p>
          </div>
        )}

        {/* How it works */}
        <div className="mt-16">
          <h2 className="text-center text-[10px] font-display font-semibold text-gray-600 mb-10 uppercase tracking-[0.2em]">
            How It Works
          </h2>

          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Connector line (desktop) — sits at icon center height */}
            <div
              className="hidden sm:block absolute pointer-events-none"
              style={{ top: "3.25rem", left: "calc(16.67% + 26px)", right: "calc(16.67% + 26px)", height: "1px" }}
            >
              <div className="w-full h-full border-t border-dashed border-white/[0.08]" />
              {/* Mid-point dot */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-neuro-blue/20 border border-neuro-blue/30" />
            </div>

            {[
              {
                step: "01",
                title: "Upload Data",
                desc: "Provide raw eye-tracking data, a video file, or record directly from your webcam.",
                icon: <Upload size={18} className="text-neuro-blue" />,
                color: "border-neuro-blue/20 bg-neuro-blue/[0.06]",
              },
              {
                step: "02",
                title: "Deep Learning Analysis",
                desc: "Our BiLSTM model analyzes temporal gaze patterns across 300-frame windows.",
                icon: <Brain size={18} className="text-neuro-purple" />,
                color: "border-neuro-purple/20 bg-neuro-purple/[0.06]",
              },
              {
                step: "03",
                title: "Risk Assessment",
                desc: "Receive a risk score with HIGH / MODERATE / LOW stratification and recommendation.",
                icon: <BarChart2 size={18} className="text-neuro-green" />,
                color: "border-neuro-green/20 bg-neuro-green/[0.06]",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-xl bg-neuro-card border border-white/[0.06] overflow-hidden"
              >
                {/* Ghost step number */}
                <span className="absolute -right-1 -top-2 font-display font-extrabold text-[5.5rem] leading-none text-white/[0.025] select-none pointer-events-none tabular-nums">
                  {item.step}
                </span>

                {/* Icon circle */}
                <div className={`relative z-10 w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${item.color}`}>
                  {item.icon}
                </div>

                <span className="font-mono text-[10px] font-medium text-neuro-blue/50 tracking-wider">
                  STEP {item.step}
                </span>
                <h3 className="font-display font-semibold text-white mt-1 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-400/80 font-light leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
