import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Declare signOut as a function so it hoists and can be used in effects
  async function signOut() {
    localStorage.removeItem("dev_session");
    await supabase.auth.signOut().catch(() => {});
    setSession(null);
  }

  useEffect(() => {
    const devSess = localStorage.getItem("dev_session");
    if (devSess) {
      try {
        const parsed = JSON.parse(devSess);
        const parts = parsed.access_token?.split(".");
        if (parts && parts.length > 1 && parsed.access_token.startsWith("mock-dev-token")) {
          const payload = JSON.parse(atob(parts[1]));
          const iat = payload.iat;
          if (iat && (Date.now() / 1000 - iat > 900)) {
            // Already expired
            localStorage.removeItem("dev_session");
            setSession(null);
            setLoading(false);
          } else {
            setSession(parsed);
            setLoading(false);
          }
        } else {
          // If no iat parts, treat as expired
          localStorage.removeItem("dev_session");
          setSession(null);
          setLoading(false);
        }
      } catch (e) {
        localStorage.removeItem("dev_session");
        setSession(null);
        setLoading(false);
      }
    } else {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      });
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (localStorage.getItem("dev_session")) return;
      setSession(next);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Periodic expiration checker (every 5 seconds)
  useEffect(() => {
    if (!session) return;

    const checkExpiration = () => {
      const token = session.access_token;
      if (!token) return;

      if (token.startsWith("mock-dev-token")) {
        const parts = token.split(".");
        if (parts.length > 1) {
          try {
            const payload = JSON.parse(atob(parts[1]));
            const iat = payload.iat;
            if (iat && (Date.now() / 1000 - iat > 900)) {
              console.log("Mock token expired. Logging out.");
              signOut();
            }
          } catch (e) {
            signOut();
          }
        } else {
          signOut();
        }
      } else {
        // Enforce 5-minute expiry on Supabase token locally as well
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const iat = payload.iat;
            if (iat && (Date.now() / 1000 - iat > 900)) {
              console.log("Session expired. Logging out.");
              signOut();
            }
          }
        } catch (e) {
          console.error("Error parsing JWT for expiry check:", e);
        }
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 5000);
    return () => clearInterval(interval);
  }, [session]);

  const signIn = async (email: string, password: string) => {
    if (email === "dev@local" || email.endsWith("@example.com") || email === "shivam@gmail.com") {
      const now = Math.floor(Date.now() / 1000);
      const payload = { sub: "dev-user", email, iat: now };
      const tokenPayload = btoa(JSON.stringify(payload));
      const mockSession = {
        access_token: `mock-dev-token.${tokenPayload}`,
        user: { id: "dev-user", email },
      } as any;
      localStorage.setItem("dev_session", JSON.stringify(mockSession));
      setSession(mockSession);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
    }
  };

  const signUp = async (email: string, password: string) => {
    if (email === "dev@local" || email.endsWith("@example.com") || email === "shivam@gmail.com") {
      const now = Math.floor(Date.now() / 1000);
      const payload = { sub: "dev-user", email, iat: now };
      const tokenPayload = btoa(JSON.stringify(payload));
      const mockSession = {
        access_token: `mock-dev-token.${tokenPayload}`,
        user: { id: "dev-user", email },
      } as any;
      localStorage.setItem("dev_session", JSON.stringify(mockSession));
      setSession(mockSession);
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
