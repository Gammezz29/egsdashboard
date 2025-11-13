const ELEVENLABS_DEFAULT_BASE_URL = "https://api.elevenlabs.io";

type Conversation = {
  conversation_id?: string;
  agent_id?: string;
  agent_name?: string | null;
  start_time_unix_secs?: number | null;
  start_time_unix?: number | null;
  call_start_time_unix?: number | null;
  call_started_at?: string | null;
  call_start_time_iso?: string | null;
  start_time_iso?: string | null;
  call_duration_secs?: number | null;
  duration_seconds?: number | null;
  call_successful?: string | boolean | null;
  status?: string | null;
  metadata?: unknown;
  client_data?: unknown;
  clientData?: unknown;
  vars?: unknown;
  client?: unknown;
  dynamic_variables?: unknown;
  dynamicVariables?: unknown;
};

type ConversationsResponse = {
  conversations?: Conversation[];
  next_cursor?: string | null;
  cursor?: string | null;
  has_more?: boolean;
};

type AgentRecord = {
  agent_id?: string;
  name?: string | null;
};

type AgentsResponse = {
  agents?: AgentRecord[];
  next_cursor?: string | null;
  cursor?: string | null;
  has_more?: boolean;
};

export type ElevenLabsAgent = {
  id: string;
  name: string;
};

export type MetricsRange = "ALL_TIME" | "LAST_7_DAYS" | "LAST_30_DAYS";

export type MetricsFilters = {
  range: MetricsRange;
  agentId?: string;
};

export type ElevenLabsCallStatus = "success" | "fail" | "unknown";

export type ElevenLabsCall = {
  id: string;
  agentId: string | null;
  agentName: string;
  startedAt: string | null;
  durationSeconds: number;
  status: ElevenLabsCallStatus;
  metadata?: Record<string, unknown>;
  metadataSearchText?: string;
  accountNumber?: string | null;
};

export type ElevenLabsTranscriptEntry = {
  role: string;
  message: string;
  timestamp?: string | null;
};

export type ElevenLabsCallDetails = ElevenLabsCall & {
  statusLabel: string;
  hasAudio: boolean;
  transcript: ElevenLabsTranscriptEntry[];
  metadata?: Record<string, unknown>;
};

export type ElevenLabsCallHistoryPage = {
  items: ElevenLabsCall[];
  nextCursor?: string;
  hasMore: boolean;
};

export type ElevenLabsMetrics = {
  totalCalls: number;
  averageDurationSeconds: number;
  successRate: number;
  callsByDay: Array<{ date: string; calls: number }>;
  successTimeline: Array<{ date: string; success: number; fail: number; unknown: number }>;
  breakdown?: ElevenLabsMetricsBreakdown;
  timestamp?: string;
  meta?: ElevenLabsMetricsMeta;
  fromCache?: boolean;
  cacheAge?: number;
  cacheKey?: string;
  error?: boolean;
};

export type ElevenLabsMetricsBreakdown = {
  success: number;
  fail: number;
  unknown: number;
};

export type ElevenLabsMetricsMeta = {
  range?: MetricsRange;
  agentId?: string | null;
  conversationsFetched?: number;
  pagesProcessed?: number;
  [key: string]: unknown;
};

const getEnvNumber = (
  value: string | undefined,
  fallback: number,
  options?: { min?: number; max?: number },
) => {
  if (value == null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const { min, max } = options ?? {};

  if (typeof min === "number" && parsed < min) {
    return min;
  }

  if (typeof max === "number" && parsed > max) {
    return max;
  }

  return parsed;
};

type MetricsCacheEntry = {
  metrics: ElevenLabsMetrics;
  updatedAt: number;
};

type AgentsCacheEntry = {
  agents: ElevenLabsAgent[];
  updatedAt: number;
};

export type ElevenLabsCallRequest = {
  to: string;
  lang?: string;
  vars?: Record<string, unknown>;
};

export type ElevenLabsCallResponse = {
  call_id?: string;
  [key: string]: unknown;
};

const METRICS_CACHE_STORAGE_KEY = "elevenlabs_metrics_cache_v1";
const AGENTS_CACHE_STORAGE_KEY = "elevenlabs_agents_cache_v1";

const metricsMemoryCache = new Map<string, MetricsCacheEntry>();
let agentsStorageCache: AgentsCacheEntry | null = null;

const getCacheTtlMs = () => {
  const minutes = getEnvNumber(
    import.meta.env.VITE_ELEVENLABS_METRICS_CACHE_TTL_MINUTES,
    15,
    { min: 0, max: 1440 },
  );

  return minutes <= 0 ? 0 : minutes * 60 * 1000;
};

const readMetricsCache = (key: string): MetricsCacheEntry | null => {
  if (metricsMemoryCache.has(key)) {
    return metricsMemoryCache.get(key)!;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(METRICS_CACHE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: Record<string, MetricsCacheEntry> = JSON.parse(raw);
    const entry = parsed?.[key];

    if (entry) {
      metricsMemoryCache.set(key, entry);
      return entry;
    }
  } catch (error) {
    // Silent fail
  }

  return null;
};

const writeMetricsCache = (key: string, entry: MetricsCacheEntry) => {
  metricsMemoryCache.set(key, entry);

  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(METRICS_CACHE_STORAGE_KEY);
    const parsed: Record<string, MetricsCacheEntry> = raw ? JSON.parse(raw) : {};
    parsed[key] = entry;
    window.localStorage.setItem(METRICS_CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    // Silent fail
  }
};

const getMetricsCacheKey = (filters: MetricsFilters) =>
  `${filters.range}:${filters.agentId ?? "all"}`;

const formatChartDateLabel = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

type MetadataSource = {
  value: unknown;
  includeRoot?: boolean;
};

const collectMetadataSegments = (
  value: unknown,
  includeRoot = false,
): Record<string, unknown>[] => {
  if (!isRecord(value)) {
    return [];
  }

  const segments: Record<string, unknown>[] = [];
  const visited = new WeakSet<Record<string, unknown>>();

  const visit = (node: Record<string, unknown>, includeSelf: boolean) => {
    if (visited.has(node)) {
      return;
    }

    visited.add(node);

    if (includeSelf) {
      segments.push(node);
    }

    const metadataCandidate = node["metadata"];
    if (isRecord(metadataCandidate)) {
      visit(metadataCandidate, true);
    }

    const clientDataCandidates = [
      node["client_data"],
      node["clientData"],
      node["client data"],
    ];

    for (const candidate of clientDataCandidates) {
      if (isRecord(candidate)) {
        segments.push({
          clientData: candidate,
          client_data: candidate,
        });
        visit(candidate, true);
        break;
      }
    }

    const varsCandidate = node["vars"];
    if (isRecord(varsCandidate)) {
      segments.push({ vars: varsCandidate });
      visit(varsCandidate, true);
    }

    const dynamicVariablesCandidate =
      node["dynamic_variables"] ??
      node["dynamicVariables"] ??
      node["scene_dynamic_variables"] ??
      node["sceneDynamicVariables"];
    if (isRecord(dynamicVariablesCandidate)) {
      segments.push({
        dynamicVariables: dynamicVariablesCandidate,
        dynamic_variables: dynamicVariablesCandidate,
      });
      visit(dynamicVariablesCandidate, true);
    }

    const clientCandidate = node["client"];
    if (isRecord(clientCandidate)) {
      segments.push({ client: clientCandidate });
      visit(clientCandidate, true);
    }

    Object.values(node).forEach((child) => {
      if (Array.isArray(child)) {
        child.forEach((entry) => {
          if (isRecord(entry)) {
            visit(entry, false);
          }
        });
        return;
      }

      if (isRecord(child)) {
        visit(child, false);
      }
    });
  };

  visit(value as Record<string, unknown>, includeRoot);

  return segments;
};

const ACCOUNT_NUMBER_KEY_SET = new Set([
  "accountnumber",
  "acctnumber",
  "accountid",
  "acctid",
  "clientaccountnumber",
]);

const KEY_FIELD_CANDIDATES = ["key", "name", "field", "variable", "label", "id"];
const VALUE_FIELD_CANDIDATES = ["value", "val", "data", "text", "content", "answer"];

const normaliseIdentifier = (value: string) => value.replace(/[\s_-]/g, "").toLowerCase();

const isPrimitiveValue = (value: unknown): value is string | number =>
  typeof value === "string" || typeof value === "number";

const extractAccountNumberFromRecord = (record: Record<string, unknown>): string | null => {
  for (const [key, value] of Object.entries(record)) {
    if (typeof key === "string" && ACCOUNT_NUMBER_KEY_SET.has(normaliseIdentifier(key))) {
      if (isPrimitiveValue(value)) {
        return String(value);
      }
    }
  }

  let identifiedKey: string | undefined;
  for (const candidate of KEY_FIELD_CANDIDATES) {
    const rawKey = record[candidate];
    if (typeof rawKey === "string" && rawKey.trim().length > 0) {
      identifiedKey = rawKey.trim();
      break;
    }
  }

  if (identifiedKey && ACCOUNT_NUMBER_KEY_SET.has(normaliseIdentifier(identifiedKey))) {
    for (const candidate of VALUE_FIELD_CANDIDATES) {
      if (candidate in record) {
        const rawValue = record[candidate];
        if (isPrimitiveValue(rawValue)) {
          return String(rawValue);
        }
      }
    }

    const valuesCandidate = record.values;
    if (Array.isArray(valuesCandidate) && valuesCandidate.length === 1) {
      const [first] = valuesCandidate;
      if (isPrimitiveValue(first)) {
        return String(first);
      }
    }
  }

  return null;
};

const extractAccountNumber = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }

  const visited = new WeakSet<Record<string, unknown>>();
  const stack: unknown[] = [value];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current == null) {
      continue;
    }

    if (Array.isArray(current)) {
      for (const entry of current) {
        if (entry != null) {
          stack.push(entry);
        }
      }
      continue;
    }

    if (isRecord(current)) {
      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      const extracted = extractAccountNumberFromRecord(current);
      if (extracted) {
        return extracted;
      }

      Object.values(current).forEach((child) => {
        if (child != null) {
          stack.push(child);
        }
      });
    }
  }

  return null;
};

const mergeMetadataSegments = (
  segments: Record<string, unknown>[],
): Record<string, unknown> | undefined => {
  if (segments.length === 0) {
    return undefined;
  }

  return segments.reduce<Record<string, unknown>>((acc, segment) => {
    Object.entries(segment).forEach(([key, value]) => {
      acc[key] = value;
    });
    return acc;
  }, {});
};

const resolveCallMetadata = (
  ...sources: MetadataSource[]
): Record<string, unknown> | undefined => {
  const segments: Record<string, unknown>[] = [];

  sources.forEach((source) => {
    if (source.value == null) {
      return;
    }

    const extracted = collectMetadataSegments(
      source.value,
      source.includeRoot ?? false,
    );

    if (extracted.length > 0) {
      segments.push(...extracted);
    }
  });

  return mergeMetadataSegments(segments);
};

const buildMetadataSearchText = (
  metadata: Record<string, unknown>,
): string | undefined => {
  try {
    return JSON.stringify(metadata).toLowerCase();
  } catch {
    return undefined;
  }
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const getConversationsCacheTtlMs = () => {
  const metricsTtlMs = getCacheTtlMs();
  const fallbackMinutes =
    metricsTtlMs <= 0 ? 0 : Math.max(1, Math.round(metricsTtlMs / (60 * 1000)));

  const minutes = getEnvNumber(
    import.meta.env.VITE_ELEVENLABS_CONVERSATION_CACHE_TTL_MINUTES,
    fallbackMinutes,
    { min: 0, max: 1440 },
  );

  return minutes <= 0 ? 0 : minutes * 60 * 1000;
};

const pickFiniteNumber = (
  ...values: Array<number | null | undefined>
): number | null => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
};

const pickDateFromIsoStrings = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (!value || typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const toDate = (conversation: Conversation): Date | null => {
  const seconds = pickFiniteNumber(
    conversation.start_time_unix_secs,
    conversation.start_time_unix,
    conversation.call_start_time_unix,
  );

  if (seconds != null) {
    const millis = seconds * 1000;
    if (Number.isFinite(millis)) {
      const date = new Date(millis);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return pickDateFromIsoStrings(
    conversation.call_started_at,
    conversation.call_start_time_iso,
    conversation.start_time_iso,
  );
};

const normaliseStatus = (conversation: Conversation): "success" | "fail" | "unknown" => {
  const status = conversation.call_successful ?? conversation.status;

  if (typeof status === "boolean") {
    return status ? "success" : "fail";
  }

  if (typeof status === "number") {
    if (status > 0) {
      return "success";
    }
    if (status < 0) {
      return "fail";
    }
  }

  if (!status || typeof status !== "string") {
    return "unknown";
  }

  const normalised = status.trim().toLowerCase();

  if (normalised === "true") {
    return "success";
  }

  if (normalised === "false") {
    return "fail";
  }

  if (normalised.includes("success") || normalised.includes("complete")) {
    return "success";
  }

  if (
    normalised.includes("fail") ||
    normalised.includes("error") ||
    normalised.includes("cancel")
  ) {
    return "fail";
  }

  return "unknown";
};

const getDurationSeconds = (conversation: Conversation) => {
  const duration = pickFiniteNumber(
    conversation.call_duration_secs,
    conversation.duration_seconds,
  );

  return duration ?? 0;
};

const toHistoryCall = (
  conversation: Conversation,
  agentLookup: Map<string, string> | undefined,
  fallbackIndex: number,
): ElevenLabsCall => {
  const agentId = (conversation.agent_id ?? "").trim() || null;

  const agentName =
    conversation.agent_name?.trim() ??
    (agentId && agentLookup ? agentLookup.get(agentId)?.trim() : undefined) ??
    agentId ??
    "Unknown agent";

  const startedAtDate = toDate(conversation);
  const startedAt = startedAtDate ? startedAtDate.toISOString() : null;

  const conversationId = conversation.conversation_id?.trim();
  const fallbackId =
    startedAtDate != null
      ? `conversation-${agentId ?? "unknown"}-${startedAtDate.getTime()}-${fallbackIndex}`
      : `conversation-${agentId ?? "unknown"}-${Date.now()}-${fallbackIndex}`;

  const metadata = resolveCallMetadata({ value: conversation });
  const conversationAccountNumber = extractAccountNumber(conversation);
  const metadataSearchText =
    metadata != null ? buildMetadataSearchText(metadata) : undefined;
  const accountNumber =
    extractAccountNumber(metadata) ?? conversationAccountNumber ?? null;

  return {
    id: conversationId && conversationId.length > 0 ? conversationId : fallbackId,
    agentId,
    agentName,
    startedAt,
    durationSeconds: getDurationSeconds(conversation),
    status: normaliseStatus(conversation),
    ...(metadata ? { metadata } : {}),
    ...(metadataSearchText ? { metadataSearchText } : {}),
    accountNumber,
  };
};

const fetchConversationsPage = async (
  baseUrl: string,
  headers: HeadersInit,
  params: Record<string, string>,
  cursor?: string,
) => {
  const url = new URL("/v1/convai/conversations", baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to load ElevenLabs conversations (${response.status}): ${errorText}`,
    );
  }

  const payload: ConversationsResponse = await response
    .json()
    .catch(() => ({}));

  const conversations = Array.isArray(payload.conversations)
    ? payload.conversations
    : [];

  const nextCursorCandidate =
    typeof payload.next_cursor === "string" && payload.next_cursor.trim().length > 0
      ? payload.next_cursor.trim()
      : typeof payload.cursor === "string" && payload.cursor.trim().length > 0
        ? payload.cursor.trim()
        : undefined;

  return {
    conversations,
    nextCursor: nextCursorCandidate,
    hasMore:
      payload.has_more != null
        ? Boolean(payload.has_more)
        : typeof nextCursorCandidate === "string" && nextCursorCandidate.length > 0,
  };
};

const fetchAgentsPage = async (
  baseUrl: string,
  headers: HeadersInit,
  params: Record<string, string>,
  cursor?: string,
) => {
  const url = new URL("/v1/convai/agents", baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to load ElevenLabs agents (${response.status}): ${errorText}`,
    );
  }

  const payload: AgentsResponse = await response
    .json()
    .catch(() => ({}));

  const agents = Array.isArray(payload.agents) ? payload.agents : [];

  const nextCursorCandidate =
    typeof payload.next_cursor === "string" && payload.next_cursor.trim().length > 0
      ? payload.next_cursor.trim()
      : typeof payload.cursor === "string" && payload.cursor.trim().length > 0
        ? payload.cursor.trim()
        : undefined;

  return {
    agents,
    nextCursor: nextCursorCandidate,
    hasMore:
      payload.has_more != null
        ? Boolean(payload.has_more)
        : typeof nextCursorCandidate === "string" && nextCursorCandidate.length > 0,
  };
};

type ConversationsCacheEntry = {
  data: Conversation[];
  fetchedAt: number;
};

const conversationsCache = new Map<MetricsRange, ConversationsCacheEntry>();
const conversationsPromise = new Map<MetricsRange, Promise<Conversation[]>>();
const conversationsPagesFetched = new Map<MetricsRange, number>();

const getRangeWindowSeconds = (range: MetricsRange): number | null => {
  if (range === "LAST_7_DAYS") {
    return 7 * 24 * 60 * 60;
  }

  if (range === "LAST_30_DAYS") {
    return 30 * 24 * 60 * 60;
  }

  return null;
};

const loadConversationsForRange = async (
  range: MetricsRange,
): Promise<Conversation[]> => {
  const cacheTtlMs = getConversationsCacheTtlMs();

  const cached = conversationsCache.get(range);
  if (cached) {
    if (cacheTtlMs > 0 && Date.now() - cached.fetchedAt < cacheTtlMs) {
      return cached.data;
    }

    conversationsCache.delete(range);
  }

  const pending = conversationsPromise.get(range);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing ElevenLabs API key. Set VITE_ELEVENLABS_API_KEY in your environment.",
      );
    }

    const baseUrl =
      import.meta.env.VITE_ELEVENLABS_BASE_URL ?? ELEVENLABS_DEFAULT_BASE_URL;

    const pageSize = getEnvNumber(import.meta.env.VITE_ELEVENLABS_CONVERSATION_PAGE_SIZE, 100, {
      min: 10,
      max: 1000,
    });

    const maxPagesSetting = getEnvNumber(
      import.meta.env.VITE_ELEVENLABS_CONVERSATION_PAGES,
      0,
      { min: 0 },
    );

    const maxPages =
      maxPagesSetting <= 0 ? Number.POSITIVE_INFINITY : maxPagesSetting;

    const headers: HeadersInit = {
      Accept: "application/json",
      "xi-api-key": apiKey,
    };

    const endTimestampSeconds = Math.floor(Date.now() / 1000);

    const params: Record<string, string> = {
      page_size: String(pageSize),
      call_start_before_unix: String(endTimestampSeconds),
    };

    const windowSeconds = getRangeWindowSeconds(range);
    if (windowSeconds != null) {
      const startTimestampSeconds = Math.max(0, endTimestampSeconds - windowSeconds);
      params.call_start_after_unix = String(startTimestampSeconds);
    }

    const collected: Conversation[] = [];

    let cursor: string | undefined;
    let page = 0;

    while (page < maxPages) {
      const { conversations, nextCursor } = await fetchConversationsPage(
        baseUrl,
        headers,
        params,
        cursor,
      );

      collected.push(...conversations);
      page += 1;

      if (!nextCursor) {
        break;
      }

      if (cursor === nextCursor) {
        break;
      }

      cursor = nextCursor;
    }

    collected.sort((a, b) => {
      const aDate = toDate(a)?.getTime() ?? 0;
      const bDate = toDate(b)?.getTime() ?? 0;
      return aDate - bDate;
    });

    conversationsPagesFetched.set(range, page);

    if (cacheTtlMs > 0) {
      conversationsCache.set(range, { data: collected, fetchedAt: Date.now() });
    } else {
      conversationsCache.delete(range);
    }
    return collected;
  })()
    .catch((error) => {
      conversationsCache.delete(range);
      conversationsPagesFetched.delete(range);
      throw error;
    })
    .finally(() => {
      conversationsPromise.delete(range);
    });

  conversationsPromise.set(range, promise);
  return promise;
};

let agentsCacheMeta: AgentsCacheEntry | null = null;
let agentsPromise: Promise<ElevenLabsAgent[]> | null = null;

const readAgentsCacheFromStorage = (): AgentsCacheEntry | null => {
  if (agentsStorageCache) {
    return agentsStorageCache;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AGENTS_CACHE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: AgentsCacheEntry = JSON.parse(raw);
    agentsStorageCache = parsed;
    return parsed;
  } catch (error) {
    return null;
  }
};

const writeAgentsCacheToStorage = (entry: AgentsCacheEntry) => {
  agentsStorageCache = entry;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AGENTS_CACHE_STORAGE_KEY, JSON.stringify(entry));
  } catch (error) {
    // Silent fail
  }
};

const loadAllAgents = async (options?: { force?: boolean }): Promise<ElevenLabsAgent[]> => {
  const agentsTtlMinutes = getEnvNumber(
    import.meta.env.VITE_ELEVENLABS_AGENTS_CACHE_TTL_MINUTES,
    0,
    { min: 0, max: 1440 },
  );

  const agentsTtlMs = agentsTtlMinutes <= 0 ? 0 : agentsTtlMinutes * 60 * 1000;
  const now = Date.now();

  if (!options?.force && agentsCacheMeta) {
    const isCacheValid =
      agentsTtlMs > 0 && now - agentsCacheMeta.updatedAt < agentsTtlMs;

    if (isCacheValid) {
      return agentsCacheMeta.agents;
    }

    agentsCacheMeta = null;
  }

  if (!options?.force && agentsTtlMs !== 0) {
    const stored = readAgentsCacheFromStorage();
    if (stored && now - stored.updatedAt < agentsTtlMs) {
      agentsCacheMeta = stored;
      return stored.agents;
    }
  }

  if (!agentsPromise || options?.force) {
    if (options?.force) {
      agentsPromise = null;
    }

    agentsPromise = (async () => {
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error(
          "Missing ElevenLabs API key. Set VITE_ELEVENLABS_API_KEY in your environment.",
        );
      }

      const baseUrl =
        import.meta.env.VITE_ELEVENLABS_BASE_URL ?? ELEVENLABS_DEFAULT_BASE_URL;

      const pageSize = getEnvNumber(
        import.meta.env.VITE_ELEVENLABS_AGENT_PAGE_SIZE,
        100,
        { min: 10, max: 500 },
      );

      const maxPagesSetting = getEnvNumber(
        import.meta.env.VITE_ELEVENLABS_AGENT_PAGES,
        0,
        { min: 0 },
      );

      const maxPages =
        maxPagesSetting <= 0 ? Number.POSITIVE_INFINITY : maxPagesSetting;

      const headers: HeadersInit = {
        Accept: "application/json",
        "xi-api-key": apiKey,
      };

      const params: Record<string, string> = {
        page_size: String(pageSize),
      };

      const collected = new Map<string, ElevenLabsAgent>();

      let cursor: string | undefined;
      let page = 0;

      while (page < maxPages) {
        const { agents, nextCursor } = await fetchAgentsPage(
          baseUrl,
          headers,
          params,
          cursor,
        );

        agents.forEach((agent) => {
          if (!agent.agent_id) {
            return;
          }

          collected.set(agent.agent_id, {
            id: agent.agent_id,
            name: agent.name?.trim() || agent.agent_id,
          });
        });

        page += 1;

        if (!nextCursor) {
          break;
        }

        if (cursor === nextCursor) {
          break;
        }

        cursor = nextCursor;
      }

      const list = Array.from(collected.values()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );

      const entry: AgentsCacheEntry = { agents: list, updatedAt: Date.now() };

      if (agentsTtlMs !== 0) {
        agentsCacheMeta = entry;
        writeAgentsCacheToStorage(entry);
      } else {
        agentsCacheMeta = null;
      }

      return list;
    })()
      .catch((error) => {
        agentsCacheMeta = null;
        throw error;
      })
      .finally(() => {
        agentsPromise = null;
      });
  }

  if (!agentsPromise) {
    throw new Error("Failed to initialise agents fetch promise.");
  }

  const agents = await agentsPromise;

  if (agentsTtlMs === 0) {
    agentsCacheMeta = null;
  } else if (!agentsCacheMeta) {
    agentsCacheMeta = { agents, updatedAt: Date.now() };
  }

  return agents;
};

const applyFilters = (
  conversations: Conversation[],
  filters: MetricsFilters,
) => {
  const filteredByAgent =
    filters.agentId != null && filters.agentId !== ""
      ? conversations.filter((conversation) => conversation.agent_id === filters.agentId)
      : conversations;

  if (filters.range === "ALL_TIME") {
    return filteredByAgent;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const rangeSeconds =
    filters.range === "LAST_7_DAYS" ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60;
  const minTimestamp = nowSeconds - rangeSeconds;

  const minMillis = minTimestamp * 1000;

  return filteredByAgent.filter((conversation) => {
    const date = toDate(conversation);
    if (!date) {
      return true;
    }

    return date.getTime() >= minMillis;
  });
};

const aggregateMetrics = (
  conversations: Conversation[],
  chartPointLimit: number,
): ElevenLabsMetrics => {
  if (conversations.length === 0) {
    return {
      totalCalls: 0,
      averageDurationSeconds: 0,
      successRate: 0,
      callsByDay: [],
      successTimeline: [],
      breakdown: {
        success: 0,
        fail: 0,
        unknown: 0,
      },
    };
  }

  const totalCalls = conversations.length;

  const totalDurationSeconds = conversations.reduce(
    (acc, conversation) => acc + getDurationSeconds(conversation),
    0,
  );

  const callsByDate = new Map<
    string,
    {
      date: Date;
      calls: number;
      success: number;
      fail: number;
      unknown: number;
    }
  >();

  let successCount = 0;
  let failCount = 0;
  let unknownCount = 0;

  conversations.forEach((conversation) => {
    const date = toDate(conversation) ?? new Date();
    const dayKey = date.toISOString().split("T")[0];

    const entry =
      callsByDate.get(dayKey) ??
      {
        date,
        calls: 0,
        success: 0,
        fail: 0,
        unknown: 0,
      };

    entry.calls += 1;

    const status = normaliseStatus(conversation);
    if (status === "success") {
      entry.success += 1;
      successCount += 1;
    } else if (status === "fail") {
      entry.fail += 1;
      failCount += 1;
    } else {
      entry.unknown += 1;
      unknownCount += 1;
    }

    callsByDate.set(dayKey, entry);
  });

  const sortedEntries = Array.from(callsByDate.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const limitedEntries =
    chartPointLimit > 0 && sortedEntries.length > chartPointLimit
      ? sortedEntries.slice(sortedEntries.length - chartPointLimit)
      : sortedEntries;

  const callsByDay = limitedEntries.map((entry) => ({
    date: formatChartDateLabel(entry.date),
    calls: entry.calls,
  }));

  const successTimeline = limitedEntries.map((entry) => ({
    date: formatChartDateLabel(entry.date),
    success: entry.success,
    fail: entry.fail,
    unknown: entry.unknown,
  }));

  const outcomeCount = successCount + failCount;

  return {
    totalCalls,
    averageDurationSeconds:
      totalCalls === 0 ? 0 : totalDurationSeconds / totalCalls,
    successRate: outcomeCount === 0 ? 0 : (successCount / outcomeCount) * 100,
    callsByDay,
    successTimeline,
    breakdown: {
      success: successCount,
      fail: failCount,
      unknown: unknownCount,
    },
  };
};

const getChartPointLimit = (range: MetricsRange) => {
  if (range === "LAST_7_DAYS") {
    return 7;
  }

  if (range === "LAST_30_DAYS") {
    return 30;
  }

  return getEnvNumber(import.meta.env.VITE_ELEVENLABS_CHART_POINTS, 30, {
    min: 1,
    max: 365,
  });
};

const normaliseCallsByDayFromWebhook = (
  value: unknown,
): Array<{ date: string; calls: number }> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<Array<{ date: string; calls: number }>>((acc, item) => {
    if (!isRecord(item)) {
      return acc;
    }

    const dateValue = typeof item.date === "string" ? item.date : undefined;
    if (!dateValue) {
      return acc;
    }

    const callsValue = toFiniteNumber(item.calls, 0);
    acc.push({ date: dateValue, calls: callsValue });
    return acc;
  }, []);
};

const normaliseSuccessTimelineFromWebhook = (
  value: unknown,
): Array<{ date: string; success: number; fail: number; unknown: number }> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<
    Array<{ date: string; success: number; fail: number; unknown: number }>
  >((acc, item) => {
    if (!isRecord(item)) {
      return acc;
    }

    const dateValue = typeof item.date === "string" ? item.date : undefined;
    if (!dateValue) {
      return acc;
    }

    acc.push({
      date: dateValue,
      success: toFiniteNumber(item.success, 0),
      fail: toFiniteNumber(item.fail, 0),
      unknown: toFiniteNumber(item.unknown, 0),
    });
    return acc;
  }, []);
};

const normaliseBreakdownFromWebhook = (
  value: unknown,
): ElevenLabsMetricsBreakdown | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    success: toFiniteNumber(value.success, 0),
    fail: toFiniteNumber(value.fail, 0),
    unknown: toFiniteNumber(value.unknown, 0),
  };
};

const normaliseMetaFromWebhook = (
  value: unknown,
): ElevenLabsMetricsMeta | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const meta: ElevenLabsMetricsMeta = {};

  if (typeof record.range === "string") {
    meta.range = record.range as MetricsRange;
  }

  if ("agentId" in record) {
    const agentIdValue = record.agentId;
    if (typeof agentIdValue === "string") {
      meta.agentId = agentIdValue;
    } else if (agentIdValue == null) {
      meta.agentId = null;
    }
  } else if ("agent_id" in record) {
    const agentIdValue = record.agent_id;
    if (typeof agentIdValue === "string") {
      meta.agentId = agentIdValue;
    } else if (agentIdValue == null) {
      meta.agentId = null;
    }
  }

  const conversationsFetchedValue =
    "conversationsFetched" in record
      ? record.conversationsFetched
      : record.conversations_fetched;
  const conversationsFetched = toFiniteNumber(conversationsFetchedValue, NaN);
  if (Number.isFinite(conversationsFetched)) {
    meta.conversationsFetched = conversationsFetched;
  }

  const pagesProcessedValue =
    "pagesProcessed" in record ? record.pagesProcessed : record.pages_processed;
  const pagesProcessed = toFiniteNumber(pagesProcessedValue, NaN);
  if (Number.isFinite(pagesProcessed)) {
    meta.pagesProcessed = pagesProcessed;
  }

  Object.entries(record).forEach(([key, entryValue]) => {
    if (
      key === "range" ||
      key === "agentId" ||
      key === "agent_id" ||
      key === "conversationsFetched" ||
      key === "conversations_fetched" ||
      key === "pagesProcessed" ||
      key === "pages_processed"
    ) {
      return;
    }

    (meta as Record<string, unknown>)[key] = entryValue;
  });

  return meta;
};

const fetchMetricsFromWebhook = async (
  webhookUrl: string,
  filters: MetricsFilters,
): Promise<ElevenLabsMetrics> => {
  let requestUrl: URL;

  try {
    requestUrl = new URL(webhookUrl);
  } catch (error) {
    const fallbackOrigin =
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : undefined;

    if (!fallbackOrigin) {
      throw new Error(`Invalid n8n webhook URL: ${webhookUrl}`);
    }

    requestUrl = new URL(webhookUrl, fallbackOrigin);
  }

  requestUrl.searchParams.set("range", filters.range);

  if (filters.agentId && filters.agentId.trim() !== "") {
    requestUrl.searchParams.set("agent_id", filters.agentId);
  }

  const response = await fetch(requestUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to load ElevenLabs metrics from webhook (${response.status}): ${errorText}`,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!isRecord(payload)) {
    throw new Error("Webhook returned an unexpected payload shape.");
  }

  const cacheAgeRaw = toFiniteNumber(payload.cacheAge, NaN);
  const cacheAgeSeconds = Number.isFinite(cacheAgeRaw)
    ? cacheAgeRaw > 1000
      ? cacheAgeRaw / 1000
      : cacheAgeRaw
    : undefined;
  const cacheKey =
    typeof payload.cacheKey === "string" && payload.cacheKey.trim().length > 0
      ? payload.cacheKey.trim()
      : undefined;
  const fromCache =
    typeof payload.fromCache === "boolean"
      ? payload.fromCache
      : typeof payload.fromCache === "string"
        ? payload.fromCache.toLowerCase() === "true"
        : undefined;
  const errorFlag =
    typeof payload.error === "boolean"
      ? payload.error
      : typeof payload.error === "string"
        ? payload.error.toLowerCase() === "true"
        : undefined;

  const metrics: ElevenLabsMetrics = {
    totalCalls: toFiniteNumber(payload.totalCalls, 0),
    averageDurationSeconds: toFiniteNumber(payload.averageDurationSeconds, 0),
    successRate: toFiniteNumber(payload.successRate, 0),
    callsByDay: normaliseCallsByDayFromWebhook(payload.callsByDay),
    successTimeline: normaliseSuccessTimelineFromWebhook(payload.successTimeline),
    breakdown: normaliseBreakdownFromWebhook(payload.breakdown),
    timestamp: typeof payload.timestamp === "string" ? payload.timestamp : undefined,
    meta: normaliseMetaFromWebhook(payload.meta),
    fromCache,
    cacheAge: cacheAgeSeconds,
    cacheKey,
    error: errorFlag,
  };

  const resolvedMeta: ElevenLabsMetricsMeta = {
    ...(metrics.meta ?? {}),
  };

  if (resolvedMeta.range == null) {
    resolvedMeta.range = filters.range;
  }

  if (resolvedMeta.agentId === undefined) {
    resolvedMeta.agentId = filters.agentId ?? null;
  }

  metrics.meta = resolvedMeta;

  if (metrics.fromCache == null) {
    metrics.fromCache = false;
  }

  if (metrics.cacheAge == null) {
    metrics.cacheAge = 0;
  }

  metrics.cacheKey ??=
    `elevenlabs_${filters.range}_${filters.agentId ?? "all"}`;
  metrics.error ??= false;

  return metrics;
};

export const fetchElevenLabsCallHistory = async (
  filters: MetricsFilters,
): Promise<ElevenLabsCall[]> => {
  const [conversations, agents] = await Promise.all([
    loadConversationsForRange(filters.range),
    loadAllAgents().catch(() => {
      return [] as ElevenLabsAgent[];
    }),
  ]);

  const agentLookup = new Map<string, string>(
    agents.map((agent) => [agent.id, agent.name]),
  );

  const filtered = applyFilters(conversations, filters);
  const calls = filtered.map((conversation, index) =>
    toHistoryCall(conversation, agentLookup, index),
  );

  calls.sort((a, b) => {
    const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return bTime - aTime;
  });

  return calls;
};

export const fetchElevenLabsCallHistoryPage = async (
  filters: MetricsFilters,
  cursor?: string,
): Promise<ElevenLabsCallHistoryPage> => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ElevenLabs API key. Set VITE_ELEVENLABS_API_KEY in your environment.",
    );
  }

  const baseUrl =
    import.meta.env.VITE_ELEVENLABS_BASE_URL ?? ELEVENLABS_DEFAULT_BASE_URL;

  const pageSize = getEnvNumber(
    import.meta.env.VITE_ELEVENLABS_HISTORY_PAGE_SIZE,
    getEnvNumber(import.meta.env.VITE_ELEVENLABS_CONVERSATION_PAGE_SIZE, 50, {
      min: 10,
      max: 1000,
    }),
    { min: 10, max: 200 },
  );

  const headers: HeadersInit = {
    Accept: "application/json",
    "xi-api-key": apiKey,
  };

  const endTimestampSeconds = Math.floor(Date.now() / 1000);

  const params: Record<string, string> = {
    page_size: String(pageSize),
    call_start_before_unix: String(endTimestampSeconds),
  };

  const windowSeconds = getRangeWindowSeconds(filters.range);
  if (windowSeconds != null) {
    const startTimestampSeconds = Math.max(0, endTimestampSeconds - windowSeconds);
    params.call_start_after_unix = String(startTimestampSeconds);
  }

  if (filters.agentId) {
    params.agent_id = filters.agentId;
  }

  const { conversations, nextCursor, hasMore } = await fetchConversationsPage(
    baseUrl,
    headers,
    params,
    cursor,
  );

  const filtered = applyFilters(conversations, filters);
  const calls = filtered.map((conversation, index) =>
    toHistoryCall(conversation, undefined, index),
  );

  calls.sort((a, b) => {
    const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return bTime - aTime;
  });

  return {
    items: calls,
    nextCursor,
    hasMore,
  };
};

const normaliseTranscriptEntry = (value: unknown): ElevenLabsTranscriptEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  const role =
    typeof value.role === "string" && value.role.trim().length > 0
      ? value.role.trim()
      : "unknown";

  const message =
    typeof value.message === "string" ? value.message.trim() : "";

  if (!message) {
    return null;
  }

  const timestamp =
    typeof value.timestamp === "string" && value.timestamp.trim().length > 0
      ? value.timestamp.trim()
      : undefined;

  return {
    role,
    message,
    timestamp,
  };
};

export const fetchElevenLabsConversationDetails = async (
  conversationId: string,
): Promise<ElevenLabsCallDetails> => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ElevenLabs API key. Set VITE_ELEVENLABS_API_KEY in your environment.",
    );
  }

  const baseUrl =
    import.meta.env.VITE_ELEVENLABS_BASE_URL ?? ELEVENLABS_DEFAULT_BASE_URL;

  const headers: HeadersInit = {
    Accept: "application/json",
    "xi-api-key": apiKey,
  };

  const url = new URL(`/v1/convai/conversations/${conversationId}`, baseUrl);
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to load ElevenLabs conversation (${response.status}): ${errorText}`,
    );
  }

  const payload = await response.json().catch(() => null);
  if (!isRecord(payload)) {
    throw new Error("Conversation response was not in the expected shape.");
  }

  const conversation: Conversation = payload;
  const call = toHistoryCall(conversation, undefined, 0);

  const statusLabelCandidate =
    typeof payload.status === "string" && payload.status.trim().length > 0
      ? payload.status.trim()
      : typeof payload.outcome === "string" && payload.outcome.trim().length > 0
        ? payload.outcome.trim()
        : call.status;

  const transcript = Array.isArray(payload.transcript)
    ? payload.transcript
        .map((entry) => normaliseTranscriptEntry(entry))
        .filter((entry): entry is ElevenLabsTranscriptEntry => Boolean(entry))
    : [];

  const metadata = resolveCallMetadata(
    { value: call.metadata, includeRoot: true },
    { value: payload },
  );
  const metadataSearchText =
    metadata != null
      ? buildMetadataSearchText(metadata)
      : call.metadataSearchText;
  const accountNumber = extractAccountNumber(metadata) ?? call.accountNumber ?? null;
  const startedAt =
    call.startedAt ??
    (typeof payload.call_started_at === "string" ? payload.call_started_at : null);
  const durationSeconds = getDurationSeconds(conversation);

  const hasAudio =
    typeof payload.has_audio === "boolean"
      ? payload.has_audio
      : Boolean(payload.audio_url ?? payload.recording_available);

  return {
    ...call,
    startedAt,
    durationSeconds,
    statusLabel: statusLabelCandidate,
    hasAudio,
    transcript,
    ...(metadata ? { metadata } : {}),
    ...(metadataSearchText ? { metadataSearchText } : {}),
    accountNumber,
  };
};

export const fetchElevenLabsConversationAudio = async (
  conversationId: string,
): Promise<Blob> => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ElevenLabs API key. Set VITE_ELEVENLABS_API_KEY in your environment.",
    );
  }

  const baseUrl =
    import.meta.env.VITE_ELEVENLABS_BASE_URL ?? ELEVENLABS_DEFAULT_BASE_URL;

  const headers: HeadersInit = {
    Accept: "audio/mpeg",
    "xi-api-key": apiKey,
  };

  const url = new URL(`/v1/convai/conversations/${conversationId}/audio`, baseUrl);
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to download ElevenLabs conversation audio (${response.status}): ${errorText}`,
    );
  }

  return response.blob();
};

export const deleteElevenLabsConversation = async (conversationId: string) => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ElevenLabs API key. Set VITE_ELEVENLABS_API_KEY in your environment.",
    );
  }

  const baseUrl =
    import.meta.env.VITE_ELEVENLABS_BASE_URL ?? ELEVENLABS_DEFAULT_BASE_URL;

  const headers: HeadersInit = {
    Accept: "application/json",
    "xi-api-key": apiKey,
  };

  const url = new URL(`/v1/convai/conversations/${conversationId}`, baseUrl);
  const response = await fetch(url, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to delete ElevenLabs conversation (${response.status}): ${errorText}`,
    );
  }
};

export const fetchElevenLabsMetrics = async (
  filters: MetricsFilters,
): Promise<ElevenLabsMetrics> => {
  const cacheKey = getMetricsCacheKey(filters);
  const cacheTtlMs = getCacheTtlMs();

  if (cacheTtlMs > 0) {
    const cached = readMetricsCache(cacheKey);
    if (cached && Date.now() - cached.updatedAt < cacheTtlMs) {
      return cached.metrics;
    }
  }

  const rawWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
  const webhookUrl =
    typeof rawWebhookUrl === "string" ? rawWebhookUrl.trim() : "";

  if (webhookUrl) {
    try {
      const metrics = await fetchMetricsFromWebhook(webhookUrl, filters);

      if (cacheTtlMs > 0) {
        writeMetricsCache(cacheKey, { metrics, updatedAt: Date.now() });
      }

      return metrics;
    } catch (error) {
      // Fall back to direct API
    }
  }

  const conversations = await loadConversationsForRange(filters.range);
  const filtered = applyFilters(conversations, filters);
  const limit = getChartPointLimit(filters.range);
  const aggregated = aggregateMetrics(filtered, limit);
  const fallbackCacheKey = `elevenlabs_${filters.range}_${filters.agentId ?? "all"}`;
  const pagesProcessed = conversationsPagesFetched.get(filters.range);

  const metrics: ElevenLabsMetrics = {
    ...aggregated,
    meta: {
      ...(aggregated.meta ?? {}),
      range: filters.range,
      agentId: filters.agentId ?? null,
      conversationsFetched: filtered.length,
      ...(typeof pagesProcessed === "number" && Number.isFinite(pagesProcessed)
        ? { pagesProcessed }
        : {}),
    },
    fromCache: aggregated.fromCache ?? false,
    cacheAge: aggregated.cacheAge ?? 0,
    timestamp: aggregated.timestamp ?? new Date().toISOString(),
    cacheKey: aggregated.cacheKey ?? fallbackCacheKey,
    error: aggregated.error ?? false,
  };

  if (cacheTtlMs > 0) {
    writeMetricsCache(cacheKey, { metrics, updatedAt: Date.now() });
  }

  return metrics;
};

export const fetchElevenLabsAgents = async (
  options?: { force?: boolean },
): Promise<ElevenLabsAgent[]> => {
  const agents = await loadAllAgents(options);
  return agents;
};

const MARYS_NO_SHOW_CALL_SPANISH_WEBHOOK_FALLBACK =
  "https://workflow.egsai.dev/webhook/Marys-NoShow-Call-es";

const normaliseLanguageHint = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const lowerCase = trimmed.toLowerCase();

  try {
    return lowerCase.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch {
    return lowerCase;
  }
};

const shouldUseSpanishCallWebhook = (payload: ElevenLabsCallRequest): boolean => {
  const hints: string[] = [];

  if (typeof payload.lang === "string") {
    hints.push(payload.lang);
  }

  const preferredLanguage = payload.vars?.preferred_language;
  if (typeof preferredLanguage === "string") {
    hints.push(preferredLanguage);
  }

  // Apply simple heuristics so we catch variations like "Spanish", "spa", or "espanol".
  return hints
    .map(normaliseLanguageHint)
    .filter((hint) => hint.length > 0)
    .some((hint) => {
      if (hint === "es" || hint === "sp" || hint === "spa") {
        return true;
      }

      if (hint.startsWith("es-") || hint.startsWith("es_") || hint.startsWith("spa")) {
        return true;
      }

      if (hint.includes("spanish") || hint.includes("espanol")) {
        return true;
      }

      return false;
    });
};

export const startElevenLabsCall = async (
  payload: ElevenLabsCallRequest,
): Promise<ElevenLabsCallResponse> => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid call payload provided to startElevenLabsCall.");
  }

  const primaryEndpoint =
    import.meta.env.VITE_MARYS_NO_SHOW_CALL_WEBHOOK ||
    "https://workflow.egsai.dev/webhook/Marys-NoShow-Call";

  const spanishEndpoint =
    import.meta.env.VITE_MARYS_NO_SHOW_CALL_WEBHOOK_ES ||
    MARYS_NO_SHOW_CALL_SPANISH_WEBHOOK_FALLBACK;

  const targetEndpoint = shouldUseSpanishCallWebhook(payload)
    ? spanishEndpoint
    : primaryEndpoint;

  const response = await fetch(targetEndpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });


  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to start ElevenLabs call (${response.status}): ${errorText}`,
    );
  }

  const data = await response.json().catch(() => ({}));
  return (data ?? {}) as ElevenLabsCallResponse;
};
