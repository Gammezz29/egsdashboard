import { useEffect, useMemo, useState } from "react";
import { HistoryCard } from "@/components/HistoryCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import {
  useElevenLabsAgents,
  useElevenLabsCallAudio,
  useElevenLabsCallDetails,
  useElevenLabsCallHistory,
  useDeleteElevenLabsCall,
} from "@/hooks/useElevenLabsMetrics";
import { fetchElevenLabsConversationDetails } from "@/lib/elevenLabs";
import { useAuth } from "@/hooks/useAuth";
import {
  ensureAgentIdForUser,
  filterAgentsForUser,
  isAgentAccessRestricted,
  isAgentNameAllowedForUser,
} from "@/lib/accessControl";
import type { ElevenLabsCall, ElevenLabsCallStatus, MetricsRange } from "@/lib/elevenLabs";
import { fetchElevenLabsConversationAudio } from "@/lib/elevenLabs";
import { useToast } from "@/hooks/use-toast";

type CallDetailsTab = "overview" | "audio" | "transcript";

const rangeOptions: { label: string; value: MetricsRange }[] = [
  { label: "Last 7 Days", value: "LAST_7_DAYS" },
  { label: "Last 30 Days", value: "LAST_30_DAYS" },
  { label: "All Time", value: "ALL_TIME" },
];

const statusDisplayMap: Record<
  ElevenLabsCallStatus,
  {
    label: string;
    className: string;
  }
> = {
  success: {
    label: "Completed",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  fail: {
    label: "Failed",
    className: "border-red-500/30 bg-red-500/10 text-red-400",
  },
  unknown: {
    label: "Unknown",
    className: "border-muted bg-muted text-muted-foreground",
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const formatDisplayDate = (isoDate?: string | null) => {
  if (!isoDate) {
    return null;
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return dateTimeFormatter.format(parsed);
};

const getMetadataSearchText = (call: ElevenLabsCall): string => {
  if (typeof call.metadataSearchText === "string" && call.metadataSearchText.length > 0) {
    return call.metadataSearchText;
  }

  if (!call.metadata) {
    return "";
  }

  try {
    return JSON.stringify(call.metadata).toLowerCase();
  } catch {
    return "";
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const CLIENT_DATA_KEY_SET = new Set([
  "clientdata",
  "client_data",
  "client",
  "vars",
  "variables",
  "dynamicvariables",
  "dynamicvars",
  "dynamic_variables",
  "customvariables",
  "customvars",
  "callvars",
  "inputs",
]);

const normaliseKeyIdentifier = (key: string) =>
  key.replace(/[\s_-]/g, "").toLowerCase();

const matchesClientDataKey = (key: string) => {
  const normalised = normaliseKeyIdentifier(key);
  if (CLIENT_DATA_KEY_SET.has(normalised)) {
    return true;
  }

  return normalised.includes("client") || normalised.includes("var");
};

const isPrimitiveValue = (value: unknown): value is string | number | boolean =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean";

const KEY_FIELD_CANDIDATES = ["key", "name", "field", "variable", "label", "id"];
const VALUE_FIELD_CANDIDATES = ["value", "val", "data", "text", "content", "answer"];

const normaliseKeyValueRecord = (
  record: Record<string, unknown>,
  addPair: (key: string, value: unknown) => void,
) => {
  let identifiedKey: string | undefined;

  for (const candidate of KEY_FIELD_CANDIDATES) {
    const rawKey = record[candidate];
    if (typeof rawKey === "string" && rawKey.trim().length > 0) {
      identifiedKey = rawKey.trim();
      break;
    }
  }

  if (!identifiedKey) {
    return;
  }

  for (const candidate of VALUE_FIELD_CANDIDATES) {
    if (candidate in record) {
      const rawValue = record[candidate];
      if (isPrimitiveValue(rawValue)) {
        addPair(identifiedKey, rawValue);
        return;
      }
    }
  }

  const valuesCandidate = record.values;
  if (Array.isArray(valuesCandidate) && valuesCandidate.length === 1) {
    const [first] = valuesCandidate;
    if (isPrimitiveValue(first)) {
      addPair(identifiedKey, first);
    }
  }
};

const extractClientData = (
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | null => {
  if (!metadata) {
    return null;
  }

  const result = new Map<string, unknown>();

  const addPair = (key: string, value: unknown) => {
    if (typeof key !== "string") {
      return;
    }

    const trimmedKey = key.trim();
    if (!trimmedKey || !isPrimitiveValue(value)) {
      return;
    }

    if (!result.has(trimmedKey)) {
      result.set(trimmedKey, value);
    }
  };

  const visit = (
    value: unknown,
    includeDirectChildren: boolean,
    currentKey?: string,
  ) => {
    if (value == null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (isPrimitiveValue(entry) && includeDirectChildren) {
          if (currentKey) {
            addPair(currentKey, entry);
          }
          return;
        }

        visit(entry, includeDirectChildren, currentKey);
      });
      return;
    }

    if (isRecord(value)) {
      normaliseKeyValueRecord(value, addPair);

      if (includeDirectChildren) {
        Object.entries(value).forEach(([entryKey, entryValue]) => {
          if (isPrimitiveValue(entryValue)) {
            addPair(entryKey, entryValue);
          }
        });
      }

      Object.entries(value).forEach(([entryKey, entryValue]) => {
        const shouldInclude = includeDirectChildren || matchesClientDataKey(entryKey);
        visit(entryValue, shouldInclude, entryKey);
      });

      return;
    }

    if (includeDirectChildren && isPrimitiveValue(value) && currentKey) {
      addPair(currentKey, value);
    }
  };

  visit(metadata, false);

  if (result.size === 0) {
    Object.entries(metadata).forEach(([key, value]) => {
      if (isPrimitiveValue(value)) {
        addPair(key, value);
      }
    });
  }

  if (result.size === 0) {
    return null;
  }

  return Object.fromEntries(result.entries());
};

const CallDetailsDialog = ({
  call,
  open,
  initialTab,
  onOpenChange,
  onTabChange,
  onDownload,
  isDownloading,
}: {
  call: ElevenLabsCall | null;
  open: boolean;
  initialTab: CallDetailsTab;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: CallDetailsTab) => void;
  onDownload: (call: ElevenLabsCall) => void;
  isDownloading: boolean;
}) => {
  const [activeTab, setActiveTab] = useState<CallDetailsTab>("overview");

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  const detailsQuery = useElevenLabsCallDetails(call?.id ?? null, open);
  const details = detailsQuery.data;

  const shouldFetchAudio =
    open && activeTab === "audio" && Boolean(details?.hasAudio) && Boolean(call?.id);

  const audioQuery = useElevenLabsCallAudio(call?.id ?? null, shouldFetchAudio);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (audioQuery.data) {
      const url = URL.createObjectURL(audioQuery.data);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setAudioUrl(null);
      };
    }

    return undefined;
  }, [audioQuery.data]);

  useEffect(() => {
    if (!shouldFetchAudio) {
      setAudioUrl(null);
    }
  }, [shouldFetchAudio]);

  const statusMeta =
    details?.status && statusDisplayMap[details.status]
      ? statusDisplayMap[details.status]
      : call
        ? statusDisplayMap[call.status]
        : statusDisplayMap.unknown;

  const startedDisplay = details?.startedAt ?? call?.startedAt;
  const startedLabel = formatDisplayDate(startedDisplay);
  const durationLabel = formatDuration(details?.durationSeconds ?? call?.durationSeconds ?? 0);
  const statusLabel = details?.statusLabel ?? statusMeta.label;
  const accountNumber = details?.accountNumber ?? call?.accountNumber ?? null;
  const clientData = extractClientData(details?.metadata);

  const handleTabChange = (value: string) => {
    const tab = value as CallDetailsTab;
    setActiveTab(tab);
    onTabChange(tab);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{details?.agentName ?? call?.agentName ?? "Call details"}</DialogTitle>
          <DialogDescription>Review recording insights, transcript, and client data (dynamic variables).</DialogDescription>
        </DialogHeader>

        {detailsQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm">Loading call details…</p>
          </div>
        ) : detailsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load call details</AlertTitle>
            <AlertDescription>
              {(detailsQuery.error as Error)?.message ?? "Please try again in a moment."}
            </AlertDescription>
          </Alert>
        ) : details ? (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className={statusMeta.className}>
                  {statusMeta.label}
                </Badge>
                <span className="text-sm text-muted-foreground">{statusLabel}</span>
              </div>

              <div className="grid gap-4 rounded-lg border border-border/60 bg-muted/10 p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Started</p>
                  <p className="text-sm text-foreground">{startedLabel ?? "Not available"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Duration</p>
                  <p className="text-sm text-foreground">{durationLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                  <p className="text-sm text-foreground capitalize">{details.status}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Call ID</p>
                  <p className="text-sm font-mono text-foreground">{details.id}</p>
                </div>
                {accountNumber ? (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Account #
                    </p>
                    <p className="text-sm font-mono text-foreground">{accountNumber}</p>
                  </div>
                ) : null}
              </div>

              {clientData ? (
                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-4">
                  <p className="text-sm font-semibold text-foreground">Client data (dynamic variables)</p>
                  <ScrollArea className="h-32 rounded border border-border/50 bg-background p-3">
                    <pre className="text-xs leading-relaxed text-muted-foreground">
                      {JSON.stringify(clientData, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="audio" className="space-y-4">
              {details.hasAudio ? (
                <>
                  {audioQuery.isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <p className="text-sm">Fetching audio…</p>
                    </div>
                  ) : audioUrl ? (
                    <audio controls src={audioUrl} className="w-full rounded-lg" />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Audio is available. Switch to this tab to load the recording.
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      High fidelity playback may take a moment to buffer.
                    </p>
                    {call ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onDownload(call)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Preparing…
                          </>
                        ) : (
                          "Download audio"
                        )}
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    This call does not have an audio recording available.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transcript" className="space-y-4">
              {details.transcript.length > 0 ? (
                <ScrollArea className="h-96 rounded-lg border border-border/60 bg-muted/10 p-4">
                  <div className="space-y-4">
                    {details.transcript.map((entry, index) => (
                      <div key={`${entry.role}-${index}`} className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {entry.role}
                          {entry.timestamp ? ` | ${entry.timestamp}` : ""}
                        </p>
                        <p className="rounded-lg bg-background/60 p-3 text-sm text-foreground">
                          {entry.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No transcript was provided for this call.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const History = () => {
  const { user } = useAuth();
  const requiresRestriction = isAgentAccessRestricted(user);

  const [selectedRange, setSelectedRange] = useState<MetricsRange>("ALL_TIME");
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    requiresRestriction ? "" : "all",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCall, setSelectedCall] = useState<ElevenLabsCall | null>(null);
  const [detailTab, setDetailTab] = useState<CallDetailsTab>("overview");
  const [deleteTarget, setDeleteTarget] = useState<ElevenLabsCall | null>(null);
  const [downloadingCallId, setDownloadingCallId] = useState<string | null>(null);

  const { toast } = useToast();

  const {
    data: agents,
    isLoading: isAgentsLoading,
    isError: isAgentsError,
  } = useElevenLabsAgents();

  const accessibleAgents = useMemo(
    () => filterAgentsForUser(agents, user),
    [agents, user],
  );

  const noAccessibleAgents =
    requiresRestriction && !isAgentsLoading && !isAgentsError && accessibleAgents.length === 0;

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

  const filters = useMemo(
    () => ({
      range: selectedRange,
      agentId: effectiveAgentId,
    }),
    [selectedRange, effectiveAgentId],
  );

  const historyEnabled = !requiresRestriction || Boolean(effectiveAgentId);

  const historyQuery = useElevenLabsCallHistory(filters, { enabled: historyEnabled });

  const agentOptions = useMemo(
    () =>
      accessibleAgents.map((agent) => ({
        id: agent.id,
        name: agent.name,
      })),
    [accessibleAgents],
  );

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

  const allCalls = useMemo(() => {
    if (!historyQuery.data) {
      return [] as ElevenLabsCall[];
    }

    const deduped = new Map<string, ElevenLabsCall>();
    historyQuery.data.pages.forEach((page) => {
      page.items.forEach((call) => {
        deduped.set(call.id, call);
      });
    });

    const list = Array.from(deduped.values());

    list.sort((a, b) => {
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return bTime - aTime;
    });

    if (requiresRestriction) {
      return list.filter((call) => isAgentNameAllowedForUser(call.agentName ?? "", user));
    }

    return list;
  }, [historyQuery.data, requiresRestriction, user]);

  const searchValue = searchTerm.trim().toLowerCase();

  // State to store fetched account numbers
  const [accountNumbers, setAccountNumbers] = useState<Record<string, string>>({});

  // Fetch account numbers for visible calls in the background
  useEffect(() => {
    if (allCalls.length === 0) return;

    const fetchAccountNumbers = async () => {
      console.log('[History] Starting to fetch account numbers for', allCalls.length, 'calls');

      // Fetch in batches of 5 at a time
      const batchSize = 5;
      for (let i = 0; i < Math.min(allCalls.length, 50); i += batchSize) {
        const batch = allCalls.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(async (call) => {
            try {
              // Use the SAME function that works in the overview tab
              const details = await fetchElevenLabsConversationDetails(call.id);
              console.log('[History] Fetched details for call:', call.id.substring(0, 20), 'Account:', details.accountNumber);
              return { callId: call.id, accountNumber: details.accountNumber };
            } catch (error) {
              console.error('[History] Failed to fetch details for call:', call.id.substring(0, 20), error);
              return null;
            }
          })
        );

        // Update state with found account numbers
        const newAccountNumbers: Record<string, string> = {};
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value?.accountNumber) {
            newAccountNumbers[result.value.callId] = result.value.accountNumber;
          }
        });

        if (Object.keys(newAccountNumbers).length > 0) {
          console.log('[History] Adding', Object.keys(newAccountNumbers).length, 'account numbers to state');
          setAccountNumbers(prev => {
            const updated = { ...prev, ...newAccountNumbers };
            console.log('[History] State now has', Object.keys(updated).length, 'account numbers');
            return updated;
          });
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log('[History] Finished fetching account numbers');
    };

    fetchAccountNumbers();
  }, [allCalls]);

  const visibleCalls = useMemo(() => {
    // Merge account numbers from state into calls
    const enrichedCalls = allCalls.map(call => ({
      ...call,
      accountNumber: accountNumbers[call.id] || call.accountNumber
    }));

    console.log('[History] Account numbers state has', Object.keys(accountNumbers).length, 'entries');
    console.log('[History] First enriched call:', enrichedCalls[0] ? {
      id: enrichedCalls[0].id.substring(0, 20),
      accountNumber: enrichedCalls[0].accountNumber
    } : 'no calls');

    if (!searchValue) {
      return enrichedCalls;
    }

    return enrichedCalls.filter((call) => {
      const agentName = (call.agentName ?? "").toLowerCase();
      const agentId = call.agentId?.toLowerCase() ?? "";
      const callId = call.id.toLowerCase();
      const accountNumber = (call.accountNumber ?? "").toLowerCase();
      const metadataText = getMetadataSearchText(call);

      return (
        agentName.includes(searchValue) ||
        agentId.includes(searchValue) ||
        callId.includes(searchValue) ||
        accountNumber.includes(searchValue) ||
        (metadataText !== "" && metadataText.includes(searchValue))
      );
    });
  }, [allCalls, searchValue, accountNumbers]);

  const totalLoaded = allCalls.length;
  const isInitialLoading = historyEnabled ? historyQuery.status === "pending" : false;
  const historyError = historyEnabled ? (historyQuery.error as Error | null) : null;
  const hasMore = historyEnabled ? historyQuery.hasNextPage ?? false : false;
  const isFetchingMore = historyEnabled ? historyQuery.isFetchingNextPage : false;

  const historyUnavailableMessage = noAccessibleAgents
    ? "You do not have access to any agents. Contact an administrator."
    : "We couldn't determine your agent access. Try refreshing the page.";

  const handleOpenDetails = (call: ElevenLabsCall, tab: CallDetailsTab) => {
    setSelectedCall(call);
    setDetailTab(tab);
  };

  const handleDownload = async (call: ElevenLabsCall) => {
    try {
      setDownloadingCallId(call.id);
      const blob = await fetchElevenLabsConversationAudio(call.id);

      if (!blob || blob.size === 0) {
        throw new Error("Audio file is not available for this call.");
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `elevenlabs-call-${call.id}.mp3`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast({
        title: "Download started",
        description: "The audio file is downloading in the background.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to download the audio file.";
      toast({
        title: "Download failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDownloadingCallId(null);
    }
  };

  const deleteMutation = useDeleteElevenLabsCall();

  const handleConfirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({
          title: "Call deleted",
          description: "The conversation was removed successfully.",
        });

        if (selectedCall?.id === deleteTarget.id) {
          setSelectedCall(null);
        }

        setDeleteTarget(null);
      },
      onError: (error) => {
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Try again later.",
          variant: "destructive",
        });
      },
    });
  };

  const isDeletingCall = (callId: string) =>
    deleteMutation.isPending && deleteTarget?.id === callId;

  const isDownloadingCall = (callId: string) => downloadingCallId === callId;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl space-y-8 p-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">History</h1>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <Select
              value={selectedRange}
              onValueChange={(value) => setSelectedRange(value as MetricsRange)}
              disabled={noAccessibleAgents}
            >
              <SelectTrigger className="w-[180px]">
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

            <Select
              value={agentSelectValue}
              onValueChange={setSelectedAgentId}
              disabled={isAgentsLoading || isAgentsError || noAccessibleAgents}
            >
              <SelectTrigger className="w-[220px]">
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
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by agent, call, or account number…"
              className="w-full pl-10"
            />
          </div>
        </div>

        {!isInitialLoading && !historyError ? (
          <p className="text-sm text-muted-foreground">
            Showing {visibleCalls.length.toLocaleString()} of{" "}
            {totalLoaded.toLocaleString()} loaded calls
            {hasMore ? ". Load more to fetch additional records." : "."}
          </p>
        ) : null}

        {historyError ? (
          <Alert variant="destructive">
            <AlertTitle>We couldn&apos;t load your call history</AlertTitle>
            <AlertDescription>
              {historyError.message || "Check your connection and try again."}
            </AlertDescription>
          </Alert>
        ) : null}

        {noAccessibleAgents ? (
          <Alert>
            <AlertTitle>Limited access</AlertTitle>
            <AlertDescription>
              You do not have access to any agents. Contact an administrator if you believe this is
              an error.
            </AlertDescription>
          </Alert>
        ) : null}

        {historyEnabled ? (
          isInitialLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 p-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Gathering your latest ElevenLabs calls.
              </p>
            </div>
          ) : visibleCalls.length > 0 ? (
            <div className="space-y-3">
              {visibleCalls.map((call) => (
                <HistoryCard
                  key={call.id}
                  call={call}
                  onPlay={() => handleOpenDetails(call, "audio")}
                  onDownload={handleDownload}
                  onTranscript={() => handleOpenDetails(call, "transcript")}
                  onDelete={() => setDeleteTarget(call)}
                  isDownloading={isDownloadingCall(call.id)}
                  isDeleting={isDeletingCall(call.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-12 text-center">
              <h3 className="mb-2 text-lg font-semibold text-foreground">No calls match these filters</h3>
              <p className="text-sm text-muted-foreground">
                Adjust the date range, agent filter, or search term to explore other conversations.
              </p>
            </div>
          )
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 p-12 text-center">
            <h3 className="mb-2 text-lg font-semibold text-foreground">Access required</h3>
            <p className="text-sm text-muted-foreground">{historyUnavailableMessage}</p>
          </div>
        )}

        {hasMore ? (
          <div className="flex justify-center border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => historyQuery.fetchNextPage()}
              disabled={isFetchingMore}
            >
              {isFetchingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        ) : null}
      </div>

      <CallDetailsDialog
        call={selectedCall}
        open={Boolean(selectedCall)}
        initialTab={detailTab}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedCall(null);
          }
        }}
        onTabChange={setDetailTab}
        onDownload={handleDownload}
        isDownloading={Boolean(selectedCall && isDownloadingCall(selectedCall.id))}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this call?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The conversation will be permanently removed from your ElevenLabs history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default History;


