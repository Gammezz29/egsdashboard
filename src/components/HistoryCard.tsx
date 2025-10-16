import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, MoreVertical } from "lucide-react";

interface HistoryCardProps {
  text: string;
  voice: string;
  date: string;
  duration: string;
}

export function HistoryCard({ text, voice, date, duration }: HistoryCardProps) {
  return (
    <Card className="border-border bg-card hover:bg-card/80 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <p className="text-sm text-foreground line-clamp-2">{text}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{voice}</span>
              <span>•</span>
              <span>{date}</span>
              <span>•</span>
              <span>{duration}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Play className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
