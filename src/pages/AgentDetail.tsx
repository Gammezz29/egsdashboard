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
import { ArrowLeft, Copy, Phone, Plus } from "lucide-react";
import { toast } from "sonner";

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agentLanguage, setAgentLanguage] = useState("English");
  const [llmModel, setLlmModel] = useState("GPT-OSS-120B");

  const handleCopyAgentId = () => {
    toast.success("Agent ID copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-14 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/agents")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Agents
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold">Howard University</h1>
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
            <div className="flex items-center gap-3">
              <Button variant="outline">Test AI agent</Button>
              <Button variant="outline">Copy link</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="agent" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="agent">Agent</TabsTrigger>
            <TabsTrigger value="workflow">Agent Workflow</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="widget">
              Widget
              <Badge variant="secondary" className="ml-2 text-xs">
                New
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agent" className="space-y-8">
            {/* Agent Language */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Agent Language</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose the default language the agent will communicate in.
                </p>
              </div>
              <Select value={agentLanguage} onValueChange={setAgentLanguage}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Languages */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Additional Languages</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Specify additional languages which callers can choose from.
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="gap-2">
                  Spanish
                  <button className="hover:text-destructive">×</button>
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                To support additional languages, language overrides will be enabled. You can view and configure all overrides in the "Security" tab.
              </p>
            </div>

            {/* First Message */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">First message</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  The first message the agent will say. If empty, the agent will wait for the user to start the conversation.
                </p>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Default (English)</span>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
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
            </div>

            {/* System Prompt */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">System prompt</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  The system prompt is used to determine the persona of the agent and the context of the conversation.
                </p>
              </div>
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
            </div>

            {/* Dynamic Variables */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Dynamic Variables</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Variables like {'{'}{'{'} user_name {'}'}{'}'}  in your prompts and first message will be replaced with actual values when the conversation starts.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variable
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Test Variables</Label>
                <p className="text-xs text-muted-foreground">
                  When testing your agent in development, dynamic variables will be replaced with these placeholder values.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="lang-var" className="text-sm">lang</Label>
                  <Input id="lang-var" defaultValue="English" className="max-w-xs" />
                </div>
              </div>
            </div>

            {/* LLM Configuration */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">LLM</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Select which provider and model to use for the LLM.
                </p>
              </div>
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
            </div>

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
