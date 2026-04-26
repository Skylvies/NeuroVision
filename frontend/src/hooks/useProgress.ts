import { useEffect, useRef, useState } from "react";
import { createAnalysisWebSocket } from "../services/api.ts";
import type { AnalysisProgress } from "../types/analysis.ts";

export interface ProgressState {
  latest: AnalysisProgress | null;
  logs: AnalysisProgress[];
  resultEntry: AnalysisProgress | null;
  connected: boolean;
  partialWindowProbs: number[];
}

export function useProgress(
  sessionId: string | undefined,
  active: boolean
): ProgressState {
  const [state, setState] = useState<ProgressState>({
    latest: null,
    logs: [],
    resultEntry: null,
    connected: false,
    partialWindowProbs: [],
  });

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId || !active) return;

    const ws = createAnalysisWebSocket(sessionId);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, connected: true }));
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as AnalysisProgress;
        setState((prev) => ({
          ...prev,
          latest: msg,
          logs:
            msg.type === "log" || msg.type === "windows"
              ? [...prev.logs, msg]
              : prev.logs,
          resultEntry: msg.type === "result" ? msg : prev.resultEntry,
          partialWindowProbs:
            msg.type === "inference_update" && msg.partial_window_probs
              ? msg.partial_window_probs
              : msg.type === "result" && msg.window_probs
              ? msg.window_probs
              : prev.partialWindowProbs,
        }));
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };

    ws.onerror = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, active]);

  return state;
}
