const ELEVENLABS_DEFAULT_BASE_URL = "https://api.elevenlabs.io";

// Use a dedicated endpoint for dashboard metrics if provided, otherwise fall back to conversations endpoint (which seems to be failing for the user).
// Based on user research, the dashboard endpoint is likely /v1/convai/settings/dashboard
const ELEVENLABS_DASHBOARD_ENDPOINT = "/v1/convai/settings/dashboard";
const ELEVENLABS_AGENTS_ENDPOINT = "/v1/convai/agents";

export type MetricRange = "LAST_7_DAYS" | "LAST_30_DAYS" | "ALL_TIME";

export type Agent = {
  agent_id: string;
  name: string;
};

type DashboardChartDataPoint = {
  date: string;
  calls?: number;
  success?: number;
  fail?: number;
};

type DashboardChart = {
  name: string;
  type: "line" | "area";
  data: DashboardChartDataPoint[];
};

type DashboardTotals = {
  total_calls: number;
  average_duration_seconds: number;
  success_rate: number;
  total_llm_cost: number;
  total_credits_spent: number;
};

type DashboardResponse = {
  totals: DashboardTotals;
  charts: DashboardChart[];
};

export type ElevenLabsMetrics = {
  totalCalls: number;
  averageDurationSeconds: number;
  successRate: number;
  callsByDay: Array<{ date: string; calls: number }>;
  successTimeline: Array<{ date: string; success: number; fail: number }>;
};

const getEnvString = (value: string | undefined, fallback: string) => {
  return value?.trim() || fallback;
};

const getHeaders = (apiKey: string): HeadersInit => ({
  Accept: "application/json",
  "xi-api-key": apiKey,
});

const parseDashboardResponse = (data: DashboardResponse): ElevenLabsMetrics => {
  const callsChart = data.charts.find((c) => c.name === "Calls");
  const successChart = data.charts.find((c) => c.name === "Success Rate");

  return {
    totalCalls: data.totals.total_calls,
    averageDurationSeconds: data.totals.average_duration_seconds,
    successRate: data.totals.success_rate,
    callsByDay:
      callsChart?.data.map((p) => ({
        date: p.date,
        calls: p.calls ?? 0,
      })) ?? [],
    successTimeline:
      successChart?.data.map((p) => ({
        date: p.date,
        success: p.success ?? 0,
        fail: p.fail ?? 0,
      })) ?? [],
  };
};

export const fetchElevenLabsMetrics = async (
  range: MetricRange,
  agentId?: string,
): Promise<ElevenLabsMetrics> => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ElevenLabs API key. Set VITE_ELEVENLABS_API_KEY in your environment.",
    );
  }

  const baseUrl =
    import.meta.env.VITE_ELEVENLABS_BASE_URL ?? ELEVENLABS_DEFAULT_BASE_URL;
  
  const endpoint = getEnvString(
    import.meta.env.VITE_ELEVENLABS_DASHBOARD_ENDPOINT,
    ELEVENLABS_DASHBOARD_ENDPOINT,
  );

  const url = new URL(endpoint, baseUrl);
  url.searchParams.set("range", range);
  
  if (agentId && agentId !== "all") {
    url.searchParams.set("agent_id", agentId);
  }

  const headers = getHeaders(apiKey);
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to load ElevenLabs dashboard metrics (${response.status}): ${errorText}`,
    );
  }

  const payload: DashboardResponse = await response.json().catch(() => {
    throw new Error("Invalid response format from ElevenLabs dashboard API.");
  });

  return parseDashboardResponse(payload);
};

export const fetchElevenLabsAgents = async (): Promise<Agent[]> => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    // If API key is missing, we can't fetch agents, return empty array silently
    return [];
  }

  const baseUrl =
    import.meta.env.VITE_ELEVENLABS_BASE_URL ?? ELEVENLABS_DEFAULT_BASE_URL;
  
  const endpoint = getEnvString(
    import.meta.env.VITE_ELEVENLABS_AGENTS_ENDPOINT,
    ELEVENLABS_AGENTS_ENDPOINT,
  );

  const url = new URL(endpoint, baseUrl);
  
  const headers = getHeaders(apiKey);
  const response = await fetch(url, { headers });

  if (!response.ok) {
    // Log error but don't throw, so the rest of the dashboard can load
    console.error(
      `Failed to load ElevenLabs agents (${response.status}): ${await response.text().catch(() => "")}`,
    );
    return [];
  }

  // Assuming the agent list endpoint returns an array of agents directly, or an object containing an array 'agents'.
  const payload = await response.json().catch(() => {
    console.error("Invalid response format from ElevenLabs agents API.");
    return { agents: [] };
  });

  const agents = Array.isArray(payload) ? payload : payload.agents;
  
  if (!Array.isArray(agents)) {
    return [];
  }

  return agents.map(agent => ({
    agent_id: agent.agent_id,
    name: agent.name,
  }));
};