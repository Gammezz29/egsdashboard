import { useQuery } from "@tanstack/react-query";
import { fetchElevenLabsAgents, type Agent } from "@/lib/elevenLabs";

export const ELEVENLABS_AGENTS_QUERY_KEY = ["elevenLabs", "agents"] as const;

export const useElevenLabsAgents = () =>
  useQuery<Agent[]>({
    queryKey: ELEVENLABS_AGENTS_QUERY_KEY,
    queryFn: fetchElevenLabsAgents,
    staleTime: 1000 * 60 * 60, // Cache agents for 1 hour
    retry: false,
  });