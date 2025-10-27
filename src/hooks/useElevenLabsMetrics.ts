import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteElevenLabsConversation,
  fetchElevenLabsAgents,
  fetchElevenLabsCallHistoryPage,
  fetchElevenLabsConversationAudio,
  fetchElevenLabsConversationDetails,
  fetchElevenLabsMetrics,
  type ElevenLabsAgent,
  type ElevenLabsCallDetails,
  type ElevenLabsCallHistoryPage,
  type ElevenLabsMetrics,
  type MetricsFilters,
} from "@/lib/elevenLabs";

export const ELEVENLABS_METRICS_QUERY_KEY = ["elevenLabs", "metrics"] as const;
export const ELEVENLABS_AGENTS_QUERY_KEY = ["elevenLabs", "agents"] as const;
export const ELEVENLABS_HISTORY_QUERY_KEY = ["elevenLabs", "history"] as const;

type QueryOptions = {
  enabled?: boolean;
};

export const useElevenLabsMetrics = (
  filters: MetricsFilters,
  options?: QueryOptions,
) =>
  useQuery<ElevenLabsMetrics>({
    queryKey: [
      ...ELEVENLABS_METRICS_QUERY_KEY,
      filters.range,
      filters.agentId ?? "all",
    ],
    queryFn: () => fetchElevenLabsMetrics(filters),
    staleTime: 1000 * 60 * 5,
    keepPreviousData: true,
    retry: false,
    enabled: options?.enabled ?? true,
  });

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

export const useElevenLabsCallHistory = (
  filters: MetricsFilters,
  options?: QueryOptions,
) =>
  useInfiniteQuery<ElevenLabsCallHistoryPage>({
    queryKey: [
      ...ELEVENLABS_HISTORY_QUERY_KEY,
      filters.range,
      filters.agentId ?? "all",
    ],
    queryFn: ({ pageParam }) =>
      fetchElevenLabsCallHistoryPage(filters, pageParam as string | undefined),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    initialPageParam: undefined,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    keepPreviousData: false,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });

export const useElevenLabsCallDetails = (
  callId: string | null,
  enabled = false,
) =>
  useQuery<ElevenLabsCallDetails>({
    queryKey: [...ELEVENLABS_HISTORY_QUERY_KEY, "detail", callId],
    queryFn: () => fetchElevenLabsConversationDetails(callId as string),
    enabled: Boolean(enabled && callId),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

export const useElevenLabsCallAudio = (
  callId: string | null,
  enabled = false,
) =>
  useQuery<Blob>({
    queryKey: [...ELEVENLABS_HISTORY_QUERY_KEY, "audio", callId],
    queryFn: () => fetchElevenLabsConversationAudio(callId as string),
    enabled: Boolean(enabled && callId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

export const useDeleteElevenLabsCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      deleteElevenLabsConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ELEVENLABS_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ELEVENLABS_METRICS_QUERY_KEY });
    },
  });
};
