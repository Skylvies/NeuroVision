import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "@heroui/react";
import { Camera, CameraOff, Circle, Square, Loader2, AlertCircle, Eye } from "lucide-react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface WebcamCaptureProps {
  onFile: (file: File) => void;
  isLoading: boolean;
}

type CamState = "idle" | "requesting" | "loading_model" | "preview" | "recording" | "processing";

const RECORD_DURATION_S = 30;
// Iris landmark indices in MediaPipe FaceLandmarker
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];

let landmarkerInstance: FaceLandmarker | null = null;

async function getLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.4,
    minFacePresenceConfidence: 0.4,
    minTrackingConfidence: 0.4,
  });
  return landmarkerInstance;
}

function drawIris(ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number; z: number }[], w: number, h: number) {
  const drawGroup = (indices: number[], color: string) => {
    const center = landmarks[indices[0]];
    if (!center) return;

    const cx = center.x * w;
    const cy = center.y * h;

    // Outer glow
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = color.replace("1)", "0.15)");
    ctx.fill();

    // Iris circle
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  drawGroup(LEFT_IRIS, "rgba(59, 130, 246, 1)");   // blue
  drawGroup(RIGHT_IRIS, "rgba(16, 185, 129, 1)");  // green
}

export default function WebcamCapture({ onFile, isLoading }: WebcamCaptureProps) {
  const [state, setState] = useState<CamState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const stopAll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Detection loop using requestAnimationFrame
  const runDetection = useCallback(async (landmarker: FaceLandmarker) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => runDetection(landmarker));
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      try {
        const result = landmarker.detectForVideo(video, performance.now());
        if (result.faceLandmarks.length > 0) {
          setFaceDetected(true);
          drawIris(ctx, result.faceLandmarks[0], canvas.width, canvas.height);
        } else {
          setFaceDetected(false);
        }
      } catch {
        // ignore detection errors
      }
    }

    rafRef.current = requestAnimationFrame(() => runDetection(landmarker));
  }, []);

  const startCamera = async () => {
    setError(null);
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState("loading_model");
      const landmarker = await getLandmarker();
      runDetection(landmarker);
      setState("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Camera error";
      setError(
        msg.includes("denied") || msg.includes("Permission")
          ? "Camera permission denied. Please allow camera access and try again."
          : "Could not start camera: " + msg
      );
      setState("idle");
    }
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopAll();
    if (videoRef.current) videoRef.current.srcObject = null;
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    setState("idle");
    setError(null);
    setElapsed(0);
    setFaceDetected(false);
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setState("processing");
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const file = new File([blob], `webcam-${Date.now()}.webm`, { type: mimeType });
      stopAll();
      if (videoRef.current) videoRef.current.srcObject = null;
      const ctx = canvasRef.current?.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      onFile(file);
    };

    recorder.start(100);
    setState("recording");
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= RECORD_DURATION_S) {
          stopRecording();
          return RECORD_DURATION_S;
        }
        return prev + 1;
      });
    }, 1000);
  }, [onFile]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  }, []);

  const progress = (elapsed / RECORD_DURATION_S) * 100;
  const isVideoVisible = state !== "idle" && state !== "requesting";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-2xl border border-white/10 bg-neuro-card overflow-hidden"
    >
      {/* Video + canvas overlay */}
      <div className="relative bg-black aspect-video w-full overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          style={{ display: isVideoVisible ? "block" : "none" }}
        />
        {/* Canvas for iris overlay — positioned absolutely on top */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: isVideoVisible ? "block" : "none" }}
        />

        {/* Idle placeholder — stylized eye illustration */}
        {!isVideoVisible && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
            {/* Glow behind the eye */}
            <div className="relative">
              <div className="absolute inset-0 scale-150 rounded-full bg-neuro-blue/[0.07] blur-2xl" />
              <svg viewBox="0 0 160 100" className="relative w-40 h-auto opacity-55">
                {/* Upper eyelid */}
                <path d="M 12 50 Q 80 6 148 50" fill="none"
                  stroke="rgba(107,114,128,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                {/* Lower eyelid */}
                <path d="M 12 50 Q 80 94 148 50" fill="none"
                  stroke="rgba(107,114,128,0.5)" strokeWidth="1.5" strokeLinecap="round" />

                {/* Iris outer */}
                <circle cx="80" cy="50" r="28" fill="rgba(7,9,14,0.9)"
                  stroke="rgba(59,130,246,0.28)" strokeWidth="1.5" />

                {/* Iris rings */}
                <circle cx="80" cy="50" r="21" fill="none"
                  stroke="rgba(59,130,246,0.13)" strokeWidth="0.8" strokeDasharray="3 4" />
                <circle cx="80" cy="50" r="15" fill="none"
                  stroke="rgba(59,130,246,0.1)" strokeWidth="0.5" />

                {/* Iris texture lines */}
                {Array.from({ length: 16 }, (_, i) => {
                  const a = (i * 22.5 * Math.PI) / 180;
                  return (
                    <line key={i}
                      x1={80 + 16 * Math.cos(a)} y1={50 + 16 * Math.sin(a)}
                      x2={80 + 21 * Math.cos(a)} y2={50 + 21 * Math.sin(a)}
                      stroke="rgba(59,130,246,0.12)" strokeWidth="0.5" />
                  );
                })}

                {/* Pupil (pulsing radius) */}
                <circle cx="80" cy="50" r="9" fill="rgba(7,9,14,1)"
                  stroke="rgba(139,92,246,0.25)" strokeWidth="1">
                  <animate attributeName="r" values="9;11;9" dur="3s" repeatCount="indefinite" />
                </circle>

                {/* Rotating scan arc */}
                <circle cx="80" cy="50" r="28" fill="none"
                  stroke="rgba(59,130,246,0.18)" strokeWidth="1" strokeDasharray="12 76">
                  <animateTransform attributeName="transform" type="rotate"
                    from="0 80 50" to="360 80 50" dur="4s" repeatCount="indefinite" />
                </circle>

                {/* Crosshair */}
                <line x1="80" y1="33" x2="80" y2="40" stroke="rgba(59,130,246,0.4)" strokeWidth="0.8" />
                <line x1="80" y1="60" x2="80" y2="67" stroke="rgba(59,130,246,0.4)" strokeWidth="0.8" />
                <line x1="63" y1="50" x2="70" y2="50" stroke="rgba(59,130,246,0.4)" strokeWidth="0.8" />
                <line x1="90" y1="50" x2="97" y2="50" stroke="rgba(59,130,246,0.4)" strokeWidth="0.8" />

                {/* Center blink dot */}
                <circle cx="80" cy="50" r="2.5" fill="rgba(59,130,246,0.85)">
                  <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
                </circle>

                {/* Catchlight */}
                <circle cx="85" cy="45" r="3" fill="rgba(255,255,255,0.1)" />
              </svg>
            </div>

            <div className="text-center">
              <p className="font-mono text-[10px] text-gray-600 tracking-[0.18em] uppercase mb-0.5">
                Awaiting Input
              </p>
              <p className="text-xs text-gray-700">Camera off</p>
            </div>
          </div>
        )}

        {/* Loading model badge */}
        {state === "loading_model" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 text-white text-sm">
              <Loader2 size={14} className="animate-spin text-neuro-blue" />
              Loading iris model...
            </div>
          </div>
        )}

        {/* Face detection status badge */}
        {(state === "preview" || state === "recording") && (
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs backdrop-blur-sm transition-colors ${
            faceDetected
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
              : "bg-red-500/20 border border-red-500/40 text-red-400"
          }`}>
            <Eye size={11} />
            {faceDetected ? "Eyes detected" : "No face found"}
          </div>
        )}

        {/* Recording indicator + timer */}
        {state === "recording" && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-white font-mono">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
              {String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>
        )}

        {/* Recording progress bar */}
        {state === "recording" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <motion.div
              className="h-full bg-red-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "linear" }}
            />
          </div>
        )}

        {/* Processing overlay */}
        <AnimatePresence>
          {(state === "processing" || isLoading) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2"
            >
              <Spinner size="lg" color="primary" />
              <p className="text-sm text-white">Uploading for analysis...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls bar */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-sm text-white">Live Webcam</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {state === "idle" && "Record up to 30s of eye movement"}
              {state === "requesting" && "Requesting camera access..."}
              {state === "loading_model" && "Loading MediaPipe iris model..."}
              {state === "preview" && (faceDetected ? "Iris tracking active — press Record" : "Position your face in the frame")}
              {state === "recording" && `Recording… ${RECORD_DURATION_S - elapsed}s remaining`}
              {state === "processing" && "Sending to analysis pipeline..."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {state === "idle" && (
              <button
                onClick={startCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neuro-blue/10 border border-neuro-blue/20 text-neuro-blue text-xs hover:bg-neuro-blue/20 transition-colors"
              >
                <Camera size={14} />
                Start Camera
              </button>
            )}
            {state === "requesting" && (
              <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                <Loader2 size={14} className="animate-spin" />
                Waiting...
              </div>
            )}
            {state === "loading_model" && (
              <div className="flex items-center gap-1.5 text-neuro-blue text-xs">
                <Loader2 size={14} className="animate-spin" />
                Loading...
              </div>
            )}
            {state === "preview" && (
              <>
                <button
                  onClick={stopCamera}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <CameraOff size={14} />
                </button>
                <button
                  onClick={startRecording}
                  disabled={!faceDetected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Circle size={12} className="fill-red-400" />
                  Record
                </button>
              </>
            )}
            {state === "recording" && (
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
              >
                <Square size={12} className="fill-white" />
                Stop & Analyze
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {state === "preview" && !faceDetected && (
          <p className="text-xs text-amber-500/70">
            Look directly at the camera in good lighting. Recording is disabled until your face is detected.
          </p>
        )}
      </div>
    </motion.div>
  );
}
