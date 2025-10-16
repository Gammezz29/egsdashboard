import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Download, Wand2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const voices = [
  { id: "1", name: "Aria", description: "Professional female voice" },
  { id: "2", name: "Roger", description: "Warm male voice" },
  { id: "3", name: "Sarah", description: "Energetic female voice" },
  { id: "4", name: "Daniel", description: "Deep male voice" },
];

const models = [
  { id: "turbo", name: "Eleven Turbo v2.5", description: "Fastest, low latency" },
  { id: "multi", name: "Eleven Multilingual v2", description: "Most lifelike, 29 languages" },
];

export function VoiceGenerator() {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(voices[0].id);
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to generate speech",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Success",
        description: "Audio generated successfully",
      });
    }, 2000);
  };

  return (
    <Card className="border-border bg-card shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Generate Speech</CardTitle>
        <CardDescription>Transform your text into natural-sounding speech</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Voice</label>
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{voice.name}</span>
                    <span className="text-xs text-muted-foreground">{voice.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Model</label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Text</label>
          <Textarea
            placeholder="Enter the text you want to convert to speech..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[200px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {text.length} characters
          </p>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>

        {isGenerating && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">Generating your audio...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
