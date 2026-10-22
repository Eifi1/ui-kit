import { useState } from "react";
import { CloudOff } from "lucide-react";
import { Button } from "../../../src/components/button";
import { Input } from "../../../src/components/input";
import { Field } from "../../../src/components/field";
import { FloatingActionButton } from "../../../src/components/floating-panel";
import { ServerWakeNotice, useServerWakeStage } from "../../../src/components/server-wake";
import { createServerWake } from "../../../src/lib/server-wake";
import { Example, Note, code } from "../lib/section";

/**
 * ServerWakeNotice (0.18): a cold-start notice, for every app. A demo watcher
 * of its own, so the buttons below never touch the shared instance.
 */

const demo = createServerWake();

/** A request that takes `ms` — what a sleeping Cloud Run container does to a GET. */
const simulate = (ms: number) =>
  void demo.track(new Promise((resolve) => setTimeout(resolve, ms)), { method: "get", url: "/budgets" });

export function ServerWake018Demo() {
  const stage = useServerWakeStage(demo);
  const [appName, setAppName] = useState("My App");
  const [pill, setPill] = useState(false);
  return (
    <Example
      label="ServerWakeNotice — cold start"
      hint="slow at 2 s, the explanation at 7 s, gone when the last request settles"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <Button variant="secondary" onClick={() => simulate(3000)}>
            Simulate a 3 s request
          </Button>
          <Button variant="secondary" onClick={() => simulate(9000)}>
            Simulate a 9 s request
          </Button>
          <Button variant="ghost" onClick={() => demo.reset()}>
            Reset
          </Button>
          <Button variant="ghost" aria-pressed={pill} onClick={() => setPill((on) => !on)}>
            {pill ? "Hide the offline pill" : "Show an offline pill"}
          </Button>
          {/* The render prop wires the label to the input; a plain child would need an
              `htmlFor` id of its own (axe "label", refactor audit 2026-10, DOC-10). */}
          <Field label="App name" className="w-40">
            {(control) => <Input {...control} value={appName} onChange={(e) => setAppName(e.target.value)} />}
          </Field>
        </div>
        <p className="text-sm text-secondary">
          Stage: <span className="font-mono">{stage}</span>
        </p>
        <ServerWakeNotice watcher={demo} appName={appName || undefined} />
        {pill && (
          <FloatingActionButton
            label="Offline — 2 photos queued"
            icon={<CloudOff />}
            corner="bottom-start"
            extended
            variant="surface"
          />
        )}
        <Note>
          The notice is fixed at the top, centred under the status bar, and takes no taps (0.34): until then it sat in the bottom-start corner, which on a phone is where a sticky Create footer and
          the floating buttons live. Wire it once: {code("attachServerWake(api)")} on the axios instance (or{" "}
          {code("wrapFetch(fetch)")}) and {code("<ServerWakeNotice appName=\"…\" />")} next to the router. GETs only by
          default; {code("createServerWake({ shouldWatch: watchReadsAnd(/\\/auth\\/login\\b/) })")} adds the login POST.
          Never while offline, never an upload, never a download ({code("responseType")} {code("blob")},{" "}
          {code("arraybuffer")} or {code("stream")}; 0.19.0). An offline pill at the bottom no longer meets it: show
          the pill, then simulate a request — they stand at opposite ends of the screen.
        </Note>
      </div>
    </Example>
  );
}
