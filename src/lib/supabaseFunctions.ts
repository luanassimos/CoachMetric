import { supabase } from "@/lib/supabase";

type FunctionCallOptions = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

export class SupabaseFunctionError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "SupabaseFunctionError";
    this.status = status;
    this.payload = payload;
  }
}

export function isSupabaseFunctionError(
  error: unknown,
): error is SupabaseFunctionError {
  return error instanceof SupabaseFunctionError;
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

async function getValidAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error("Unable to load your session. Sign in again.");
  }

  const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : 0;
  const isExpiredOrNearExpiry =
    !session?.access_token ||
    !expiresAtMs ||
    expiresAtMs - Date.now() < 60_000;

  if (!isExpiredOrNearExpiry && session.access_token) {
    return session.access_token;
  }

  const { data: refreshed, error: refreshError } =
    await supabase.auth.refreshSession();

  if (refreshError || !refreshed.session?.access_token) {
    throw new Error("Your session has expired. Sign in again to continue.");
  }

  return refreshed.session.access_token;
}

async function performFunctionRequest<T>(params: {
  functionName: string;
  method: "GET" | "POST";
  body?: Record<string, unknown>;
  accessToken: string;
}) {
  const baseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
  const anonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (!baseUrl || !anonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const headers: HeadersInit = {
    apikey: anonKey,
    Authorization: `Bearer ${params.accessToken}`,
  };

  if (params.method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(
    `${baseUrl}/functions/v1/${params.functionName}`,
    {
      method: params.method,
      headers,
      body:
        params.method === "GET" ? undefined : JSON.stringify(params.body ?? {}),
    },
  );

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : (payload?.error as string | undefined) ??
          (payload?.message as string | undefined) ??
          "Request to Supabase function failed.";

    throw new SupabaseFunctionError(message, response.status, payload);
  }

  return payload as T;
}

export async function callSupabaseFunction<T>(
  functionName: string,
  options: FunctionCallOptions = {},
): Promise<T> {
  const method = options.method ?? "POST";
  const accessToken = await getValidAccessToken();

  try {
    return await performFunctionRequest<T>({
      functionName,
      method,
      body: options.body,
      accessToken,
    });
  } catch (error) {
    if (
      isSupabaseFunctionError(error) &&
      error.status === 401 &&
      ((typeof error.payload === "object" &&
        error.payload &&
        (error.payload as { message?: string }).message === "Invalid JWT") ||
        error.message.toLowerCase().includes("invalid jwt"))
    ) {
      const refreshedToken = await getValidAccessToken();
      return await performFunctionRequest<T>({
        functionName,
        method,
        body: options.body,
        accessToken: refreshedToken,
      });
    }

    throw error;
  }
}
