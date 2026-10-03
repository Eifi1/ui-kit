import { useState } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { DangerConfirm, Select, Switch, ToggleGroup } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";

/**
 * 0.24 (keksdose, after moving `UserActionConfirm` and `UserPlanEditor` onto the tile in
 * 0.23): the confirm's variant apart from `tone`, a guard of the caller's own that holds
 * the confirm without the lock's printed line, fields of the caller's inside the tile,
 * and why Cancel waits while the action runs. Synthetic data only.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/** The raw value under a specimen, so what the component emits is visible. */
function StateLine({ children }: { children: string }) {
  return <p className="mt-2 font-mono text-xs break-all text-[var(--text-muted)]">{children}</p>;
}

const PLANS = ["FREE", "PRO", "UNLIMITED"] as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ── Signature, password & confirmation page (slug "signature-password") ── */

export function DangerConfirm024Demo() {
  return (
    <>
      <PlanEditorExample />
      <ConfirmVariantExample />
    </>
  );
}

/** keksdose's plan editor: the picker inside the tile, held until a different plan. */
function PlanEditorExample() {
  // The account's plan, and the one picked in the tile — seeded from it on every arm.
  const [current, setCurrent] = useState<string>("FREE");
  const [plan, setPlan] = useState(current);
  const [fail, setFail] = useState(false);
  const [log, setLog] = useState("—");
  return (
    <Example
      label="DangerConfirm — a field of the caller's and a guard of its own"
      hint="children inside the armed tile; confirmDisabledReason holds the confirm"
    >
      <Stage>
        <div data-stage="wide" className="flex flex-col items-center gap-4">
          <Switch checked={fail} onCheckedChange={setFail} label="The request fails" />
          <div className="w-96 max-w-full rounded-lg bg-[var(--bg-surface-2)] p-2">
            <DangerConfirm
              tone="warning"
              armLabel="Change plan…"
              confirmLabel="Set plan"
              prompt={
                <span className="flex gap-2">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Set the plan of user@example.com</span>
                </span>
              }
              requireAcknowledge
              confirmDisabledReason={plan === current ? "Pick a different plan" : undefined}
              onArmedChange={(armed) => {
                if (armed) setPlan(current);
              }}
              onConfirm={async () => {
                setLog(`PATCH { plan: "${plan}" } …`);
                await wait(1200);
                if (fail) {
                  setLog(`PATCH { plan: "${plan}" } → 503, still armed`);
                  throw new Error("unavailable");
                }
                setCurrent(plan);
                setLog(`PATCH { plan: "${plan}" } → 200`);
              }}
            >
              <p className="text-xs text-[var(--text-muted)]">
                {current} today — 2 budgets owned.
              </p>
              <Select
                label="Plan"
                hint="A smaller plan only stops new budgets; none are removed."
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                {PLANS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </DangerConfirm>
          </div>
        </div>
      </Stage>
      <StateLine>{`account = ${current} · picked = ${plan} · last = ${log}`}</StateLine>
      <Note>
        {code("children")} are drawn inside the armed tile, after the prompt and the consequences and before the
        tick, the phrase and the password — so the prompt is the panel&rsquo;s title again, not a line under a picker
        that sat outside. Arming focuses their first form field; Tab goes on to the tick, Cancel and the confirm.
        Without children the tile is laid out as before.
      </Note>
      <Note>
        {code("confirmDisabledReason")} holds the armed confirm like the built-in guards — {code("aria-disabled")},
        focusable, the reason in its tooltip, a press or Enter swallowed — without {code("lockedReason")}&rsquo;s line
        under the buttons, and without holding the arm button. The confirm names a write lock first, then this
        reason, then the first open built-in guard: the caller&rsquo;s field is drawn above them, and which plan has to be
        settled before ticking that you mean it.
      </Note>
      <Note>
        While {code("Set plan")} runs, Cancel is disabled on purpose: the request has left, and a Cancel that only
        collapsed the tile would say the change was called off while it lands. Turn on &ldquo;The request
        fails&rdquo; and confirm with the pointer or Space: the tile stays armed, the fields as they were, and the focus
        comes back to {code("Set plan")} for the retry.
      </Note>
    </Example>
  );
}

/** keksdose's admin password reset: the amber question, the red Go. */
function ConfirmVariantExample() {
  const [variant, setVariant] = useState<"tone" | "danger">("danger");
  const [log, setLog] = useState("—");
  return (
    <Example
      label="DangerConfirm — confirmVariant"
      hint={'tone="warning" colours the question; the confirm can stay red'}
    >
      <Stage>
        <div data-stage="wide" className="flex flex-col items-center gap-4">
          <ToggleGroup
            aria-label="Confirm variant"
            value={variant}
            onChange={(v) => setVariant(v as "tone" | "danger")}
            options={[
              { value: "tone", label: "From tone" },
              { value: "danger", label: 'confirmVariant="danger"' },
            ]}
          />
          <div className="w-96 max-w-full rounded-lg bg-[var(--bg-surface-2)] p-2">
            <DangerConfirm
              key={variant}
              tone="warning"
              confirmVariant={variant === "danger" ? "danger" : undefined}
              armLabel="Reset password…"
              confirmLabel="Send reset link"
              prompt={
                <span className="flex gap-2">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Reset the password of user@example.com?</span>
                </span>
              }
              consequences={[
                "Every session ends when the link is used.",
                "The account's two personal API tokens keep working.",
              ]}
              requireAcknowledge
              onConfirm={() => setLog("POST { acknowledged: true, confirm_email: null }")}
            />
          </div>
        </div>
      </Stage>
      <StateLine>{`last = ${log}`}</StateLine>
      <Note>
        {code("tone")} says how bad the outcome is, {code("confirmVariant")} how loud the last press is. An admin
        resetting somebody else&rsquo;s password is guarded against picking the wrong row, not against losing data — an
        amber question — and still ends in a red button. Left out, the variant follows {code("tone")} as before:{" "}
        {code("danger")} for {code('"danger"')}, {code("primary")} for {code('"warning"')}.
      </Note>
    </Example>
  );
}
