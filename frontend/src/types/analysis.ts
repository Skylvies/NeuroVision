export type RiskLevel = "HIGH" | "MODERATE" | "LOW";
export type InputType = "data" | "video";
export type SessionStatus = "pending" | "processing" | "complete" | "error";

export interface Session {
  id: string;
  input_type: InputType;
  filename: string;
  status: SessionStatus;
  error_message?: string | null;
  created_at: string;
  thumbnail?: string | null;
  user_id?: string | null;
}

export interface AnalysisResult {
  session_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  recommendation: string;
  num_windows: number;
  window_probs: number[];
  condition_scores?: Record<string, number> | null;
  analyzed_at: string;
}

export interface SessionDetail {
  session: Session;
  result: AnalysisResult | null;
}

export interface AnalysisProgress {
  type: "log" | "windows" | "result" | "error" | "inference_update";
  stage: string;
  progress: number;
  message: string;
  // type="windows" payload
  window_count?: number;
  // type="result" payload
  risk_score?: number;
  risk_level?: RiskLevel;
  recommendation?: string;
  window_probs?: number[];
  condition_scores?: Record<string, number> | null;
  // type="inference_update" payload
  partial_window_probs?: number[];
}
