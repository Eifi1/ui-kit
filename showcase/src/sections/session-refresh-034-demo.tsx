import { useState, useSyncExternalStore } from "react";
import {
  Button,
  Switch,
  ToggleGroup,
  attachSessionRefresh,
  createSessionRefresh,
  isTransientRefreshFailure,
} from "@eifi1/ui-kit";
import type { ServerWakeAxiosConfig, SessionRenewal } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * attachSessionRefresh (0.34, docs/auth-harmonization.md §11, round 0.34 C7): renewing a
 * session. Beside the cold-start notice, the other half of what the kit does to an app's
 * axios instance.
 *
 * The client, the server and the tokens are SYNTHETIC; nothing is sent. The client is a
 * few lines of axios's shape (interceptors and `request`), because the showcase has no
 * axios — the kit types the instance structurally, so the real one fits the same way.
 */

const beat = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** What the pretend refresh answers. */
type Answer = "renewal" | "ended" | "busy" | "elsewhere";

type DemoConfig = ServerWakeAxiosConfig & { headers?: Record<string, unknown>; [key: string]: unknown };
type DemoResponse = { config: DemoConfig; status: number };

/** axios's shape, as small as the kit needs: interceptors in axios's order, and `request`. */
function createDemoClient(server: (config: DemoConfig) => Promise<number>) {
  const manager = <V,>() => {
    const handlers: Array<{ ok: (v: V) => V | Promise<V>; err: (e: unknown) => unknown } | null> = [];
    return {
      handlers,
      use(ok: (v: V) => V | Promise<V>, err: (e: unknown) => unknown) {
        return handlers.push({ ok, err }) - 1;
      },
      eject(id: number) {
        handlers[id] = null;
      },
    };
  };
  const interceptors = { request: manager<DemoConfig>(), response: manager<DemoResponse>() };
  const request = async (input: DemoConfig): Promise<unknown> => {
    let config = { ...input };
    for (const h of [...interceptors.request.handlers].reverse()) if (h) config = await h.ok(config);
    const status = await server(config);
    let ok = status < 400;
    let value: unknown = ok
      ? { config, status }
      : Object.assign(new Error(`Request failed with status code ${status}`), { config, response: { status, config } });
    for (const h of interceptors.response.handlers) {
      if (!h) continue;
      try {
        value = ok ? await h.ok(value as DemoResponse) : await h.err(value);
        ok = true;
      } catch (error) {
        value = error;
        ok = false;
      }
    }
    if (ok) return value;
    throw value;
  };
  return { interceptors, request };
}

/** The pretend app: its token, the one the pretend server accepts, and the switches. */
interface World {
  token: string | null;
  valid: string;
  issued: number;
  answer: Answer;
  demo: boolean;
  started: number;
}

/** A sign-in: a new token, never an earlier one — the kit ends each session once. */
function signIn(world: World): void {
  world.issued += 1;
  world.token = `a${world.issued}`;
  world.valid = world.token;
}

function build(world: World, say: (line: string) => void) {
  const at = () => `${((performance.now() - world.started) / 1000).toFixed(1)} s`;
  const client = createDemoClient(async (config) => {
    await beat(150);
    const sent = String(config.headers?.Authorization ?? "").replace(/^Bearer /, "");
    const status = sent !== "" && sent === world.valid ? 200 : 401;
    say(`${at()}  GET ${config.url} with ${sent || "no token"} → ${status}`);
    return status;
  });
  // The app's own request interceptor: the token, from where the app keeps it.
  client.interceptors.request.use(
    (config) => (world.token ? { ...config, headers: { ...config.headers, Authorization: `Bearer ${world.token}` } } : config),
    (error) => Promise.reject(error),
  );
  const session = createSessionRefresh<SessionRenewal>({
    async refresh() {
      say(`${at()}  POST /auth/refresh`);
      await beat(600);
      if (world.answer === "ended") throw Object.assign(new Error("Request failed with status code 401"), { status: 401 });
      if (world.answer === "busy") throw Object.assign(new Error("Request failed with status code 503"), { status: 503 });
      world.issued += 1;
      const token = `a${world.issued}`;
      world.valid = token;
      return world.answer === "elsewhere" ? { token, replay: false } : { token };
    },
    store(renewal) {
      world.token = renewal.token;
      say(`${at()}  store(${renewal.token}${renewal.replay === false ? ", replay: false" : ""})`);
    },
    currentToken: () => world.token,
    isDemo: () => world.demo,
    onEnded({ demo }) {
      world.token = null;
      say(`${at()}  onEnded({ demo: ${demo} }) → ${demo ? "/demo/ended" : "/login"}`);
    },
  });
  attachSessionRefresh(client, session);
  return client;
}

const ANSWERS: Array<{ value: Answer; label: string }> = [
  { value: "renewal", label: "A new token" },
  { value: "ended", label: "401: over" },
  { value: "busy", label: "503, every time" },
  { value: "elsewhere", label: "replay: false" },
];

const CAPTIONS: Record<Answer, string> = {
  renewal: "Stored once, and each request replayed once with the new token.",
  ended: "Definitive: onEnded once, however many requests waited.",
  busy: "Transient: three attempts, 1 s and 3 s apart; each request rejects with its own 401, marked.",
  elsewhere: "Stored, nothing replayed: kastlan's refresh that landed in another company.",
};

/** The pretend app and its log live beside the page, as the cold-start demo's watcher
 *  does: the kit's session is made once, and the buttons only change what it meets. */
const world: World = { token: "a1", valid: "a1", issued: 1, answer: "renewal", demo: false, started: 0 };
let lines: readonly string[] = [];
const listeners = new Set<() => void>();
const log = {
  say(line: string) {
    lines = [...lines, line];
    for (const listener of listeners) listener();
  },
  clear() {
    lines = [];
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => lines,
};
const client = build(world, log.say);

const send = async () => {
  world.started = performance.now();
  world.valid = "—"; // the token the app holds has run out
  log.clear();
  await Promise.all(
    ["/budgets", "/accounts", "/me/settings"].map((url) =>
      client.request({ url }).then(
        () => log.say(`✓ ${url}`),
        (error: unknown) =>
          log.say(
            `✗ ${url}: its own 401${isTransientRefreshFailure(error) ? ", isTransientRefreshFailure → “can't reach the server”" : ""}`,
          ),
      ),
    ),
  );
};

export function SessionRefresh034Demo() {
  const shown = useSyncExternalStore(log.subscribe, log.get, log.get);
  const [answer, setAnswer] = useState<Answer>(world.answer);
  const [demo, setDemo] = useState(world.demo);
  const [running, setRunning] = useState(false);

  return (
    <Example
      label="attachSessionRefresh — one refresh, two kinds of failure"
      hint="three requests with an expired token share one refresh; only a definitive failure signs out"
    >
      <div className="flex flex-col gap-3">
        <ToggleGroup
          aria-label="The refresh answers"
          value={answer}
          onChange={(value) => {
            world.answer = value;
            setAnswer(value);
          }}
          options={ANSWERS}
          caption={(value) => CAPTIONS[value]}
        />
        <Switch
          checked={demo}
          onCheckedChange={(on) => {
            world.demo = on;
            setDemo(on);
          }}
          label="A demo session (its 401 ends it, no refresh)"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={running}
            onClick={() => {
              setRunning(true);
              void send().finally(() => setRunning(false));
            }}
          >
            Send 3 requests with an expired token
          </Button>
          <Button
            variant="ghost"
            disabled={!running || world.token === null}
            onClick={() => {
              world.token = null;
              log.say("— signed out by hand, while the refresh runs");
            }}
          >
            Sign out during the refresh
          </Button>
          <Button
            variant="ghost"
            disabled={running}
            onClick={() => {
              signIn(world);
              log.clear();
              log.say(`— signed in: ${world.token}`);
            }}
          >
            Sign in again
          </Button>
        </div>
        <ol aria-label="What happened" aria-live="polite" className="min-h-24 space-y-0.5 rounded-md border border-subtle bg-surface-2 p-3 font-mono text-xs text-secondary [overflow-wrap:anywhere]">
          {shown.length === 0 ? <li>Nothing sent yet.</li> : shown.map((line, i) => <li key={i}>{line}</li>)}
        </ol>
        <Note>
          {
            "Attach it last: `attachServerWake(api)`, then the app's own interceptors, then `attachSessionRefresh(api, createSessionRefresh({ refresh, store, currentToken, isDemo, onEnded }))`. The app's `refresh` is its bare `POST /auth/refresh` and writes nothing; the kit calls `store` only while the session is unchanged, so a refresh that lands after a sign-out (try it) stores nothing and ends nothing. A signed-out step's 401 (`isSignedOutStep`: `/auth/login`, its `2fa` step, `/auth/refresh` …) never refreshes. The kit shows nothing itself: the app words a transient failure."
          }
        </Note>
      </div>
    </Example>
  );
}
