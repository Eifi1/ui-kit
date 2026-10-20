import type { SyncRequestBody, SyncResponseBody } from "./wire";

/*
 * `@eifi1/ui-kit/sync/testing` — a scripted `/sync` server for an app's tests of the engine
 * (docs/local-first-harmonization.md §2.3). Pass `transport.send` as the engine's `send`.
 * Imports nothing (no Dexie): it is the engine's `send`, not a store.
 */

/** One scripted answer: a body, a function of the request, or a failure. */
export type FakeSyncAnswer =
  | SyncResponseBody
  | ((body: SyncRequestBody) => SyncResponseBody | Promise<SyncResponseBody>)
  | { fail: "offline" }
  | { fail: number; data?: unknown };

export interface FakeSyncTransport {
  /** The engine's `send`. */
  send(body: SyncRequestBody, signal?: AbortSignal): Promise<SyncResponseBody>;
  /** Every request received, in order (the body as sent). */
  readonly requests: SyncRequestBody[];
  /** Queue answers for the next requests, in order; past them the default answers. */
  answer(...answers: FakeSyncAnswer[]): void;
  /** The next request meets no connection (an axios-like error with no response). */
  failOffline(): void;
  /** The next request answers `status` (a 5xx, a 402 `{code}`, a 403). */
  failStatus(status: number, data?: unknown): void;
  /** The default answer's server knowledge, raised by one for every request. */
  knowledge: number;
}

/** The error an axios client throws: `isAxiosError`, and `response` only with an answer. */
function wireError(fail: "offline" | number, data?: unknown): Error {
  const err = new Error(fail === "offline" ? "Network Error" : `Request failed with status code ${fail}`);
  return Object.assign(err, {
    isAxiosError: true,
    response: fail === "offline" ? undefined : { status: fail, data: data ?? {} },
  });
}

/**
 * The default answer echoes every pushed change as applied, with a server id (`pk`, 100 on),
 * and an empty pull besides; `knowledge` goes up by one each request. Script anything else
 * with `answer(...)`, `failOffline()` and `failStatus(...)`.
 */
export function createFakeSyncTransport(): FakeSyncTransport {
  const script: FakeSyncAnswer[] = [];
  let nextPk = 100;
  const transport: FakeSyncTransport = {
    requests: [],
    knowledge: 0,
    answer: (...answers) => void script.push(...answers),
    failOffline: () => void script.push({ fail: "offline" }),
    failStatus: (status, data) => void script.push({ fail: status, data }),
    async send(body) {
      transport.requests.push(structuredClone(body));
      const next = script.shift();
      if (next && typeof next === "object" && "fail" in next) {
        throw wireError(next.fail, "data" in next ? next.data : undefined);
      }
      if (typeof next === "function") return next(body);
      if (next) return next;
      transport.knowledge += 1;
      return {
        server_knowledge: transport.knowledge,
        changes: body.changes.map((change) => ({ ...change, pk: change.op === "delete" ? null : nextPk++ })),
        rejections: [],
        refused: null,
        page_cursor: null,
      };
    },
  };
  return transport;
}
