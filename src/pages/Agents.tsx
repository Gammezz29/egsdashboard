import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MoreHorizontal, ChevronDown } from "lucide-react";
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

const mockAgents = [
  { name: "Howard University", createdBy: "adrian@emerginglobal.com", createdAt: "Oct 15, 2025, 10:17 AM" },
  { name: "Grace US New", createdBy: "adrian@emerginglobal.com", createdAt: "Oct 9, 2025, 2:57 PM" },
  { name: "GVHC", createdBy: "adrian@emerginglobal.com", createdAt: "Oct 7, 2025, 3:08 PM" },
  { name: "Camarena", createdBy: "adrian@emerginglobal.com", createdAt: "Oct 6, 2025, 10:26 PM" },
  { name: "2nd Nature", createdBy: "adrian@emerginglobal.com", createdAt: "Oct 6, 2025, 9:59 PM" },
  { name: "Marys Demo n8n SPA", createdBy: "adrian@emerginglobal.com", createdAt: "Oct 6, 2025, 5:02 PM" },
  { name: "Grace Test 2", createdBy: "adrian@emerginglobal.com", createdAt: "Oct 5, 2025, 12:25 AM" },
  { name: "Marys Demo n8n", createdBy: "adrian@emerginglobal.com", createdAt: "Oct 2, 2025, 2:03 PM" },
  { name: "Grace GV", createdBy: "adrian@emerginglobal.com", createdAt: "Sep 29, 2025, 11:50 PM" },
  { name: "GraceMarys", createdBy: "adrian@emerginglobal.com", createdAt: "Sep 29, 2025, 11:17 AM" },
  { name: "Grace PMSNM", createdBy: "adrian@emerginglobal.com", createdAt: "Sep 20, 2025, 9:52 PM" },
];

export default function Agents() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Agents</h1>
            <p className="text-muted-foreground">Create and manage your AI agents</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">Playground</Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New agent
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Creator
          </Button>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    Created at
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAgents
                .filter((agent) =>
                  agent.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((agent, index) => (
                  <TableRow 
                    key={index} 
                    className="cursor-pointer"
                    onClick={() => navigate(`/agents/${index + 1}`)}
                  >
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {agent.createdBy}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {agent.createdAt}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
