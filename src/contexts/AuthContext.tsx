import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { GlobalRole } from "@/lib/devAccess";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  globalRole: GlobalRole;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = "coachmetric:last-activity-at";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalRole, setGlobalRole] = useState<GlobalRole>("none");

  async function loadProfile(userId: string): Promise<GlobalRole> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("global_role")
        .eq("id", userId)
        .single();

      if (error) return "none";
      return (data?.global_role as GlobalRole) ?? "none";
    } catch {
      return "none";
    }
  }

  function markActivity() {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }

  function clearActivity() {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  }

  function getLastActivityAt() {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  async function forceSignOut() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Failed to sign out on timeout:", error);
    } finally {
      clearActivity();
      setSession(null);
      setUser(null);
      setGlobalRole("none");
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          setSession(null);
          setUser(null);
          setGlobalRole("none");
          return;
        }

        setSession(session ?? null);
        setUser(session?.user ?? null);

        if (session?.user) {
          markActivity();
          const role = await loadProfile(session.user.id);
          if (!isMounted) return;
          setGlobalRole(role);
        } else {
          clearActivity();
          setGlobalRole("none");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        clearActivity();
        setGlobalRole("none");
        setLoading(false);
        return;
      }

      if (event !== "PASSWORD_RECOVERY") {
        markActivity();
      }

      loadProfile(nextSession.user.id)
        .then((role) => {
          if (!isMounted) return;
          setGlobalRole(role);
        })
        .finally(() => {
          if (!isMounted) return;
          setLoading(false);
        });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
    ];

    const handleActivity = () => {
      markActivity();
    };

    const checkIdleTimeout = async () => {
      const lastActivityAt = getLastActivityAt();
      if (!lastActivityAt) return;

      const idleFor = Date.now() - lastActivityAt;
      if (idleFor >= IDLE_TIMEOUT_MS) {
        await forceSignOut();
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await checkIdleTimeout();
      }
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = window.setInterval(() => {
      void checkIdleTimeout();
    }, 60_000);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [session?.user?.id]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;
    markActivity();
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    clearActivity();
    if (error) throw error;
  }

  async function requestPasswordReset(email: string) {
    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) throw error;
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) throw error;
  }

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      globalRole,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [user, session, loading, globalRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
