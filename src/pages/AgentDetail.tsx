import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Copy, Phone, Plus, Settings, Wand2, Activity, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agentLanguage, setAgentLanguage] = useState("English");
  const [firstMessageLanguage, setFirstMessageLanguage] = useState("English");
  const [llmModel, setLlmModel] = useState("GPT-OSS-120B");

  const handleCopyAgentId = () => {
    navigator.clipboard.writeText("agent_8101k7me0r3ze5taw3w47tcseedd");
    toast.success("Agent ID copied to clipboard");
  };

  const getFlagEmoji = (language: string) => {
    switch (language) {
      case "English":
        return "🇺🇸";
      case "Spanish":
        return "🇪🇸";
      case "French":
        return "🇫🇷";
      case "German":
        return "🇩🇪";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/agents")}
                className="p-0 h-auto text-muted-foreground hover:text-foreground"
              >
                Agents
              </Button>
              <span>/</span>
              <h1 className="text-sm font-medium text-foreground">Howard University</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Activity className="w-4 h-4" />
                Test AI agent
              </Button>
              <Button variant="outline">Copy link</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Howard University</h2>
              <Badge variant="outline">Public</Badge>
              <Button variant="ghost" size="sm" className="gap-2">
                <Phone className="w-4 h-4" />
                +1 202 858 1199
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <code className="text-xs">agent_8101k7me0r3ze5taw3w47tcseedd</code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={handleCopyAgentId}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6 max-w-4xl">
        <Tabs defaultValue="agent" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="agent">Agent</TabsTrigger>
            <TabsTrigger value="workflow">
              Agent Workflow
              <Badge variant="secondary" className="ml-2 text-xs">
                New
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="tests">
              Tests
              <Badge variant="secondary" className="ml-2 text-xs">
                New
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="widget">Widget</TabsTrigger>
          </TabsList>

          <TabsContent value="agent" className="space-y-8">
            {/* Agent Language */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Agent Language <Settings className="w-4 h-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>
                  Choose the default language the agent will communicate in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={agentLanguage} onValueChange={setAgentLanguage}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue>
                      <span className="mr-2">{getFlagEmoji(agentLanguage)}</span>
                      {agentLanguage}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">
                      <span className="mr-2">🇺🇸</span>English
                    </SelectItem>
                    <SelectItem value="Spanish">
                      <span className="mr-2">🇪🇸</span>Spanish
                    </SelectItem>
                    <SelectItem value="French">
                      <span className="mr-2">🇫🇷</span>French
                    </SelectItem>
                    <SelectItem value="German">
                      <span className="mr-2">🇩🇪</span>German
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Additional Languages */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Additional Languages</CardTitle>
                <CardDescription>
                  Specify additional languages which callers can choose from.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Badge variant="secondary" className="gap-2">
                    <span className="mr-1">🇪🇸</span>Spanish
                    <button className="hover:text-destructive">×</button>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  To support additional languages, language overrides will be enabled. You can view and configure all overrides in the "Security" tab.
                </p>
              </CardContent>
            </Card>

            {/* First Message */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>First message</CardTitle>
                <CardDescription>
                  The first message the agent will say. If empty, the agent will wait for the user to start the conversation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <Select value={firstMessageLanguage} onValueChange={setFirstMessageLanguage}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue>
                        <span className="mr-2">{getFlagEmoji(firstMessageLanguage)}</span>
                        Default ({firstMessageLanguage})
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">
                        <span className="mr-2">🇺🇸</span>English
                      </SelectItem>
                      <SelectItem value="Spanish">
                        <span className="mr-2">🇪🇸</span>Spanish
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs gap-1">
                    <Wand2 className="w-3 h-3" />
                    Translate to all
                  </Button>
                </div>
                <Textarea
                  defaultValue="Hello, this is Grace with Howard University. How can I help you?"
                  className="min-h-[80px]"
                />
                <div className="flex items-center gap-2">
                  <Switch id="disable-interruptions" />
                  <Label htmlFor="disable-interruptions" className="text-sm font-normal">
                    Disable interruptions during first message
                  </Label>
                </div>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs gap-1">
                  <Plus className="w-3 h-3" />
                  Add Variable
                </Button>
              </CardContent>
            </Card>

            {/* System Prompt */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>System prompt</CardTitle>
                <CardDescription>
                  The system prompt is used to determine the persona of the agent and the context of the conversation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Describe the desired agent (e.g., a customer support agent for ElevenLabs)"
                  defaultValue="Role & Personality

You are Grace, a warm, professional phone agent representing Howard University. You are patient, empathetic, efficient, and concise. Every caller should feel valued and supported. Always speak as if smiling, with a natural, approachable, and friendly tone. Mirror the caller's mood: calm if they are stressed, upbeat if they are cheerful.

Environment

You speak with prospect clients by phone to manage appointments: create, confirm, reschedule, or cancel. You receive structured inputs and can call tools to complete actions.

Tone & Speaking Style

- Friendly, calm, professional. ~160 wpm. Short, clear sentences.
- Speak warmly and naturally, never robotic.
- Use short fillers every 3–5 turns (e.g., 'Okay,' 'Alright,' 'Thanks')
- Mirror caller's language using {{lang}} (default English unless the patient clearly speaks Spanish first)."
                  className="min-h-[300px] font-mono text-xs"
                />
                <div className="flex items-center gap-2">
                  <Switch id="ignore-personality" />
                  <Label htmlFor="ignore-personality" className="text-sm font-normal">
                    Ignore default personality
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Variables */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Dynamic Variables</CardTitle>
                <CardDescription>
                  Variables like {'{'}{'{'} user_name {'}'}{'}'} in your prompts and first message will be replaced with actual values when the conversation starts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Variable
                </Button>
                <div className="space-y-2 p-4 border border-border rounded-md bg-muted/20">
                  <Label className="text-sm font-medium">Test Variables</Label>
                  <p className="text-xs text-muted-foreground">
                    When testing your agent in development, dynamic variables will be replaced with these placeholder values.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="lang-var" className="text-sm">lang</Label>
                    <Input id="lang-var" defaultValue="English" className="max-w-xs" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* LLM Configuration */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>LLM</CardTitle>
                <CardDescription>
                  Select which provider and model to use for the LLM.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Select value={llmModel} onValueChange={setLlmModel}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GPT-OSS-120B">GPT-OSS-120B</SelectItem>
                      <SelectItem value="GPT-4">GPT-4</SelectItem>
                      <SelectItem value="Claude">Claude</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">Experimental</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button size="lg">Save Changes</Button>
            </div>
          </TabsContent>

          <TabsContent value="workflow">
            <div className="text-center py-12 text-muted-foreground">
              Agent Workflow configuration coming soon...
            </div>
          </TabsContent>

          <TabsContent value="voice">
            <div className="text-center py-12 text-muted-foreground">
              Voice settings coming soon...
            </div>
          </TabsContent>

          <TabsContent value="analysis">
            <div className="text-center py-12 text-muted-foreground">
              Analysis dashboard coming soon...
            </div>
          </TabsContent>

          <TabsContent value="tests">
            <div className="text-center py-12 text-muted-foreground">
              Test configurations coming soon...
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="text-center py-12 text-muted-foreground">
              Security settings coming soon...
            </div>
          </TabsContent>

          <TabsContent value="advanced">
            <div className="text-center py-12 text-muted-foreground">
              Advanced settings coming soon...
            </div>
          </TabsContent>

          <TabsContent value="widget">
            <div className="text-center py-12 text-muted-foreground">
              Widget configuration coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}