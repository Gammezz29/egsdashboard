import { useQuery } from "@tanstack/react-query";
import { fetchElevenLabsAgents, type ElevenLabsAgent } from "@/lib/elevenLabs";

export const ELEVENLABS_AGENTS_QUERY_KEY = ["elevenLabs", "agents"] as const;

export const useElevenLabsAgents = () =>
  useQuery<ElevenLabsAgent[]>({
    queryKey: ELEVENLABS_AGENTS_QUERY_KEY,
    queryFn: ({ meta }) =>
      fetchElevenLabsAgents(
        meta && typeof meta === "object" ? (meta as { force?: boolean }) : undefined,
      ),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    retry: false,
  });
