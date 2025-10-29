import type { User } from "@supabase/supabase-js";
import type { ElevenLabsAgent } from "./elevenLabs";

const ROLE_MASTER = "master";
const ROLE_MARYS_SUPERVISOR = "marys-supervisor";

const normalise = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  try {
    return trimmed
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s_-]+/g, " ")
      .trim();
  } catch {
    return trimmed.replace(/[\s_-]+/g, " ").trim();
  }
};

const MARYS_ALLOWED_AGENT_NAMES = new Set<string>(
  [
    "marys no show",
    "marys noshow",
    "marys no show es",
    "marys noshow es",
  ].map((entry) => normalise(entry)),
);

const getRawRole = (user: User | null | undefined): string | null => {
  const fromMetadata = user?.user_metadata?.role;
  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata;
  }

  const fromAppMetadata = (user?.app_metadata as Record<string, unknown> | undefined)?.role;
  if (typeof fromAppMetadata === "string" && fromAppMetadata.trim()) {
    return fromAppMetadata;
  }

  return null;
};

export const getUserRole = (user: User | null | undefined): string => {
  const raw = getRawRole(user);
  if (typeof raw !== "string") {
    return "";
  }

  const trimmed = raw.trim().toLowerCase();
  return trimmed;
};

export const isMasterUser = (user: User | null | undefined): boolean =>
  getUserRole(user) === ROLE_MASTER;

export const isMarysSupervisor = (user: User | null | undefined): boolean =>
  getUserRole(user) === ROLE_MARYS_SUPERVISOR;

export const isAgentAccessRestricted = (user: User | null | undefined): boolean =>
  isMarysSupervisor(user);

export const filterAgentsForUser = (
  agents: ElevenLabsAgent[] | undefined,
  user: User | null | undefined,
): ElevenLabsAgent[] => {
  const source = Array.isArray(agents) ? agents : [];
  if (!isAgentAccessRestricted(user)) {
    return source;
  }

  return source.filter((agent) => MARYS_ALLOWED_AGENT_NAMES.has(normalise(agent.name)));
};

export const isAgentNameAllowedForUser = (
  name: string | null | undefined,
  user: User | null | undefined,
): boolean => {
  if (!isAgentAccessRestricted(user)) {
    return true;
  }

  if (typeof name !== "string" || name.trim() === "") {
    return false;
  }

  return MARYS_ALLOWED_AGENT_NAMES.has(normalise(name));
};

export const getFirstAccessibleAgentId = (
  agents: ElevenLabsAgent[] | undefined,
  user: User | null | undefined,
): string | undefined => {
  const filtered = filterAgentsForUser(agents, user);
  return filtered[0]?.id;
};

export const ensureAgentIdForUser = (
  requestedAgentId: string | null | undefined,
  agents: ElevenLabsAgent[] | undefined,
  user: User | null | undefined,
): string | undefined => {
  const filtered = filterAgentsForUser(agents, user);

  if (!isAgentAccessRestricted(user)) {
    if (!requestedAgentId || requestedAgentId === "all" || requestedAgentId === "") {
      return undefined;
    }

    return filtered.some((agent) => agent.id === requestedAgentId)
      ? requestedAgentId
      : undefined;
  }

  if (filtered.length === 0) {
    return undefined;
  }

  if (
    requestedAgentId &&
    requestedAgentId !== "all" &&
    filtered.some((agent) => agent.id === requestedAgentId)
  ) {
    return requestedAgentId;
  }

  return filtered[0].id;
};

export const getAllowedMarysAgentNames = (): string[] =>
  Array.from(MARYS_ALLOWED_AGENT_NAMES.values());

export const DASHBOARD_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: ROLE_MASTER, label: "Master" },
  { value: ROLE_MARYS_SUPERVISOR, label: "Mary's Supervisor" },
];
