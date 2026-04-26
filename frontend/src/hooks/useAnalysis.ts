import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  getSession,
  listSessions,
  uploadDataFile,
  uploadVideoFile,
} from "../services/api.ts";
import type { SessionDetail } from "../types/analysis.ts";

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => getSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const status = (query.state.data as SessionDetail | undefined)?.session
        ?.status;
      return status === "processing" || status === "pending" ? 2000 : false;
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
    staleTime: 30000,
  });
}

export function useDataUpload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadDataFile(file),
    onSuccess: (session) => {
      queryClient.setQueryData(["session", session.id], {
        session,
        result: null,
      });
      navigate(`/analysis/${session.id}`);
    },
  });
}

export function useVideoUpload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadVideoFile(file),
    onSuccess: (session) => {
      queryClient.setQueryData(["session", session.id], {
        session,
        result: null,
      });
      navigate(`/analysis/${session.id}`);
    },
  });
}
