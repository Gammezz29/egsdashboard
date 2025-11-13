import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from "lucide-react";
import { useElevenLabsAgents, useElevenLabsMetrics } from "@/hooks/useElevenLabsMetrics";
import { useAuth } from "@/hooks/useAuth";
import { ensureAgentIdForUser, filterAgentsForUser, isAgentAccessRestricted } from "@/lib/accessControl";
import type { MetricsRange } from "@/lib/elevenLabs";

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;

  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
};

const formatPercentage = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0%";
  }

  const rounded = Number(value.toFixed(1));
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
};

const agentsData = [
  { name: "Grace Marys", calls: 429, minutes: 238.9, llmCost: "$2.76", credits: "213,757" },
  { name: "Marys Demo n8n", calls: 305, minutes: 357.433, llmCost: "$0.0984", credits: "105,341" },
  { name: "GraceMarys", calls: 191, minutes: 148.933, llmCost: "$1.05", credits: "128,192" },
];

const languageData = [
  { language: "English", percentage: 88.2 },
  { language: "Spanish", percentage: 11.8 },
];

const rangeOptions: { label: string; value: MetricsRange }[] = [
  { label: "Last 7 Days", value: "LAST_7_DAYS" },
  { label: "Last 30 Days", value: "LAST_30_DAYS" },
  { label: "All Time", value: "ALL_TIME" },
];

const Index = () => {
  const { user } = useAuth();
  const requiresRestriction = isAgentAccessRestricted(user);

  const [selectedRange, setSelectedRange] = useState<MetricsRange>("LAST_7_DAYS");
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    requiresRestriction ? "" : "all",
  );

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good night";
  };

  const greeting = getGreeting();

  const {
    data: agents,
    isLoading: isAgentsLoading,
    isError: isAgentsError,
  } = useElevenLabsAgents();

  const accessibleAgents = useMemo(
    () => filterAgentsForUser(agents, user),
    [agents, user],
  );

  useEffect(() => {
    if (requiresRestriction) {
      if (accessibleAgents.length === 0) {
        setSelectedAgentId("");
        return;
      }

      setSelectedAgentId((current) => {
        if (accessibleAgents.some((agent) => agent.id === current)) {
          return current;
        }
        return accessibleAgents[0].id;
      });
      return;
    }

    if (
      selectedAgentId !== "all" &&
      accessibleAgents.length > 0 &&
      !accessibleAgents.some((agent) => agent.id === selectedAgentId)
    ) {
      setSelectedAgentId("all");
    }
  }, [accessibleAgents, requiresRestriction, selectedAgentId]);

  const effectiveAgentId = useMemo(
    () => ensureAgentIdForUser(selectedAgentId, agents, user),
    [agents, selectedAgentId, user],
  );

  const metricsFilters = useMemo(
    () => ({
      range: selectedRange,
      agentId: effectiveAgentId,
    }),
    [selectedRange, effectiveAgentId],
  );

  const metricsEnabled = !requiresRestriction || Boolean(effectiveAgentId);

  const {
    data: metrics,
    isLoading: isMetricsLoading,
    isFetching: isMetricsFetching,
    isError: isMetricsError,
    error: metricsError,
  } = useElevenLabsMetrics(metricsFilters, { enabled: metricsEnabled });

  const agentOptions = useMemo(
    () =>
      accessibleAgents.map((agent) => ({
        id: agent.id,
        name: agent.name,
      })),
    [accessibleAgents],
  );

  const noAccessibleAgents =
    requiresRestriction && !isAgentsLoading && !isAgentsError && accessibleAgents.length === 0;

  const agentSelectValue = requiresRestriction
    ? accessibleAgents.some((agent) => agent.id === selectedAgentId)
      ? selectedAgentId
      : accessibleAgents[0]?.id ?? ""
    : selectedAgentId;

  const agentSelectPlaceholder = isAgentsLoading
    ? "Loading agents..."
    : requiresRestriction
      ? noAccessibleAgents
        ? "No agents available"
        : "Select agent"
      : "All agents";

  const metricsFallbackDisplay = metricsEnabled
    ? undefined
    : noAccessibleAgents
      ? "N/A"
      : "...";

  const metricsUnavailableMessage = noAccessibleAgents
    ? "You do not have access to any agents. Contact an administrator."
    : "We couldn't determine your agent access. Try refreshing the page.";

  const isMetricsPending = metricsEnabled && (isMetricsLoading || isMetricsFetching);

  const totalCallsDisplay = metrics
    ? metrics.totalCalls.toLocaleString()
    : isMetricsPending
      ? "..."
      : metricsFallbackDisplay ?? "0";

  const averageDurationDisplay = metrics
    ? formatDuration(metrics.averageDurationSeconds)
    : isMetricsPending
      ? "..."
      : metricsFallbackDisplay ?? "0:00";

  const successRateDisplay = metrics
    ? formatPercentage(metrics.successRate)
    : isMetricsPending
      ? "..."
      : metricsFallbackDisplay ?? "0%";

  const callsChartData = metricsEnabled ? metrics?.callsByDay ?? [] : [];
  const successChartData = metricsEnabled ? metrics?.successTimeline ?? [] : [];

  const metricsErrorMessage =
    metricsError instanceof Error
      ? metricsError.message
      : "Unable to load ElevenLabs metrics.";

  const renderLoadingState = () => (
    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Loading data...
    </div>
  );

  const renderNoDataState = (message: string) => (
    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6 max-w-[1600px]">
        {/* Header and Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">My Workspace</p>
            <h1 className="text-3xl font-bold text-foreground">{greeting}</h1>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            <Select
              value={agentSelectValue}
              onValueChange={setSelectedAgentId}
              disabled={isAgentsLoading || isAgentsError || noAccessibleAgents}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={agentSelectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {!requiresRestriction ? <SelectItem value="all">All agents</SelectItem> : null}
                {isAgentsError && (
                  <SelectItem value="__agents_error" disabled>
                    Unable to load agents
                  </SelectItem>
                )}
                {agentOptions.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedRange}
              onValueChange={(value) => setSelectedRange(value as MetricsRange)}
              disabled={noAccessibleAgents}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {rangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isMetricsFetching && !isMetricsLoading && (
              <span className="flex items-center text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Syncing latest metrics…
              </span>
            )}
          </div>
        </div>

        {/* Metrics Error Alert */}
          {isMetricsError && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>ElevenLabs API Error</AlertTitle>
              <AlertDescription>
                {metricsErrorMessage}
                <p className="mt-2 text-sm text-muted-foreground">
                  Make sure <code>VITE_ELEVENLABS_API_KEY</code> is configured and that your
                  ElevenLabs workspace has Conversational AI API access. You can tune
                  <code className="mx-1">VITE_ELEVENLABS_CONVERSATION_PAGES</code> if you need to limit
                  the number of pages retrieved.
                </p>
              </AlertDescription>
            </Alert>
          )}

        {noAccessibleAgents ? (
          <Alert>
            <AlertTitle>Limited access</AlertTitle>
            <AlertDescription>
              You do not have access to any agents. Contact an administrator if you believe this is
              an error.
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Number of calls</p>
                <p className="text-3xl font-bold text-foreground">{totalCallsDisplay}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Average duration</p>
                <p className="text-3xl font-bold text-foreground">{averageDurationDisplay}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Overall success rate</p>
                <p className="text-3xl font-bold text-foreground">{successRateDisplay}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calls Chart */}
        <Card className="border-border bg-card p-6">
          {!metricsEnabled ? (
            renderNoDataState(metricsUnavailableMessage)
          ) : isMetricsPending ? (
            renderLoadingState()
          ) : callsChartData.length === 0 ? (
            renderNoDataState("No call activity recorded for this period.")
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={callsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Success Rate Chart */}
        <Card className="border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Overall success rate</h3>
          {!metricsEnabled ? (
            renderNoDataState(metricsUnavailableMessage)
          ) : isMetricsPending ? (
            renderLoadingState()
          ) : successChartData.length === 0 ? (
            renderNoDataState("No call outcomes recorded for this period.")
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={successChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="success"
                  stackId="1"
                  stroke="#4ade80"
                  fill="#4ade80"
                  name="Success"
                />
                <Area
                  type="monotone"
                  dataKey="fail"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#ef4444"
                  name="Fail"
                />
                <Area
                  type="monotone"
                  dataKey="unknown"
                  stackId="1"
                  stroke="#facc15"
                  fill="#facc15"
                  name="Unknown"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {!requiresRestriction && (
          <>
            {/* Bottom Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="border-border bg-card lg:col-span-2">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Most called agents</h3>
                    <Button variant="ghost" size="sm">
                      See all 14 agents
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent name</TableHead>
                        <TableHead className="text-right">Number of calls</TableHead>
                        <TableHead className="text-right">Call minutes</TableHead>
                        <TableHead className="text-right">LLM cost</TableHead>
                        <TableHead className="text-right">Credits spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentsData.map((agent) => (
                        <TableRow key={agent.name} className="hover:bg-muted/40">
                          <TableCell className="font-medium text-foreground">{agent.name}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {agent.calls.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{agent.minutes}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{agent.llmCost}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{agent.credits}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <h3 className="mb-6 text-lg font-semibold text-foreground">Language</h3>
                  <div className="space-y-4">
                    {languageData.map((item) => (
                      <div key={item.language} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-foreground">{item.language}</span>
                          <span className="text-sm font-semibold text-foreground">{item.percentage}%</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default Index;
