import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, IconButton, Switch, toast } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * TOASTS — the kit's `toast` and `<Toaster>` (0.10.0). The showcase's own toaster is
 * the kit one, mounted once in showcase.tsx; every button here only calls `toast`.
 */

function ToastTones() {
  return (
    <Example
      label="Toasts — every tone, with and without a description"
      hint="toast(), toast.success / info / warning / error — the AlertBanner tones on an opaque surface"
    >
      <Row>
        <Button variant="secondary" onClick={() => toast("Draft kept for later")}>
          Plain
        </Button>
        <Button variant="secondary" onClick={() => toast.success("Settings saved")}>
          Success
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.info("Sync resumed", { description: "12 changes are on their way." })}
        >
          Info
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.warning("Storage almost full", { description: "Older attachments will not be synced." })
          }
        >
          Warning
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.error("Could not save", { description: "The server did not answer." })}
        >
          Error
        </Button>
      </Row>
      <div className="mt-3">
        <Note>
          The import is the only change from sonner: <code className="font-mono">toast(msg, opts)</code>{" "}
          and its tone methods take the same message and options (<code className="font-mono">description</code>,{" "}
          <code className="font-mono">action</code>, <code className="font-mono">cancel</code>,{" "}
          <code className="font-mono">duration</code>, <code className="font-mono">id</code>,{" "}
          <code className="font-mono">onDismiss</code>, <code className="font-mono">onAutoClose</code>) and
          return the id. The colours are the AlertBanner tokens, layered on{" "}
          <code className="font-mono">--bg-surface</code> so a dark toast is not see-through, and the toaster
          follows the theme toggle in the top bar by itself.
        </Note>
      </div>
    </Example>
  );
}

const FRUIT = ["Apples", "Pears", "Plums"];

function ToastUndo() {
  const [items, setItems] = useState(FRUIT);

  function remove(name: string) {
    setItems((list) => list.filter((n) => n !== name));
    toast.undo(`“${name}” deleted`, {
      onUndo: () => {
        setItems((list) => (list.includes(name) ? list : FRUIT.filter((n) => n === name || list.includes(n))));
        toast.redo(`“${name}” restored`, { onRedo: () => remove(name) });
      },
    });
  }

  return (
    <Example
      label="Toasts — an action, undo and redo"
      hint="toast.undo(message, { onUndo }) — the action says the provider's toast.undo, and lasts 8s"
    >
      <ul className="max-w-xs divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
        {items.map((name) => (
          <li key={name} className="flex items-center justify-between px-3 py-1.5 text-sm text-[var(--text-primary)]">
            {name}
            <IconButton label={`Delete ${name}`} tone="muted" onClick={() => remove(name)}>
              <Trash2 />
            </IconButton>
          </li>
        ))}
        {items.length === 0 && <li className="px-3 py-1.5 text-sm text-[var(--text-muted)]">Nothing left.</li>}
      </ul>
      <Row className="mt-3">
        <Button variant="ghost" onClick={() => setItems(FRUIT)}>
          Reset the list
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.info("Export ready", {
              action: { label: "Open", onClick: () => toast("Opening the export…") },
            })
          }
        >
          Any action
        </Button>
      </Row>
      <div className="mt-3">
        <Note>
          Delete a row: the toast offers the step back, and undoing it offers the step forward again —
          keksdose&apos;s journal pattern, with the journal left to the app. Any toast with an{" "}
          <code className="font-mono">action</code> stays up 8s rather than 4s unless it is given a{" "}
          <code className="font-mono">duration</code>, so the button can be reached. The action is a real
          button inside the toaster&apos;s polite live region: it is announced with the message, Tab reaches
          it, the timer pauses while focus or the pointer is on the toast, and Alt+T jumps to the newest one.
        </Note>
      </div>
    </Example>
  );
}

function ToastReplaceAndPromise() {
  const saves = useRef(0);
  return (
    <Example
      label="Toasts — replace by id, and loading to success"
      hint="the same id updates the toast on screen; toast.promise swaps a spinner for the outcome"
    >
      <Row>
        <Button
          variant="secondary"
          onClick={() => {
            saves.current += 1;
            toast.success(`Saved ${saves.current}×`, { id: "demo-save", description: "One toast, updated in place." });
          }}
        >
          Save (same id)
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.promise(new Promise((resolve) => setTimeout(() => resolve(3), 1500)), {
              loading: "Uploading 3 receipts…",
              success: (n) => `${String(n)} receipts uploaded`,
              error: "Upload failed",
            })
          }
        >
          Upload (succeeds)
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.promise(new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500)), {
              loading: "Uploading…",
              success: "Uploaded",
              error: (e) => `Upload failed: ${(e as Error).message}`,
            })
          }
        >
          Upload (fails)
        </Button>
        <Button variant="ghost" onClick={() => toast.dismiss()}>
          Dismiss all
        </Button>
      </Row>
      <div className="mt-3">
        <Note>
          Press <strong>Save</strong> several times: one toast counts up instead of a stack of them, because
          they share <code className="font-mono">id: &quot;demo-save&quot;</code>. An update replaces the toast
          wholesale, so pass every option again (an action left off the second call disappears).
        </Note>
      </div>
    </Example>
  );
}

function ToastRedact() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("demo-mode", demo);
    return () => document.documentElement.classList.remove("demo-mode");
  }, [demo]);
  return (
    <Example
      label="Toasts — redact, and where they appear on a phone"
      hint="redact wraps the message and description in data-private"
    >
      <Row>
        <Switch label="Demo mode (blur private values)" checked={demo} onCheckedChange={setDemo} />
        <Button
          variant="secondary"
          onClick={() =>
            toast.success("Transfer to DE89 3704 0044 0532 0130 00", {
              redact: true,
              description: "€ 1,250.00 from Household",
            })
          }
        >
          Redacted toast
        </Button>
      </Row>
      <div className="mt-3 space-y-2">
        <Note>
          With <code className="font-mono">redact</code> the message and the description carry{" "}
          <code className="font-mono">data-private</code>, so an app&apos;s demo mode (here, a{" "}
          <code className="font-mono">.demo-mode [data-private]</code> blur) hides them like any other figure.
        </Note>
        <Note>
          On a phone (below 768px) the toaster moves to the bottom centre, lifted above AppShell&apos;s bottom
          nav (<code className="font-mono">--app-nav-h</code>) and the safe area, so it covers neither the
          header&apos;s buttons nor the nav&apos;s; from 768px up it is top centre, below the top bar. It sits at{" "}
          <code className="font-mono">--z-toast</code>, above every dialog and sheet, and swipes away in any
          direction. <code className="font-mono">position</code> and <code className="font-mono">navOffset</code>{" "}
          override the defaults.
        </Note>
      </div>
    </Example>
  );
}

export function ToastsDemo() {
  return (
    <>
      <ToastTones />
      <ToastUndo />
      <ToastReplaceAndPromise />
      <ToastRedact />
    </>
  );
}
