import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Mock data for charts
const callsData = [
  { date: "Sep 16", calls: 70 },
  { date: "Sep 18", calls: 65 },
  { date: "Sep 20", calls: 45 },
  { date: "Sep 22", calls: 105 },
  { date: "Sep 24", calls: 85 },
  { date: "Sep 26", calls: 75 },
  { date: "Sep 28", calls: 55 },
  { date: "Sep 30", calls: 40 },
  { date: "Oct 2", calls: 95 },
  { date: "Oct 4", calls: 65 },
  { date: "Oct 6", calls: 115 },
  { date: "Oct 8", calls: 55 },
  { date: "Oct 10", calls: 75 },
  { date: "Oct 12", calls: 90 },
  { date: "Oct 14", calls: 65 },
  { date: "Oct 16", calls: 50 },
];

const successData = [
  { date: "Sep 16", success: 85, fail: 15 },
  { date: "Sep 18", success: 75, fail: 25 },
  { date: "Sep 20", success: 90, fail: 10 },
  { date: "Sep 22", success: 80, fail: 20 },
  { date: "Sep 24", success: 95, fail: 5 },
  { date: "Sep 26", success: 88, fail: 12 },
  { date: "Sep 28", success: 92, fail: 8 },
  { date: "Sep 30", success: 78, fail: 22 },
  { date: "Oct 2", success: 96, fail: 4 },
  { date: "Oct 4", success: 85, fail: 15 },
  { date: "Oct 6", success: 90, fail: 10 },
  { date: "Oct 8", success: 70, fail: 30 },
  { date: "Oct 10", success: 88, fail: 12 },
  { date: "Oct 12", success: 92, fail: 8 },
  { date: "Oct 14", calls: 82, fail: 18 },
  { date: "Oct 16", calls: 95, fail: 5 },
];

const agentsData = [
  { name: "Grace Marys", calls: 429, minutes: 238.9, llmCost: "$2.76", credits: "213,757" },
  { name: "Marys Demo n8n", calls: 305, minutes: 357.433, llmCost: "$0.0984", credits: "105,341" },
  { name: "GraceMarys", calls: 191, minutes: 148.933, llmCost: "$1.05", credits: "128,192" },
];

const languageData = [
  { language: "English", percentage: 88.2 },
  { language: "Spanish", percentage: 11.8 },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6 max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">My Workspace</p>
            <h1 className="text-3xl font-bold text-foreground">Good afternoon, Adrian reynoso</h1>
          </div>
          <div className="flex items-center gap-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="month">
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last week</SelectItem>
                <SelectItem value="month">Last month</SelectItem>
                <SelectItem value="year">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Number of calls</p>
                <p className="text-3xl font-bold text-foreground">1,397</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Average duration</p>
                <p className="text-3xl font-bold text-foreground">0:47</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total cost</p>
                <p className="text-3xl font-bold text-foreground">702,341<span className="text-sm font-normal text-muted-foreground ml-1">credits</span></p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Average cost</p>
                <p className="text-3xl font-bold text-foreground">503<span className="text-sm font-normal text-muted-foreground ml-1">credits/call</span></p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total LLM cost</p>
                <p className="text-3xl font-bold text-foreground">$6.7</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calls Chart */}
        <Card className="border-border bg-card p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={callsData}>
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
                  borderRadius: "6px"
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
        </Card>

        {/* Success Rate Chart */}
        <Card className="border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Overall success rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={successData}>
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
                  borderRadius: "6px"
                }}
              />
              <Area 
                type="monotone" 
                dataKey="success" 
                stackId="1"
                stroke="#4ade80" 
                fill="#4ade80" 
              />
              <Area 
                type="monotone" 
                dataKey="fail" 
                stackId="1"
                stroke="#ef4444" 
                fill="#ef4444" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Most Called Agents Table */}
          <Card className="border-border bg-card lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Most called agents</h3>
                <Button variant="ghost" size="sm">See all 14 agents</Button>
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
                    <TableRow key={agent.name}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell className="text-right">{agent.calls}</TableCell>
                      <TableCell className="text-right">{agent.minutes}</TableCell>
                      <TableCell className="text-right">{agent.llmCost}</TableCell>
                      <TableCell className="text-right">{agent.credits}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Language Stats */}
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Language</h3>
              <div className="space-y-4">
                {languageData.map((item) => (
                  <div key={item.language} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{item.language}</span>
                      <span className="text-sm font-semibold text-foreground">{item.percentage}%</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
