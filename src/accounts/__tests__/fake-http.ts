import { vi } from "vitest";

/**
 * A minimal axios for the accounts client's tests, as session-refresh.test.ts's: interceptor
 * managers in axios's order (request ones last-added first, response ones in the order
 * added), `request(config)` COPIES the config as axios's `mergeConfig` does, and an HTTP
 * refusal rejects as axios's error (`isAxiosError`, `response.status`, `response.data`).
 * `server` answers each request as it went out: a status and a body, or a throw (no answer).
 */

export type Cfg = {
  method?: string;
  url?: string;
  data?: unknown;
  timeout?: number;
  headers?: Record<string, unknown>;
  [key: string]: unknown;
};
type Res = { config: Cfg; status: number; data?: unknown };
export type Answer = { status: number; data?: unknown };

export function httpError(status: number, config: Cfg, data?: unknown) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true as const,
    config,
    response: { status, config, data },
  });
}

export function fakeHttp(server: (config: Cfg) => Answer | Promise<Answer>, baseURL = "/api/v1") {
  const manager = <V>() => {
    const handlers: Array<{ ok: (v: V) => V | Promise<V>; err: (e: unknown) => unknown } | null> = [];
    return {
      handlers,
      use(ok: (v: V) => V | Promise<V>, err: (e: unknown) => unknown) {
        handlers.push({ ok, err });
        return handlers.length - 1;
      },
      eject(id: number) {
        handlers[id] = null;
      },
    };
  };
  const request = manager<Cfg>();
  const response = manager<Res>();
  /** Every request as it reached the server, with the bearer it carried. */
  const sent: Array<Cfg & { bearer: string | null }> = [];
  const send = async (input: Cfg): Promise<Res> => {
    let config: Cfg = { ...input };
    for (const h of [...request.handlers].reverse()) if (h) config = await h.ok(config);
    const auth = config.headers?.Authorization;
    sent.push({ ...config, headers: { ...config.headers }, bearer: typeof auth === "string" ? auth : null });
    let ok: boolean;
    let value: unknown;
    try {
      const answer = await server(config);
      ok = answer.status < 400;
      value = ok ? { config, status: answer.status, data: answer.data } : httpError(answer.status, config, answer.data);
    } catch (error) {
      ok = false;
      value = error;
    }
    for (const h of response.handlers) {
      if (!h) continue;
      try {
        value = ok ? await h.ok(value as Res) : await h.err(value);
        ok = true;
      } catch (e) {
        value = e;
        ok = false;
      }
    }
    if (ok) return value as Res;
    throw value;
  };
  return {
    interceptors: { request, response },
    request: vi.fn(send),
    defaults: { baseURL },
    sent,
    get: (url: string) => send({ method: "get", url }),
  };
}

/** What axios rejects with when nothing answered. */
export const noAnswer = () => Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK" });

/** A `fetch` for the bare refresh: answers `POST …/auth/refresh` from `answer`, and records
 *  every call. */
export function fakeFetch(answer: (body: { refresh_token: string }) => Answer | Promise<Answer>) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    void url;
    const body = JSON.parse(String(init?.body)) as { refresh_token: string };
    const { status, data } = await answer(body);
    return new Response(data === undefined ? null : JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
}

/** A session answer, server-kit's `TokenResponse`. */
export const tokens = (access: string, refresh: string | null, user: { id: number; [key: string]: unknown }) => ({
  access_token: access,
  refresh_token: refresh,
  token_type: "bearer",
  user,
});
