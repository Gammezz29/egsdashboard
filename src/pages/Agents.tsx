import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useElevenLabsAgents } from "@/hooks/useElevenLabsMetrics";
import { useAuth } from "@/hooks/useAuth";
import { filterAgentsForUser, isAgentAccessRestricted } from "@/lib/accessControl";

export default function Agents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const requiresRestriction = isAgentAccessRestricted(user);
  const {
    data: agents,
    isLoading,
    isError,
    refetch,
  } = useElevenLabsAgents();

  const accessibleAgents = useMemo(
    () => filterAgentsForUser(agents, user),
    [agents, user],
  );

  const visibleAgents = useMemo(
    () =>
      requiresRestriction
        ? accessibleAgents.filter(
            (agent) => agent.name.trim().toLowerCase() !== "marys no show es",
          )
        : accessibleAgents,
    [accessibleAgents, requiresRestriction],
  );

  const handleRowClick = (agentId: string) => {
    navigate(`/agents/${agentId}`);
  };

  const renderBody = () => {
    if (isLoading) {
      return Array.from({ length: 6 }).map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          <TableCell className="py-4">
            <Skeleton className="h-5 w-48 rounded" />
          </TableCell>
          <TableCell className="w-12">
            <Skeleton className="h-5 w-8 rounded" />
          </TableCell>
        </TableRow>
      ));
    }

    if (isError) {
      return (
        <TableRow>
          <TableCell colSpan={2} className="py-6 text-center text-sm text-muted-foreground">
            We couldn&apos;t load your agents.{" "}
            <Button
              variant="link"
              size="sm"
              className="px-1"
              onClick={() => refetch({ meta: { force: true } })}
            >
              Try again
            </Button>
          </TableCell>
        </TableRow>
      );
    }

    if (!visibleAgents || visibleAgents.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={2} className="py-6 text-center text-sm text-muted-foreground">
            {requiresRestriction
              ? "You do not have access to any agents. Contact an administrator if you need additional permissions."
              : "No agents found yet. Create your first agent to get started."}
          </TableCell>
        </TableRow>
      );
    }

    return visibleAgents.map((agent) => (
      <TableRow
        key={agent.id}
        className="cursor-pointer hover:bg-muted/40"
        onClick={() => handleRowClick(agent.id)}
      >
        <TableCell className="font-medium text-foreground">{agent.name}</TableCell>
        <TableCell className="w-12">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(event) => event.stopPropagation()}
                aria-label="Agent actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  handleRowClick(agent.id);
                }}
              >
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(event) => event.stopPropagation()}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(event) => event.stopPropagation()}>
                Duplicate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">Agents</h1>
            <p className="text-muted-foreground">Create and manage your AI agents</p>
          </div>
          <div className="flex items-center gap-3">
            {!requiresRestriction ? <Button variant="outline">Playground</Button> : null}
            <Button
              disabled={requiresRestriction}
              title={requiresRestriction ? "Contact an administrator to create new agents." : undefined}
            >
              <Plus className="mr-2 h-4 w-4" />
              New agent
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderBody()}</TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

