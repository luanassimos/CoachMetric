import { supabase } from "@/lib/supabase";

type FunctionCallOptions = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

export async function callSupabaseFunction<T>(
  functionName: string,
  options: FunctionCallOptions = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be signed in to perform this action.");
  }

  const method = options.method ?? "POST";
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const headers: HeadersInit = {
    apikey: anonKey,
    Authorization: `Bearer ${session.access_token}`,
  };

  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(options.body ?? {}),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : (payload?.error as string | undefined) ??
          "Request to Supabase function failed.";

    throw new Error(message);
  }

  return payload as T;
}
