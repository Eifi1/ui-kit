import { useState } from "react";
import { Button, Switch, ToggleGroup } from "@eifi1/ui-kit";
import { PwaUpdatePrompt, SharedComputerChoice, SignOutPendingDialog, isSharedComputer } from "@eifi1/ui-kit/offline";
import { Example, Note, Row, StateLine, beat, code, READOUT_PRE } from "../lib/section";

/**
 * LOCAL-FIRST, PHASE 1 (0.45, docs/local-first-harmonization.md §1.6): the sign-out
 * question while changes wait, the service-worker update prompt, the shared-computer
 * choice, and the recipe for the persisted query cache. Nothing is sent: "Sync now" is a
 * pretend round that clears one change, the update is pretend too.
 */

type Words = "kept" | "lost";

function SignOutPendingDemo() {
  const [open, setOpen] = useState(false);
  const [words, setWords] = useState<Words>("kept");
  const [queued, setQueued] = useState(3);
  const [plan, setPlan] = useState(true);
  const [last, setLast] = useState("—");
  const waitingForPlan = plan ? Math.min(2, queued) : 0;

  const signOut = () => {
    setOpen(false);
    setLast(queued > 0 ? `signed out with ${queued} waiting` : "signed out");
  };

  return (
    <Example
      label="SignOutPendingDialog — before a sign-out while changes wait"
      hint="only on an explicit sign-out, never from a session-ended hook (D6)"
    >
      <Row>
        <ToggleGroup<Words>
          aria-label="What sign-out does with the queue"
          value={words}
          onChange={setWords}
          options={[
            { value: "kept", label: "keepsChanges" },
            { value: "lost", label: "keepsChanges={false}" },
          ]}
        />
        <Switch checked={plan} onCheckedChange={setPlan} label="Some wait for a plan" />
      </Row>
      <Row className="mt-3">
        <Button variant="secondary" onClick={() => (queued > 0 ? setOpen(true) : signOut())}>
          Log out
        </Button>
        <Button variant="ghost" onClick={() => setQueued(3)}>
          Queue 3 changes again
        </Button>
      </Row>
      <StateLine label="queued">{queued}</StateLine>
      <StateLine label="last">{last}</StateLine>
      <SignOutPendingDialog
        open={open}
        queued={queued}
        waitingForPlan={waitingForPlan}
        keepsChanges={words === "kept"}
        extra={waitingForPlan > 0 ? `${waitingForPlan} changes waiting for a plan` : undefined}
        onSyncNow={async () => {
          await beat(900);
          setQueued((n) => Math.max(0, n - 1));
        }}
        onDiscardWaiting={async () => {
          await beat(300);
          setQueued((n) => Math.max(0, n - waitingForPlan));
        }}
        onSignOutAnyway={signOut}
        onClose={() => setOpen(false)}
      />
      <Note>
        {code("queued")} is pending + blocked; the tour {code(":pending")} record is not counted. "Sync now" closes when
        the round settles, and the caller decides again on the new count.
      </Note>
    </Example>
  );
}

function PwaUpdateDemo() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [hold, setHold] = useState(false);
  const [last, setLast] = useState("—");
  return (
    <Example
      label="PwaUpdatePrompt — “A new version is available”"
      hint="a toast; waits while `hold` (a handover, a tour) (D8)"
    >
      <Row>
        <Button variant="secondary" onClick={() => setNeedRefresh(true)}>
          Pretend a new version waits
        </Button>
        <Switch checked={hold} onCheckedChange={setHold} label="Hold (a tour runs)" />
      </Row>
      <StateLine label="needRefresh">{String(needRefresh)}</StateLine>
      <StateLine label="last">{last}</StateLine>
      <PwaUpdatePrompt
        needRefresh={needRefresh}
        hold={hold}
        onReload={() => {
          setNeedRefresh(false);
          setLast("reload (updateServiceWorker(true))");
        }}
        onDismiss={() => {
          setNeedRefresh(false);
          setLast("dismissed");
        }}
      />
    </Example>
  );
}

function SharedComputerDemo() {
  const [on, setOn] = useState(isSharedComputer);
  return (
    <Example
      label="SharedComputerChoice — on the sign-in form"
      hint="held in sessionStorage: the choice outlives no tab (D6)"
    >
      <SharedComputerChoice onCheckedChange={setOn} />
      <StateLine label="isSharedComputer()">{String(on)}</StateLine>
    </Example>
  );
}

const RECIPE = `import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryPersistence, isSharedComputer } from "@eifi1/ui-kit/offline";

const persistence = createQueryPersistence({
  app: "my-app",
  user: me.id,
  company: me.companyId,           // the switch changes the key: no wipe, no leak
  denyRoots: ["admin", "platform", "billing", "translations", "assistant", "reports", "bank-accounts"],
  buster: __APP_VERSION__,
  maxAge: 24 * 60 * 60 * 1000,     // the QueryClient's gcTime must be at least this
});

// At sign-in: other accounts' caches older than maxAge go.
void persistence.removeStale();
// At sign-out: await persistence.clear(queryClient);

return isSharedComputer() ? (
  <QueryClientProvider client={queryClient}>{app}</QueryClientProvider>
) : (
  <PersistQueryClientProvider client={queryClient} persistOptions={persistence.persistOptions}>
    {app}
  </PersistQueryClientProvider>
);`;

function QueryPersistenceRecipe() {
  return (
    <Example
      label="createQueryPersistence — the persisted query cache"
      hint="TanStack Query and idb-keyval are optional peers of @eifi1/ui-kit/offline only"
    >
      <pre className={READOUT_PRE}>{RECIPE}</pre>
      <Note>
        Before a query is written, {code("iban")}, {code("qr_iban")}, {code("default_qr_iban")} and{" "}
        {code("signature_*")} are removed at any depth ({code("DEFAULT_SCRUB_FIELDS")}); data that is not plain JSON is
        skipped and reported through {code("onUnsafe")}. On restore, a denied or unsafe entry an older build wrote is
        dropped, and paused mutations are kept.
      </Note>
    </Example>
  );
}

export function OfflineDemo() {
  return (
    <>
      <QueryPersistenceRecipe />
      <SignOutPendingDemo />
      <PwaUpdateDemo />
      <SharedComputerDemo />
    </>
  );
}
