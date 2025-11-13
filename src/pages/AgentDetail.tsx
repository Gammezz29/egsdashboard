import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useElevenLabsAgents } from "@/hooks/useElevenLabsMetrics";
import { useAuth } from "@/hooks/useAuth";
import { filterAgentsForUser, isAgentAccessRestricted } from "@/lib/accessControl";
import { useSupabaseTable } from "@/hooks/useSupabaseTable";
import {
  exportSupabaseTableCsv,
  importSupabaseRows,
  isSupabaseConfigured,
  parseCsvContent,
  deleteSupabaseTableRows,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Database,
  Download,
  Loader2,
  PhoneCall,
  RefreshCw,
  Clock,
  Upload,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startElevenLabsCall,
  type ElevenLabsCallRequest,
} from "@/lib/elevenLabs";

type SupabaseRow = Record<string, unknown>;

const MARYS_NO_SHOW_TABLE = "marys_no_show";
const MARYS_NO_SHOW_DISPLAY_NAME = "Marys No show";

const getRowValue = (row: SupabaseRow, key: string): string => {
  const value = row?.[key];
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return String(value).trim();
};

const normalisePhoneForPayload = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const digitsOnly = trimmed.replace(/[^\d+]/g, "");
  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.startsWith("+")) {
    const cleaned = digitsOnly.slice(1).replace(/\D/g, "");
    return cleaned ? `+${cleaned}` : "";
  }

  return digitsOnly.replace(/\D/g, "");
};

const normalisePhoneForComparison = (value: string): string =>
  normalisePhoneForPayload(value).replace(/^\+/, "");

const determineLanguageCode = (value: string): string => {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return "en";
  }

  if (trimmed.startsWith("es")) {
    return "es";
  }

  if (trimmed.startsWith("en")) {
    return "en";
  }

  if (trimmed.startsWith("fr")) {
    return "fr";
  }

  if (trimmed.startsWith("pt")) {
    return "pt";
  }

  if (trimmed.length >= 2) {
    return trimmed.slice(0, 2);
  }

  return "en";
};

const formatContactLabel = (row: SupabaseRow): string => {
  const first = getRowValue(row, "first_name");
  const last = getRowValue(row, "last_name");
  const name = [first, last].filter(Boolean).join(" ").trim();

  if (name) {
    return name;
  }

  const encounter = getRowValue(row, "encounter_id");
  if (encounter) {
    return `Encounter ${encounter}`;
  }

  const phone = getRowValue(row, "primary_phone");
  if (phone) {
    return phone;
  }

  return "Contact";
};

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const SchedulerStatusBadge = ({ status }: { status: "idle" | "running" | "paused" }) => {
  if (status === "running") {
    return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/40">Running</Badge>;
  }

  if (status === "paused") {
    return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/40">Paused</Badge>;
  }

  return <Badge variant="outline">Idle</Badge>;
};

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const requiresRestriction = isAgentAccessRestricted(user);

  const {
    data: agents,
    isLoading: isAgentsLoading,
    isError: isAgentsError,
    refetch,
  } = useElevenLabsAgents();

  const accessibleAgents = useMemo(
    () => filterAgentsForUser(agents, user),
    [agents, user],
  );

  const agent = useMemo(
    () => accessibleAgents.find((item) => item.id === id) ?? null,
    [accessibleAgents, id],
  );

  useEffect(() => {
    if (!requiresRestriction) {
      return;
    }

    if (isAgentsLoading) {
      return;
    }

    if (accessibleAgents.length === 0) {
      return;
    }

    if (!agent) {
      navigate("/agents", { replace: true });
    }
  }, [accessibleAgents, agent, isAgentsLoading, navigate, requiresRestriction]);

  const supabaseReady = isSupabaseConfigured();
  const isMarysNoShow =
    (agent?.name ?? "").trim().toLowerCase() === "marys no show";

  const marysTableQuery = useSupabaseTable(
    MARYS_NO_SHOW_TABLE,
    Boolean(isMarysNoShow && supabaseReady),
  );

  const tableColumns = useMemo(() => {
    if (!marysTableQuery.data || marysTableQuery.data.length === 0) {
      return [] as string[];
    }

    const priorityColumns = [
      "encounter_id",
      "first_name",
      "last_name",
      "primary_phone",
      "account_number",
      "call_status",
    ];

    const columnSet = new Set<string>();
    marysTableQuery.data.forEach((row) => {
      Object.keys(row).forEach((key) => columnSet.add(key));
    });

    const remainingColumns = Array.from(columnSet.values()).filter(
      (column) => !priorityColumns.includes(column),
    );

    remainingColumns.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );

    return [...priorityColumns.filter((column) => columnSet.has(column)), ...remainingColumns];
  }, [marysTableQuery.data]);

  const marysRecordCount = marysTableQuery.data?.length ?? 0;
  const hasMarysRows = marysRecordCount > 0;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [isDeletingTable, setIsDeletingTable] = useState(false);

  const [batchMode, setBatchMode] = useState(false);
  const [encounterId, setEncounterId] = useState("");
  const [isSubmittingManualCall, setIsSubmittingManualCall] = useState(false);
  const [callsPerBatchInput, setCallsPerBatchInput] = useState("10");
  const [minutesBetweenBatchesInput, setMinutesBetweenBatchesInput] = useState("15");
  const [schedulerStatus, setSchedulerStatus] = useState<"idle" | "running" | "paused">("idle");
  const [pendingContacts, setPendingContacts] = useState(0);
  const [schedulerLogs, setSchedulerLogs] = useState<string[]>([]);
  const [isStartingSchedule, setIsStartingSchedule] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(true);
  const deleteConfirmationMatches = deleteConfirmationInput.trim().toLowerCase() === "delete";
  const schedulerQueueRef = useRef<SupabaseRow[]>([]);
  const schedulerTimerRef = useRef<number | null>(null);
  const schedulerStatusRef = useRef<"idle" | "running" | "paused">(schedulerStatus);

  const appendSchedulerLog = useCallback((message: string) => {
    setSchedulerLogs((prev) => [
      `${new Date().toLocaleString()} — ${message}`,
      ...prev,
    ]);
  }, []);

  const clearSchedulerTimer = useCallback(() => {
    if (schedulerTimerRef.current != null) {
      window.clearTimeout(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
  }, []);

  const updateSchedulerQueue = useCallback((next: SupabaseRow[]) => {
    schedulerQueueRef.current = next;
    setPendingContacts(next.length);
  }, []);

  useEffect(() => {
    schedulerStatusRef.current = schedulerStatus;
  }, [schedulerStatus]);

  useEffect(
    () => () => {
      clearSchedulerTimer();
    },
    [clearSchedulerTimer],
  );

  const buildCallPayload = useCallback(
    (row: SupabaseRow, overridePhone?: string): ElevenLabsCallRequest | null => {
      const storedPrimaryPhone = getRowValue(row, "primary_phone");
      const overrideTrimmed = overridePhone?.trim() ?? "";
      const rawPhone = overrideTrimmed || storedPrimaryPhone;
      const normalisedPhone = normalisePhoneForPayload(rawPhone);
      if (!normalisedPhone) {
        return null;
      }

      const vars: Record<string, string> = {};

      Object.keys(row).forEach((key) => {
        vars[key] = getRowValue(row, key);
      });

      const requiredColumns = [
        "account_number",
        "encounter_id",
        "first_name",
        "last_name",
        "encounter_date",
        "check_in",
        "visit_type",
        "dob",
        "marys_center_sites",
        "provider_name",
        "reason",
        "preferred_language",
        "primary_phone",
        "mobile_phone",
        "status",
      ];

      requiredColumns.forEach((column) => {
        if (!(column in vars)) {
          vars[column] = getRowValue(row, column);
        }
      });

      if (overrideTrimmed) {
        vars.primary_phone = overrideTrimmed;
      } else if (!vars.primary_phone && storedPrimaryPhone) {
        vars.primary_phone = storedPrimaryPhone;
      } else if (!vars.primary_phone) {
        vars.primary_phone = normalisedPhone;
      }

      if (!vars.mobile_phone && overrideTrimmed) {
        vars.mobile_phone = overrideTrimmed;
      }

      const preferredLanguage = getRowValue(row, "preferred_language");
      const lang = determineLanguageCode(preferredLanguage);

      return {
        to: normalisedPhone,
        lang,
        vars,
      };
    },
    [],
  );

  const sendCallForRow = useCallback(
    async (row: SupabaseRow, overridePhone?: string) => {
      const payload = buildCallPayload(row, overridePhone);
      if (!payload) {
        throw new Error("Contact is missing a valid phone number.");
      }

      const response = await startElevenLabsCall(payload);
      const callId =
        response && typeof response === "object" && "call_id" in response && response.call_id != null
          ? String(response.call_id)
          : undefined;

      return { payload, callId };
    },
    [buildCallPayload],
  );

  const findRowByEncounter = useCallback(
    (encounter: string): SupabaseRow | null => {
      const data = marysTableQuery.data ?? [];
      const trimmedEncounter = encounter.trim();
      if (!trimmedEncounter) {
        return null;
      }

      const normalisedEncounter = trimmedEncounter.toLowerCase();
      return (
        data.find((row) => {
          const rowEncounter = getRowValue(row, "encounter_id");
          if (
            rowEncounter &&
            rowEncounter.trim().toLowerCase() === normalisedEncounter
          ) {
            return true;
          }

          return false;
        }) ?? null
      );
    },
    [marysTableQuery.data],
  );

  const processSchedulerBatch = useCallback(
    async (batchSize: number, intervalMinutes: number) => {
      if (schedulerStatusRef.current !== "running") {
        return;
      }

      const queue = schedulerQueueRef.current;
      if (queue.length === 0) {
        appendSchedulerLog("No pending contacts left for the scheduler.");
        updateSchedulerQueue([]);
        schedulerStatusRef.current = "idle";
        setSchedulerStatus("idle");
        clearSchedulerTimer();
        return;
      }

      const effectiveBatchSize = Math.max(1, Math.round(batchSize));
      const batch = queue.slice(0, effectiveBatchSize);
      const remaining = queue.slice(batch.length);
      updateSchedulerQueue(remaining);

      const results = await Promise.allSettled(
        batch.map((row) => sendCallForRow(row)),
      );

      results.forEach((result, index) => {
        const label = formatContactLabel(batch[index]);
        if (result.status === "fulfilled") {
          const callId = result.value.callId;
          appendSchedulerLog(
            `Call queued for ${label}${callId ? ` (ID: ${callId})` : ""}.`,
          );
        } else {
          const reason =
            result.reason instanceof Error ? result.reason.message : String(result.reason);
          appendSchedulerLog(`Failed to queue call for ${label}: ${reason}`);
        }
      });

      if (remaining.length === 0) {
        appendSchedulerLog("Scheduler completed all pending contacts.");
        schedulerStatusRef.current = "idle";
        setSchedulerStatus("idle");
        clearSchedulerTimer();
        return;
      }

      clearSchedulerTimer();
      const delayMs = Math.max(1, Math.round(intervalMinutes)) * 60 * 1000;
      schedulerTimerRef.current = window.setTimeout(() => {
        void processSchedulerBatch(batchSize, intervalMinutes);
      }, delayMs);
    },
    [appendSchedulerLog, clearSchedulerTimer, sendCallForRow, updateSchedulerQueue],
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      const content = await file.text();
      const parsed = parseCsvContent(content);

      if (parsed.length === 0) {
        throw new Error("The provided CSV file does not contain any rows.");
      }

      await importSupabaseRows(MARYS_NO_SHOW_TABLE, parsed);
      toast({
        title: "Import completed",
        description: `${parsed.length.toLocaleString()} row(s) imported into Marys no show.`,
      });
      marysTableQuery.refetch();
    } catch (error) {
      toast({
        title: "Import failed",
        description:
          error instanceof Error
            ? error.message
            : "We could not process the uploaded CSV file.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const csvContent = await exportSupabaseTableCsv(MARYS_NO_SHOW_TABLE);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `marys-no-show-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast({
        title: "Export ready",
        description: "The CSV file was generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "We could not generate the CSV file.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteTable = useCallback(async () => {
    if (!supabaseReady) {
      return;
    }

    if (!deleteConfirmationMatches) {
      return;
    }

    setIsDeletingTable(true);
    try {
      const removed = await deleteSupabaseTableRows(MARYS_NO_SHOW_TABLE, "encounter_id");
      await marysTableQuery.refetch();
      updateSchedulerQueue([]);

      if (removed > 0) {
        appendSchedulerLog(
          `${MARYS_NO_SHOW_DISPLAY_NAME} table cleared (${removed.toLocaleString()} record${
            removed === 1 ? "" : "s"
          } removed).`,
        );
      }

      toast({
        title: removed > 0 ? "Supabase table cleared" : "Table already empty",
        description:
          removed > 0
            ? `${removed.toLocaleString()} record${removed === 1 ? "" : "s"} removed from Supabase.`
            : `No records were found in ${MARYS_NO_SHOW_DISPLAY_NAME}.`,
      });

      setDeleteConfirmationInput("");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Failed to delete records",
        description:
          error instanceof Error
            ? error.message
            : "We couldn't delete the Supabase data.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingTable(false);
    }
  }, [
    appendSchedulerLog,
    deleteConfirmationMatches,
    marysTableQuery.refetch,
    supabaseReady,
    toast,
    updateSchedulerQueue,
  ]);

  const handleManualCall = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEncounter = encounterId.trim();
    if (!trimmedEncounter) {
      toast({
        title: "Encounter ID required",
        description: "Provide the encounter ID you want to call.",
        variant: "destructive",
      });
      return;
    }

    const matchedRow = findRowByEncounter(trimmedEncounter);
    if (!matchedRow) {
      toast({
        title: "Contact not found",
        description: "We couldn’t locate a matching contact in Supabase for this encounter ID.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingManualCall(true);
    try {
      const { callId } = await sendCallForRow(matchedRow);
      const label = formatContactLabel(matchedRow);

      toast({
        title: "Manual call queued",
        description: `Call queued for ${label}${callId ? ` (ID: ${callId})` : ""}.`,
      });

      appendSchedulerLog(`Manual call queued for ${label}${callId ? ` (ID: ${callId})` : ""}.`);
      setEncounterId("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Failed to queue call",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingManualCall(false);
    }
  };


  const handleStartSchedule = () => {
    const callsPerBatchValue = Number(callsPerBatchInput);
    const minutesBetweenValue = Number(minutesBetweenBatchesInput);

    if (
      !Number.isFinite(callsPerBatchValue) ||
      !Number.isFinite(minutesBetweenValue) ||
      callsPerBatchValue <= 0 ||
      minutesBetweenValue <= 0
    ) {
      toast({
        title: "Invalid configuration",
        description: "Calls per batch and minutes between batches must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    let skippedMissingPhone = 0;
    let skippedWithStatus = 0;

    const dataset =
      (marysTableQuery.data ?? []).filter((row) => {
        const hasPhone = Boolean(
          normalisePhoneForPayload(getRowValue(row, "primary_phone")),
        );
        if (!hasPhone) {
          skippedMissingPhone += 1;
          return false;
        }

        const callStatus = getRowValue(row, "call_status");
        if (callStatus) {
          skippedWithStatus += 1;
          return false;
        }

        return true;
      });

    if (dataset.length === 0) {
      const reasons: string[] = [];

      if (skippedWithStatus > 0) {
        reasons.push(
          `${skippedWithStatus.toLocaleString()} contact${skippedWithStatus === 1 ? "" : "s"} already have a call status.`,
        );
      }

      if (skippedMissingPhone > 0) {
        reasons.push(
          `${skippedMissingPhone.toLocaleString()} contact${skippedMissingPhone === 1 ? "" : "s"} are missing a valid phone number.`,
        );
      }

      toast({
        title: "No contacts available",
        duration: 2000,
      });

      if (reasons.length > 0) {
        reasons.forEach((reason) => {
          appendSchedulerLog(`Scheduler skipped queue creation: ${reason}`);
        });
      }

      return;
    }

    if (skippedWithStatus > 0) {
      appendSchedulerLog(
        `${skippedWithStatus.toLocaleString()} contact${skippedWithStatus === 1 ? "" : "s"} skipped because they already have a call status.`,
      );
    }

    if (skippedMissingPhone > 0) {
      appendSchedulerLog(
        `${skippedMissingPhone.toLocaleString()} contact${skippedMissingPhone === 1 ? "" : "s"} skipped due to missing phone numbers.`,
      );
    }

    clearSchedulerTimer();
    setIsStartingSchedule(true);

    updateSchedulerQueue(dataset);
    schedulerStatusRef.current = "running";
    setSchedulerStatus("running");
    appendSchedulerLog(
      `Scheduler started with ${dataset.length} contact(s). Batch size: ${Math.round(callsPerBatchValue)}, interval: ${Math.round(minutesBetweenValue)} minute(s).`,
    );

    toast({
      title: "Schedule activated",
      description: "Automated batches will now run in the background.",
    });

    setIsStartingSchedule(false);
    void processSchedulerBatch(callsPerBatchValue, minutesBetweenValue);
  };

  const handlePauseSchedule = () => {
    if (schedulerStatusRef.current !== "running") {
      return;
    }

    schedulerStatusRef.current = "paused";
    setSchedulerStatus("paused");
    clearSchedulerTimer();
    appendSchedulerLog("Schedule paused by the operator.");
  };

  const handleResumeSchedule = () => {
    if (schedulerStatusRef.current === "running") {
      return;
    }

    const callsPerBatchValue = Number(callsPerBatchInput);
    const minutesBetweenValue = Number(minutesBetweenBatchesInput);

    if (
      !Number.isFinite(callsPerBatchValue) ||
      !Number.isFinite(minutesBetweenValue) ||
      callsPerBatchValue <= 0 ||
      minutesBetweenValue <= 0
    ) {
      toast({
        title: "Invalid configuration",
        description: "Calls per batch and minutes between batches must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    if (schedulerQueueRef.current.length === 0) {
      appendSchedulerLog("No pending contacts remain to resume.");
      schedulerStatusRef.current = "idle";
      setSchedulerStatus("idle");
      return;
    }

    schedulerStatusRef.current = "running";
    setSchedulerStatus("running");
    appendSchedulerLog("Schedule resumed.");
    clearSchedulerTimer();
    schedulerTimerRef.current = window.setTimeout(() => {
      void processSchedulerBatch(callsPerBatchValue, minutesBetweenValue);
    }, 0);
  };

  const handleClearLogs = () => {
    setSchedulerLogs([]);
  };

  const renderLoadingState = (label: string) => (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 p-12 text-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );

  const renderErrorState = (errorMessage: string) => (
    <Alert variant="destructive" className="max-w-2xl">
      <AlertTitle>We couldn&apos;t load this agent</AlertTitle>
      <AlertDescription>
        {errorMessage}
        {" "}
        <Button
          variant="link"
          size="sm"
          className="px-1"
          onClick={() => refetch({ meta: { force: true } })}
        >
          Try again
        </Button>
        .
      </AlertDescription>
    </Alert>
  );

  if (isAgentsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-10 space-y-8">
          <Button
            variant="ghost"
            className="w-fit gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/agents")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Button>
          {renderLoadingState("Loading agent information…")}
        </div>
      </div>
    );
  }

  if (isAgentsError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-10 space-y-8">
          <Button
            variant="ghost"
            className="w-fit gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/agents")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Button>
          {renderErrorState("Please check your connection and try again.")}
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-10 space-y-10">
          <Button
            variant="ghost"
            className="w-fit gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/agents")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Button>
          <Card className="border-dashed border-border/60 bg-card/50">
            <CardContent className="py-16 text-center">
              <h2 className="text-xl font-semibold text-foreground">Agent not found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldn&apos;t locate the requested agent. Return to the list to browse available agents.
              </p>
              <Button className="mt-6" onClick={() => navigate("/agents")}>
                Back to list
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isMarysNoShow) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-10 space-y-10">
          <Button
            variant="ghost"
            className="w-fit gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/agents")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Button>
          <Card className="border-border bg-card/95 backdrop-blur-sm shadow-sm">
            <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground" />
              <div>
                <h1 className="text-3xl font-semibold text-foreground">{agent.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  This workspace is under construction. Soon you&apos;ll be able to edit and monitor this agent from here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-6 px-6 py-6 overflow-hidden box-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="ghost"
            className="w-fit gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/agents")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Button>
          <div className="space-y-1 text-right">
            <h1 className="text-3xl font-semibold text-foreground">Marys No show</h1>
            <p className="text-sm text-muted-foreground">
              Specialized tools for Marys No show operations.
            </p>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 gap-6 overflow-hidden lg:grid-cols-12">
          <Card className="lg:col-span-8 flex h-full min-h-0 flex-col border-border/80 bg-card/90 backdrop-blur shadow-sm">
            <CardHeader className="flex flex-col gap-2 border-b border-border/60 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-4 w-4 text-primary" />
                  Database
                </CardTitle>
                <CardDescription>
                  Supabase table &ldquo;{MARYS_NO_SHOW_DISPLAY_NAME}&rdquo; with CSV import and export.
                </CardDescription>
                {supabaseReady && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Records loaded: <span className="font-medium text-foreground">{marysRecordCount}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => marysTableQuery.refetch()}
                  disabled={marysTableQuery.isFetching}
                >
                  {marysTableQuery.isFetching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Refreshing
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExportCsv}
                  disabled={isExporting || !supabaseReady}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exporting
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleImportClick}
                  disabled={isImporting || !supabaseReady}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import CSV
                    </>
                  )}
                </Button>
                <AlertDialog
                  open={isDeleteDialogOpen}
                  onOpenChange={(open) => {
                    if (isDeletingTable && open) {
                      return;
                    }
                    setIsDeleteDialogOpen(open);
                    if (!open) {
                      setDeleteConfirmationInput("");
                    }
                  }}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      disabled={!supabaseReady || isDeletingTable}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Supabase data</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action removes every record from the Supabase table “{MARYS_NO_SHOW_DISPLAY_NAME}”.
                        Type <span className="font-semibold text-foreground">delete</span> to confirm.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <Label
                        htmlFor="delete-confirmation"
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Confirmation
                      </Label>
                      <Input
                        id="delete-confirmation"
                        placeholder="delete"
                        value={deleteConfirmationInput}
                        onChange={(event) => setDeleteConfirmationInput(event.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        disabled={isDeletingTable}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeletingTable}>Cancel</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteTable}
                        disabled={!deleteConfirmationMatches || isDeletingTable}
                        className="gap-2"
                      >
                        {isDeletingTable ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Deleting
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Delete data
                          </>
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleImportCsv}
                />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 min-h-0 flex-col p-6">
              {!supabaseReady ? (
                <Alert variant="destructive">
                  <AlertTitle>Supabase configuration missing</AlertTitle>
                  <AlertDescription>
                    Add <code className="font-mono">VITE_SUPABASE_URL</code> and{" "}
                    <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to your environment to enable database tools.
                  </AlertDescription>
                </Alert>
              ) : marysTableQuery.isLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm">Loading table…</span>
                </div>
              ) : marysTableQuery.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>Unable to load data</AlertTitle>
                  <AlertDescription>
                    {marysTableQuery.error instanceof Error
                      ? marysTableQuery.error.message
                      : "We couldn’t retrieve the Supabase data at this time."}
                  </AlertDescription>
                </Alert>
              ) : !hasMarysRows ? (
                <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
                  No rows found in {MARYS_NO_SHOW_DISPLAY_NAME}. Import a CSV file or add entries from Supabase.
                </div>
              ) : (
                <div className="flex flex-1 min-h-0 flex-col">
                  <div className="flex h-full min-h-0 flex-col rounded-md border border-border/60">
                    <div className="h-full overflow-x-auto">
                      <div className="h-full min-w-[960px]">
                        <div className="h-full overflow-y-auto">
                          <Table className="min-w-[960px]">
                            <TableHeader>
                              <TableRow>
                                {tableColumns.map((column) => (
                                  <TableHead key={column} className="whitespace-nowrap text-xs uppercase tracking-wide text-muted-foreground">
                                    {column.replaceAll("_", " ")}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {marysTableQuery.data!.map((row, rowIndex) => (
                                <TableRow key={`marys-row-${rowIndex}`}>
                                  {tableColumns.map((column) => (
                                    <TableCell key={`${rowIndex}-${column}`} className="align-top whitespace-nowrap text-sm">
                                      {formatCellValue(row[column])}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-4 flex h-full min-h-0 flex-col gap-6 overflow-hidden">
            <Card className="shrink-0 border-border/80 bg-card/90 backdrop-blur shadow-sm">
              <CardHeader className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsManualOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg">Manual test call</CardTitle>
                    </div>
                    <CardDescription>
                      Provide an encounter ID; we will dial the associated primary phone stored in Supabase.
                    </CardDescription>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isManualOpen ? "rotate-180" : "rotate-0",
                    )}
                  />
                </button>
              </CardHeader>
              {isManualOpen ? (
                <CardContent>
                  <form className="space-y-4" onSubmit={handleManualCall}>
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Batch mode</p>
                        <p className="text-xs text-muted-foreground">
                          Toggle if you plan to dial multiple contacts sequentially.
                        </p>
                      </div>
                      <Switch
                        checked={batchMode}
                        onCheckedChange={setBatchMode}
                        aria-label="Toggle batch mode"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-encounter">Encounter ID</Label>
                      <Input
                        id="manual-encounter"
                        placeholder="e.g. 10299658"
                        value={encounterId}
                        onChange={(event) => setEncounterId(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        We will automatically dial the primary phone associated with this encounter.
                      </p>
                    </div>

                    <Button type="submit" className="w-full gap-2" disabled={isSubmittingManualCall}>
                      {isSubmittingManualCall ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Starting
                        </>
                      ) : (
                        <>
                          <Activity className="h-4 w-4" />
                          Start manual call
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              ) : (
                <CardContent className="pt-0">
                  <div className="rounded-lg border border-dashed border-border/40 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                    Tap to configure manual calls. Current mode: We use the primary phone stored in Supabase.
                    {" "}
                    <span className="font-medium text-foreground">
                      {batchMode ? "Batch enabled" : "Single call"}
                    </span>
                    .
                  </div>
                </CardContent>
              )}
            </Card>

            <Card
              className={cn(
                "flex flex-col border-border/80 bg-card/90 backdrop-blur shadow-sm transition-all",
                isSchedulerOpen ? "" : "shrink-0",
              )}
            >
              <CardHeader className="border-b border-border/60">
                <button
                  type="button"
                  onClick={() => setIsSchedulerOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg">Automated scheduler</CardTitle>
                    </div>
                    <CardDescription>
                      Configure recurring outreach batches and monitor live progress.
                    </CardDescription>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isSchedulerOpen ? "rotate-180" : "rotate-0",
                    )}
                  />
                </button>
              </CardHeader>
              {isSchedulerOpen ? (
                <CardContent className="space-y-6 p-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="calls-per-batch">Calls per batch</Label>
                      <Input
                        id="calls-per-batch"
                        type="number"
                        min={1}
                        value={callsPerBatchInput}
                        onChange={(event) => {
                          setCallsPerBatchInput(event.target.value);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minutes-between">Minutes between batches</Label>
                      <Input
                        id="minutes-between"
                        type="number"
                        min={1}
                        value={minutesBetweenBatchesInput}
                        onChange={(event) => {
                          setMinutesBetweenBatchesInput(event.target.value);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      className="gap-2"
                      onClick={handleStartSchedule}
                      disabled={isStartingSchedule}
                    >
                      {isStartingSchedule ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Starting
                        </>
                      ) : (
                        <>
                          <Activity className="h-4 w-4" />
                          Start schedule
                        </>
                      )}
                    </Button>
                    {schedulerStatus === "running" ? (
                      <Button variant="outline" size="sm" onClick={handlePauseSchedule}>
                        Pause
                      </Button>
                    ) : schedulerStatus === "paused" ? (
                      <Button variant="outline" size="sm" onClick={handleResumeSchedule}>
                        Resume
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={handleClearLogs}>
                      Clear logs
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <SchedulerStatusBadge status={schedulerStatus} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Pending contacts</span>
                      <span className="text-lg font-semibold text-foreground">
                        {pendingContacts.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Execution log</span>
                    </div>
                    <ScrollArea className="h-48 rounded-md border border-border/60 bg-muted/10 p-3">
                      {schedulerLogs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Logs will appear here as the scheduler processes contacts.
                        </p>
                      ) : (
                        <div className="space-y-2 text-xs text-muted-foreground">
                          {schedulerLogs.map((log, index) => (
                            <p key={`log-${index}`} className="leading-relaxed">
                              {log}
                            </p>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="border-t border-border/60 bg-muted/15 px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Status</span>
                      <SchedulerStatusBadge status={schedulerStatus} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Pending contacts</span>
                      <span className="font-semibold text-foreground">
                        {pendingContacts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Batch size</span>
                      <span className="font-semibold text-foreground">
                      {callsPerBatchInput.trim() === "" ? "—" : callsPerBatchInput}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Interval</span>
                      <span className="font-semibold text-foreground">
                        {minutesBetweenBatchesInput.trim() === "" ? "—" : `${minutesBetweenBatchesInput} min`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
