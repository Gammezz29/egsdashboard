import { useQuery } from "@tanstack/react-query";
import {
  fetchElevenLabsMetrics,
  type ElevenLabsMetrics,
  type MetricRange,
} from "@/lib/elevenLabs";

export const ELEVENLABS_METRICS_QUERY_KEY = ["elevenLabs", "metrics"] as const;

export const useElevenLabsMetrics = (range: MetricRange, agentId?: string) =>
  useQuery<ElevenLabsMetrics>({
    queryKey: [...ELEVENLABS_METRICS_QUERY_KEY, range, agentId],
    queryFn: () => fetchElevenLabsMetrics(range, agentId),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });