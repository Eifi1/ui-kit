// `@eifi1/ui-kit/pending-not-disabled` — a pressed button that turns natively `disabled`
// while the request its click started runs (refactor audit 2026-11-22, INP-1).
//
// The button being pressed is the one that holds the focus, and a browser drops the focus
// of a button that turns `disabled` to <body>: a screen reader's cursor jumps to the top
// of the page, and in a dialog the focus is outside its trap for the whole save. Button's
// `pending` (and IconButton's) is `aria-disabled` with the press swallowed, and
// `refused` holds a button without a spinner. The audit found the pattern in the kit's
// own FormActions, DangerConfirm, ReauthDialog, CameraCapture and NotificationInbox, and
// in eleven flow-module sites, after the 2026-10-30 round had fixed the pickers.
//
// Reported: `disabled={…}` on a `<Button>` or `<IconButton>` that names a pending or busy
// state (`busy`, `isPending`, `save.isPending`, `busy !== null`, `saving`, `capturing`:
// pending, busy or an "-ing" name) when the same element's
// `onClick` STARTS that state — it calls the state's setter (`setBusy`), the mutation's
// `mutate`/`mutateAsync` (`save.isPending` ← `save.mutate()`), or a function of the file
// that does, three calls deep. A Cancel beside it, disabled by the same `busy` but not
// starting it, is not reported: it does not hold the focus when the state arrives.
//
// Erasable TypeScript, importing nothing, like role-utilities.ts: the kit's own
// eslint.config.js imports it from source under Node's type stripping, and the plugin
// ships it to an app's ESLint. The few ESTree and scope types it reads are written out.

/** The part of an ESTree node the rule reads; every other key is walked generically. */
interface Node {
  type: string;
  [key: string]: unknown;
}

interface Variable {
  /** `type` is the definition's kind: a parameter's `node` is its whole function. */
  defs: { type: string; node: Node }[];
}

interface Scope {
  set: Map<string, Variable>;
  upper: Scope | null;
}

interface PendingContext {
  sourceCode: object;
  report(descriptor: { node: Node; messageId: string; data: Record<string, string> }): void;
}

export interface PendingNotDisabledRule {
  meta: {
    type: "problem";
    docs: { description: string; url: string };
    schema: [];
    messages: { pendingNotDisabled: string };
  };
  create(context: PendingContext): { JSXOpeningElement(node: Node): void };
}

const BUTTONS = new Set(["Button", "IconButton"]);
/** A request's state by its name: `pending`, `busy`, and the progressive forms — `saving`,
 *  `isLoading`, `capturing` (FeedbackAttachmentField's camera button, 0.66). A name that
 *  ends in "-ing" and that the click sets is a button disabling itself in any case. */
const STATE = /pending|busy|ing$/i;
const MUTATE = /^mutate(Async)?$/;
/** How many calls into the file's own functions the click is followed: `onClick={() =>
 *  run("read")}` → `run` → `setBusy(…)` is two. */
const DEPTH = 3;

/** A pending state the `disabled` expression names: a plain name, or `object.property`. */
type State = { name: string; object?: string };

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && typeof (value as Node).type === "string";
}

/** Every node under `root`, itself included; `parent` (ESLint's back link) is skipped. */
function* walk(root: Node): Generator<Node> {
  yield root;
  for (const key of Object.keys(root)) {
    if (key === "parent") continue;
    const value = root[key];
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) yield* walk(item);
    } else if (isNode(value)) {
      yield* walk(value);
    }
  }
}

/** `a.b.c` for a chain of plain names and non-computed members; `null` for anything else. */
function dotted(node: Node): string | null {
  if (node.type === "Identifier") return node.name as string;
  if (node.type === "ThisExpression") return "this";
  if (node.type === "MemberExpression" && !node.computed && isNode(node.property)) {
    const object = isNode(node.object) ? dotted(node.object) : null;
    return object === null ? null : `${object}.${node.property.name as string}`;
  }
  return null;
}

/** The pending states `disabled={…}` names. A name that is a member's object
 *  (`busyRows.size`) is not one; its property is read in its own right. */
function statesIn(expression: Node): State[] {
  const states: State[] = [];
  const objects = new Set<Node>();
  for (const node of walk(expression)) {
    if (node.type === "MemberExpression" && !node.computed && isNode(node.object) && isNode(node.property)) {
      objects.add(node.object);
      const name = node.property.name as string;
      const object = dotted(node.object);
      if (STATE.test(name) && object !== null) states.push({ name, object });
    }
  }
  for (const node of walk(expression)) {
    if (node.type === "Identifier" && !objects.has(node) && STATE.test(node.name as string)) {
      // A member's property is an Identifier too: only a name that stands alone.
      const parent = node.parent as Node | undefined;
      if (parent?.type === "MemberExpression" && parent.property === node && !parent.computed) continue;
      states.push({ name: node.name as string });
    }
  }
  return states;
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** `busy` → `setBusy`; `isPending` → `setIsPending` and `setPending`. */
function setters(name: string): string[] {
  const own = `set${capital(name)}`;
  return /^is[A-Z]/.test(name) ? [own, `set${name.slice(2)}`] : [own];
}

function resolve(scope: Scope | null, name: string): Variable | undefined {
  for (let at = scope; at; at = at.upper) {
    const found = at.set.get(name);
    if (found) return found;
  }
  return undefined;
}

/** The function a name stands for in this file: a declaration, a `const f = () => …`, or
 *  a `const f = useCallback(() => …, […])`. */
function functionOf(variable: Variable | undefined): Node | null {
  // A prop (`onClose`) is a "Parameter" definition, whose node is the component itself:
  // what the parent hands in is not this file's to read.
  const [first] = variable?.defs ?? [];
  if (!first || (first.type !== "FunctionName" && first.type !== "Variable")) return null;
  const def = first.node;
  if (def.type === "FunctionDeclaration") return def;
  if (def.type !== "VariableDeclarator" || !isNode(def.init)) return null;
  const init = def.init;
  if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") return init;
  if (init.type === "CallExpression" && Array.isArray(init.arguments) && isNode(init.arguments[0])) {
    const first = init.arguments[0];
    if (first.type === "ArrowFunctionExpression" || first.type === "FunctionExpression") return first;
  }
  return null;
}

/** `setBusy(false)`, `setPending(null)`: a setter call that ENDS the state (or clears a
 *  pending value, like an email change awaiting its link) starts nothing. */
function ends(call: Node): boolean {
  const [arg] = (call.arguments as Node[]) ?? [];
  if (!isNode(arg)) return true;
  if (arg.type === "Identifier") return arg.name === "undefined";
  return arg.type === "Literal" && (arg.value === false || arg.value === null);
}

/** Whether running `fn` starts `state`, following the file's own functions `depth` deep. */
function starts(fn: Node, state: State, scope: Scope | null, depth: number, seen: Set<Node>): boolean {
  if (seen.has(fn)) return false;
  seen.add(fn);
  const names = state.object === undefined ? setters(state.name) : [];
  for (const node of walk(fn)) {
    if (node.type !== "CallExpression" || !isNode(node.callee)) continue;
    const callee = node.callee;
    if (callee.type === "Identifier") {
      const name = callee.name as string;
      if (names.includes(name) && !ends(node)) return true;
      if (depth > 0) {
        const inner = functionOf(resolve(scope, name));
        if (inner && starts(inner, state, scope, depth - 1, seen)) return true;
      }
    } else if (
      state.object !== undefined &&
      callee.type === "MemberExpression" &&
      !callee.computed &&
      isNode(callee.property) &&
      MUTATE.test(callee.property.name as string) &&
      isNode(callee.object) &&
      dotted(callee.object) === state.object
    ) {
      return true;
    }
  }
  return false;
}

function hasAttribute(element: Node, name: string): boolean {
  return (element.attributes as Node[]).some(
    (attr) => attr.type === "JSXAttribute" && isNode(attr.name) && attr.name.name === name,
  );
}

/** The attribute `name` of a JSX element, when it is an `{expression}`. */
function attribute(element: Node, name: string): Node | null {
  for (const attr of element.attributes as Node[]) {
    if (attr.type !== "JSXAttribute" || !isNode(attr.name) || attr.name.name !== name) continue;
    const value = attr.value;
    if (isNode(value) && value.type === "JSXExpressionContainer" && isNode(value.expression)) {
      return value.expression.type === "JSXEmptyExpression" ? null : value.expression;
    }
    return null;
  }
  return null;
}

export const pendingNotDisabled: PendingNotDisabledRule = {
  meta: {
    type: "problem",
    docs: {
      description: "A pressed button that its own click turns natively `disabled` drops the focus to <body>",
      url: "https://github.com/Eifi1/ui-kit/blob/main/src/eslint/pending-not-disabled.ts",
    },
    schema: [],
    messages: {
      pendingNotDisabled:
        "`disabled` by `{{state}}`, which this button's click starts, drops the focus of the pressed button to <body> (out of a dialog's trap, too). Hold it with `pending={…}` (a spinner) or `refused={…}`: aria-disabled, the press swallowed.",
    },
  },
  create(context) {
    const source = context.sourceCode as { getScope?: (node: Node) => Scope };
    return {
      JSXOpeningElement(node) {
        const name = node.name;
        if (!isNode(name) || name.type !== "JSXIdentifier" || !BUTTONS.has(name.name as string)) return;
        const disabled = attribute(node, "disabled");
        const onClick = attribute(node, "onClick");
        if (!disabled || !onClick) return;
        // `pending={busy === "approve"}` beside `disabled={busy !== null}`: Button drops the
        // native `disabled` while pending or refused, so the pressed one is held and its
        // siblings are disabled — which is right, they do not hold the focus.
        if (hasAttribute(node, "pending") || hasAttribute(node, "refused")) return;
        const states = statesIn(disabled);
        if (states.length === 0) return;
        const scope = source.getScope ? source.getScope(node) : null;
        let click: Node | null = null;
        if (onClick.type === "ArrowFunctionExpression" || onClick.type === "FunctionExpression") click = onClick;
        else if (onClick.type === "Identifier") click = functionOf(resolve(scope, onClick.name as string));
        for (const state of states) {
          const startsIt =
            click !== null
              ? starts(click, state, scope, DEPTH, new Set())
              : // `onClick={save.mutate}`, handed over as it is.
                onClick.type === "MemberExpression" &&
                state.object !== undefined &&
                isNode(onClick.property) &&
                MUTATE.test(onClick.property.name as string) &&
                isNode(onClick.object) &&
                dotted(onClick.object) === state.object;
          if (startsIt) {
            context.report({
              node: disabled,
              messageId: "pendingNotDisabled",
              data: { state: state.object === undefined ? state.name : `${state.object}.${state.name}` },
            });
            return;
          }
        }
      },
    };
  },
};
