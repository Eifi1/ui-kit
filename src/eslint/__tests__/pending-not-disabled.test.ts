// @vitest-environment node
import { RuleTester, type Rule } from "eslint";
import tseslint from "typescript-eslint";
import plugin from "../index";

/**
 * `@eifi1/ui-kit/pending-not-disabled` (refactor audit 2026-11-22, INP-1): a `<Button>` or
 * `<IconButton>` that its own click turns natively `disabled` — the pressed button, which
 * holds the focus and drops it to <body>. A button the same state disables but whose click
 * does not start it (Cancel beside Save) is left alone.
 */

const rule = (plugin.rules as Record<string, Rule.RuleModule>)["pending-not-disabled"];

const error = (state: string) => ({ messageId: "pendingNotDisabled", data: { state } });

new RuleTester({
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
}).run("pending-not-disabled", rule, {
  valid: [
    // Held the kit's way.
    `function A() { const [busy, setBusy] = useState(false);
       return <Button pending={busy} onClick={() => setBusy(true)}>Save</Button>; }`,
    // The same state, but this click does not start it: Cancel beside the Save.
    `function A({ onCancel }) { const [busy, setBusy] = useState(false);
       return <Button disabled={busy} onClick={onCancel}>Cancel</Button>; }`,
    `function A({ busy, close }) { return <Button disabled={busy} onClick={() => close()}>Cancel</Button>; }`,
    // A prop handler, in a component that starts `busy` elsewhere: the parent's, unread.
    `function A({ onClose }) { const [busy, setBusy] = useState(null);
       const save = () => setBusy("save");
       return <><Button pending={busy === "save"} onClick={save}>Save</Button>
         <Button disabled={busy !== null} onClick={onClose}>Cancel</Button></>; }`,
    // A click that ENDS the state: the pending email change is taken.
    `function A() { const [pending, setPending] = useState(null);
       return <Button disabled={pending === null} onClick={() => { take(pending); setPending(null); }}>Take</Button>; }`,
    // Held by `pending` (or `refused`), which Button puts over the native `disabled`.
    `function A() { const [busy, setBusy] = useState(null);
       return <Button pending={busy === "approve"} disabled={busy !== null} onClick={() => setBusy("approve")}>OK</Button>; }`,
    // Not a pending state.
    `function A() { const [open, setOpen] = useState(false);
       return <Button disabled={open} onClick={() => setOpen(true)}>Open</Button>; }`,
    // Another mutation's state.
    `function A() { const save = useMutation(); const del = useMutation();
       return <Button disabled={del.isPending} onClick={() => save.mutate()}>Save</Button>; }`,
    // Not a kit button.
    `function A() { const [busy, setBusy] = useState(false);
       return <Chip disabled={busy} onClick={() => setBusy(true)}>Tag</Chip>; }`,
  ],
  invalid: [
    {
      code: `function A() { const [busy, setBusy] = useState(false);
        return <Button disabled={busy} onClick={() => setBusy(true)}>Save</Button>; }`,
      errors: [error("busy")],
    },
    {
      // Through the file's own functions: NotificationInbox's "Mark all as read".
      code: `function A({ unread }) {
        const [busy, setBusy] = useState(null);
        const run = (which, call) => { setBusy(which); call(); };
        return <IconButton disabled={unread === 0 || busy !== null} onClick={() => run("read", go)} label="Read" />; }`,
      errors: [error("busy")],
    },
    {
      // A handler by name, and `isPending` started by `setPending`.
      code: `function A() { const [isPending, setPending] = useState(false);
        const save = useCallback(async () => { setPending(true); await post(); }, []);
        return <Button disabled={!ready || isPending} onClick={save}>Save</Button>; }`,
      errors: [error("isPending")],
    },
    {
      // A mutation's own state.
      code: `function A() { const remove = useMutation();
        return <Button disabled={remove.isPending} onClick={() => remove.mutate(id)}>Remove</Button>; }`,
      errors: [error("remove.isPending")],
    },
    {
      code: `function A() { const remove = useMutation();
        return <Button disabled={remove.isPending} onClick={remove.mutateAsync}>Remove</Button>; }`,
      errors: [error("remove.isPending")],
    },
    {
      code: `function A() { const [pending, setPending] = useState(false);
        function submit() { setPending(true); }
        return <Button disabled={pending} onClick={submit}>Send</Button>; }`,
      errors: [error("pending")],
    },
  ],
});

describe("the plugin", () => {
  it("offers the rule, and leaves the recommended config as it was", () => {
    expect(rule).toBeDefined();
    expect(Object.keys(plugin.configs.recommended.rules)).toEqual(["@eifi1/ui-kit/role-utilities"]);
  });
});
