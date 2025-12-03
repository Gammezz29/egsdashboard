import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, History, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AGENT_ID = "agent_8101ka1rf3q0ftztqzw46jekdwsr";
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

interface PromptVersion {
  id: string;
  prompt: string;
  firstMessage: string;
  timestamp: number;
  version: number;
}

export default function Playground() {
  const { toast } = useToast();
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");

  useEffect(() => {
    loadAgentPrompt();
    loadVersionsFromStorage();
    loadConvAIScript();
  }, []);

  const loadConvAIScript = () => {
    const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;
      script.type = "text/javascript";
      document.body.appendChild(script);
    }
  };

  const loadVersionsFromStorage = () => {
    const stored = localStorage.getItem(`playground_versions_${AGENT_ID}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setVersions(parsed);
      } catch (error) {
        console.error("Error loading versions:", error);
      }
    }
  };

  const saveVersionToStorage = (prompt: string, message: string) => {
    const newVersion: PromptVersion = {
      id: `v${Date.now()}`,
      prompt,
      firstMessage: message,
      timestamp: Date.now(),
      version: versions.length + 1,
    };
    const updatedVersions = [newVersion, ...versions].slice(0, 10); // Keep last 10 versions
    setVersions(updatedVersions);
    localStorage.setItem(`playground_versions_${AGENT_ID}`, JSON.stringify(updatedVersions));
  };

  const loadAgentPrompt = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load agent");
      }

      const data = await response.json();
      setCurrentPrompt(data.prompt || data.conversation_config?.agent?.prompt?.prompt || "");
      setFirstMessage(data.conversation_config?.agent?.first_message || "");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load agent prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAgentPrompt = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
        method: "PATCH",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: currentPrompt,
              },
              first_message: firstMessage,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save prompt");
      }

      saveVersionToStorage(currentPrompt, firstMessage);

      toast({
        title: "Success",
        description: "Prompt and first message saved successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadVersion = (versionId: string) => {
    const version = versions.find((v) => v.id === versionId);
    if (version) {
      setCurrentPrompt(version.prompt);
      setFirstMessage(version.firstMessage || "");
      setSelectedVersion(versionId);
      toast({
        title: "Version Loaded",
        description: `Version ${version.version} loaded successfully`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Playground</h1>
          <p className="text-muted-foreground">
            Edit and test your AI agent in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Section */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Prompt Editor</CardTitle>
              <CardDescription>
                Edit the prompt for agent {AGENT_ID}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Prompt</label>
                    <Textarea
                      value={currentPrompt}
                      onChange={(e) => setCurrentPrompt(e.target.value)}
                      placeholder="Enter your agent prompt here..."
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">First Message</label>
                    <Textarea
                      value={firstMessage}
                      onChange={(e) => setFirstMessage(e.target.value)}
                      placeholder="Enter the first message the agent will say..."
                      className="min-h-[100px] font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Version History</label>
                    {versions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No saved versions yet. Save to create a version.
                      </p>
                    ) : (
                      <Select value={selectedVersion} onValueChange={loadVersion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a version to restore" />
                        </SelectTrigger>
                        <SelectContent>
                          {versions.map((version) => (
                            <SelectItem key={version.id} value={version.id}>
                              Version {version.version} -{" "}
                              {new Date(version.timestamp).toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={saveAgentPrompt}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={loadAgentPrompt}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ConvAI Widget Section */}
          <div className="rounded-lg border border-border p-6 min-h-[500px] flex items-center justify-center">
            <elevenlabs-convai agent-id={AGENT_ID}></elevenlabs-convai>
          </div>
        </div>
      </div>
    </div>
  );
}
