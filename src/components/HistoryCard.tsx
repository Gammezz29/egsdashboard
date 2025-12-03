import type { ElevenLabsCall, ElevenLabsCallStatus } from "@/lib/elevenLabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, Play, Trash2 } from "lucide-react";

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusStyles: Record<
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

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const formatRelativeTime = (date: Date) => {
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return relativeTimeFormatter.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return relativeTimeFormatter.format(diffDays, "day");
  }

  const diffWeeks = Math.round(diffDays / 7);
  if (Math.abs(diffWeeks) < 5) {
    return relativeTimeFormatter.format(diffWeeks, "week");
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return relativeTimeFormatter.format(diffMonths, "month");
  }

  const diffYears = Math.round(diffDays / 365);
  return relativeTimeFormatter.format(diffYears, "year");
};

interface HistoryCardProps {
  call: ElevenLabsCall;
  onPlay: (call: ElevenLabsCall) => void;
  onDownload: (call: ElevenLabsCall) => void;
  onTranscript: (call: ElevenLabsCall) => void;
  onDelete: (call: ElevenLabsCall) => void;
  isDownloading?: boolean;
  isDeleting?: boolean;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
}

export function HistoryCard({
  call,
  onPlay,
  onDownload,
  onTranscript,
  onDelete,
  isDownloading = false,
  isDeleting = false,
  isSelected = false,
  onSelect,
}: HistoryCardProps) {
  const { agentName, status, startedAt, durationSeconds, accountNumber } = call;

  const startedDate = startedAt ? new Date(startedAt) : null;
  const absoluteDate = startedDate ? dateTimeFormatter.format(startedDate) : "Date unavailable";
  const relativeDate = startedDate ? formatRelativeTime(startedDate) : null;

  const durationLabel = formatDuration(durationSeconds);
  const statusMeta = statusStyles[status] ?? statusStyles.unknown;

  return (
    <Card className="border-border/60 bg-card/95 backdrop-blur-sm shadow-sm transition-colors hover:border-border hover:bg-card">
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(checked as boolean)}
                className="mt-1"
              />
            )}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">{agentName}</h3>
                <Badge variant="outline" className={statusMeta.className}>
                  {statusMeta.label}
                </Badge>
                {accountNumber ? (
                  <span className="rounded-md border border-border/60 bg-muted/20 px-2 py-0.5 text-xs font-mono text-foreground">
                    {accountNumber}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{absoluteDate}</span>
                {relativeDate ? (
                  <>
                    <span>|</span>
                    <span>{relativeDate}</span>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Duration</span>
                <span>{durationLabel}</span>
              </div>
            </div>
          </div> {/* This is the missing closing tag */}

          <div className="flex items-center gap-2 md:justify-end">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={() => onPlay(call)}
              aria-label="Play call"
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={() => onDownload(call)}
              aria-label="Download audio"
              disabled={isDownloading}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              onClick={() => onTranscript(call)}
              aria-label="View transcript"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={() => onDelete(call)}
              aria-label="Delete call"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
