import axios from "axios";
import type { Session, SessionDetail } from "../types/analysis.ts";
import type { AuthResponse } from "../types/auth.ts";

const API_BASE = (import.meta.env.VITE_API_URL as string) || "";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 300000,
});

// Inject JWT token on every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const body = new URLSearchParams({ username: email, password });
  const { data } = await api.post<AuthResponse>("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

export async function registerApi(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", { email, password });
  return data;
}

// ── Analysis ──────────────────────────────────────────────────────────────────

export async function uploadDataFile(file: File): Promise<Session> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<Session>("/analyze/data", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadVideoFile(file: File): Promise<Session> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<Session>("/analyze/video", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getSession(sessionId: string): Promise<SessionDetail> {
  const { data } = await api.get<SessionDetail>(`/sessions/${sessionId}`);
  return data;
}

export async function listSessions(): Promise<SessionDetail[]> {
  const { data } = await api.get<SessionDetail[]>("/sessions");
  return data;
}

export function createAnalysisWebSocket(sessionId: string): WebSocket {
  const wsBase = API_BASE
    ? API_BASE.replace(/^https?/, (m) => (m === "https" ? "wss" : "ws"))
    : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
  return new WebSocket(`${wsBase}/ws/analysis/${sessionId}`);
}
