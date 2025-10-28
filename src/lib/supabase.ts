import { getSupabaseClient } from "@/lib/supabaseClient";

export class SupabaseConfigurationError extends Error {
  constructor(message = "Supabase configuration is missing.") {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

type SupabaseConfig = {
  url: string;
  key: string;
};

const getSupabaseConfig = (): SupabaseConfig => {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL;
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  const key = typeof rawKey === "string" ? rawKey.trim() : "";

  if (!url || !key) {
    throw new SupabaseConfigurationError(
      "Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  return { url, key };
};

export const isSupabaseConfigured = (): boolean => {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL;
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean((rawUrl ?? "").trim()) && Boolean((rawKey ?? "").trim());
};

const createSupabaseHeaders = (key: string, extra?: HeadersInit): HeadersInit => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  ...extra,
});

const encodeTableName = (tableName: string) => {
  const requiresQuoting = /[^a-z0-9_]/i.test(tableName);
  const encoded = encodeURIComponent(tableName);
  if (requiresQuoting) {
    return `%22${encoded}%22`;
  }
  return encoded;
};

const buildRestUrl = (baseUrl: string, tableName: string, query = "") => {
  const encodedTable = encodeTableName(tableName);
  return `${baseUrl}/rest/v1/${encodedTable}${query}`;
};

export const fetchSupabaseTable = async (
  tableName: string,
): Promise<Array<Record<string, unknown>>> => {
  const { url, key } = getSupabaseConfig();

  const response = await fetch(buildRestUrl(url, tableName, "?select=*"), {
    headers: createSupabaseHeaders(key),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to load Supabase table "${tableName}" (${response.status}): ${errorText}`,
    );
  }

  const payload = await response.json().catch(() => null);
  if (!Array.isArray(payload)) {
    throw new Error(`Supabase table "${tableName}" returned an unexpected payload shape.`);
  }

  return payload as Array<Record<string, unknown>>;
};

export const exportSupabaseTableCsv = async (tableName: string): Promise<string> => {
  const { url, key } = getSupabaseConfig();

  const response = await fetch(buildRestUrl(url, tableName, "?select=*"), {
    headers: createSupabaseHeaders(key, {
      Accept: "text/csv",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to export Supabase table "${tableName}" (${response.status}): ${errorText}`,
    );
  }

  return response.text();
};

export const importSupabaseRows = async (
  tableName: string,
  rows: Array<Record<string, unknown>>,
): Promise<void> => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const { url, key } = getSupabaseConfig();

  const response = await fetch(buildRestUrl(url, tableName), {
    method: "POST",
    headers: createSupabaseHeaders(key, {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    }),
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to import data into "${tableName}" (${response.status}): ${errorText}`,
    );
  }
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
};

export const parseCsvContent = (
  content: string,
): Array<Record<string, string>> => {
  const rows = content
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0);

  if (rows.length === 0) {
    return [];
  }

  const headerRow = parseCsvLine(rows[0]);
  const entries: Array<Record<string, string>> = [];

  for (let index = 1; index < rows.length; index += 1) {
    const line = rows[index];
    const values = parseCsvLine(line);

    if (values.every((value) => value === "")) {
      continue;
    }

    const entry: Record<string, string> = {};
    headerRow.forEach((header, headerIndex) => {
      entry[header] = values[headerIndex] ?? "";
    });

    entries.push(entry);
  }

  return entries;
};

export const deleteSupabaseTableRows = async (
  tableName: string,
  columnForFullDelete: string,
): Promise<number> => {
  const client = getSupabaseClient();
  const filter = `${columnForFullDelete}.is.null,${columnForFullDelete}.not.is.null`;

  const { error, count } = await client
    .from(tableName)
    .delete({ count: "exact" })
    .or(filter);

  if (error) {
    throw new Error(
      `Failed to delete rows from "${tableName}": ${error.message}`,
    );
  }

  return count ?? 0;
};
