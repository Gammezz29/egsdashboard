import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchSupabaseTable } from "@/lib/supabase";
import { getSupabaseClient } from "@/lib/supabaseClient";

export const buildSupabaseTableKey = (tableName: string) =>
  ["supabase", "table", tableName] as const;

type UseSupabaseTableResult = {
  data: Array<Record<string, unknown>> | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export const useSupabaseTable = (
  tableName: string,
  enabled = true,
): UseSupabaseTableResult => {
  const [data, setData] = useState<Array<Record<string, unknown>> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const refreshIntervalRef = useRef<number | null>(null);

  const loadTable = useCallback(async () => {
    if (!enabledRef.current) {
      return;
    }

    setIsFetching(true);
    try {
      const rows = await fetchSupabaseTable(tableName);
      setData(rows);
      setError(null);
    } catch (unknownError) {
      const formatted =
        unknownError instanceof Error
          ? unknownError
          : new Error(String(unknownError));
      setError(formatted);
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  }, [tableName]);

  const stopPolling = useCallback(() => {
    if (refreshIntervalRef.current != null) {
      window.clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (refreshIntervalRef.current != null) {
      return;
    }

    refreshIntervalRef.current = window.setInterval(() => {
      if (enabledRef.current) {
        void loadTable();
      }
    }, 10_000);
  }, [loadTable]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setIsFetching(false);
      stopPolling();
      return;
    }

    let isMounted = true;
    const client = getSupabaseClient();

    const initialise = async () => {
      setIsLoading(true);
      await loadTable();
      if (!isMounted) {
        stopPolling();
        return;
      }

      const channel = client
        .channel(`realtime:${tableName}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: tableName,
          },
          () => {
            void loadTable();
          },
        )
        .subscribe();

      startPolling();

      return () => {
        client.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | undefined;
    void initialise().then((unsubscribe) => {
      cleanup = unsubscribe;
    });

    return () => {
      isMounted = false;
      enabledRef.current = false;
      stopPolling();
      if (cleanup) {
        cleanup();
      }
    };
  }, [enabled, loadTable, startPolling, stopPolling, tableName]);

  return useMemo(
    () => ({
      data,
      isLoading,
      isFetching,
      isError: error != null,
      error,
      refetch: loadTable,
    }),
    [data, isLoading, isFetching, error, loadTable],
  );
};
