import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type SignInResult = {
  error?: string;
};

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  signIn: (identifier: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOGIN_DOMAIN =
  (import.meta.env.VITE_SUPABASE_LOGIN_DOMAIN as string | undefined)?.trim() ?? "";

const normaliseIdentifierToEmail = (identifier: string): string | null => {
  const trimmed = identifier.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("@")) {
    return trimmed;
  }

  if (!LOGIN_DOMAIN) {
    return null;
  }

  return `${trimmed}@${LOGIN_DOMAIN}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const client = useMemo(() => getSupabaseClient(), []);

  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setStatus("unauthenticated");
          setUser(null);
          return;
        }

        setUser(data.session?.user ?? null);
        setStatus(data.session?.user ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setStatus("unauthenticated");
        setUser(null);
      });

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setUser(session?.user ?? null);
      setStatus(session?.user ? "authenticated" : "unauthenticated");
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = useCallback(
    async (identifier: string, password: string): Promise<SignInResult> => {
      const email = normaliseIdentifierToEmail(identifier);

      if (!email) {
        return { error: "Ingrese un correo o usuario válido." };
      }

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      setUser(data.user ?? null);
      setStatus(data.user ? "authenticated" : "unauthenticated");

      return {};
    },
    [client],
  );

  const signOut = useCallback(async () => {
    await client.auth.signOut();
    setUser(null);
    setStatus("unauthenticated");
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn,
      signOut,
    }),
    [signIn, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
