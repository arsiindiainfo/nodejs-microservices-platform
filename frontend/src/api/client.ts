const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000/api/v1';
const REQUEST_TIMEOUT_MS = 15000;

export interface ApiErrorBody {
  code: string;
  message: string;
  service?: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  service?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.code = body.code;
    this.status = status;
    this.service = body.service;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const ACCESS_TOKEN_KEY = 'demotech.accessToken';
const REFRESH_TOKEN_KEY = 'demotech.refreshToken';

let accessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);
let refreshToken: string | null = localStorage.getItem(REFRESH_TOKEN_KEY);

type SessionListener = () => void;
const sessionListeners = new Set<SessionListener>();

export function onSessionCleared(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function hasSession(): boolean {
  return Boolean(refreshToken);
}

export function setTokens(tokens: { accessToken: string; refreshToken: string } | null): void {
  if (tokens) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } else {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionListeners.forEach((listener) => listener());
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const json = (await res.json()) as { success: boolean; data?: TokenPairLike };
        if (!res.ok || !json.success || !json.data) return false;
        setTokens(json.data);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface TokenPairLike {
  accessToken: string;
  refreshToken: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

function mapFetchError(err: unknown): ApiError {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return new ApiError(0, { code: 'SERVICE_UNAVAILABLE', message: 'The server took too long to respond. Please try again.' });
  }
  return new ApiError(0, { code: 'NETWORK_ERROR', message: 'Could not reach the server. Check your connection and try again.' });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth ?? true;

  const doFetch = (): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    // A dropped connection can hang indefinitely with no error and no
    // response — fetch() has no default timeout, so without this a broken
    // network path leaves the caller's loading state stuck forever.
    return fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  };

  let res: Response;
  try {
    res = await doFetch();
  } catch (err) {
    throw mapFetchError(err);
  }

  if (res.status === 401 && auth && refreshToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      try {
        res = await doFetch();
      } catch (err) {
        throw mapFetchError(err);
      }
    }
  }

  let json: { success: boolean; data?: T; error?: ApiErrorBody };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new ApiError(res.status, { code: 'INTERNAL_ERROR', message: 'Unexpected response from the server.' });
  }

  if (!json.success) {
    const body = json.error ?? { code: 'INTERNAL_ERROR', message: 'Something went wrong.' };
    if (res.status === 401 && auth) {
      setTokens(null);
    }
    throw new ApiError(res.status, body);
  }

  return json.data as T;
}
