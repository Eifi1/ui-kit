import { useEffect, useState, useSyncExternalStore } from "react";
import type { CSSProperties, MouseEvent, ReactElement, ReactNode } from "react";
import { useKitLabels } from "../i18n/kit-labels";
import { useMediaQuery } from "../hooks/use-media-query";
import { PHONE_QUERY } from "./ui";

/**
 * The kit's toast layer: a `toast` API and a `<Toaster>`, over sonner.
 *
 * WHY A WRAPPER AND NOT "USE SONNER". Both apps mounted sonner by hand and carried the
 * same policy in it — bottom-centre on a phone so the toast covers neither the header
 * nor the bottom nav, a lift above that nav, swipe in every direction, a z-index above
 * every overlay, the theme fed in from the store — and one of them wrote that policy
 * twice. `toast` mirrors sonner's call shape, so migrating is an import swap:
 *
 *     import { toast } from "@eifi1/ui-kit";   // was: from "sonner"
 *
 * WHY SONNER IS LOADED LAZILY. It is an OPTIONAL peer, and this module is re-exported by
 * the barrel: a static import here would make every app that imports a Button install
 * it (see optional-peer-imports.test.tsx). So nothing here imports it statically. The
 * `<Toaster>` loads it when it mounts — long before anyone clicks anything — and a call
 * made before that is queued and replayed in order the moment it has loaded. Every call
 * returns its id synchronously anyway: the id is chosen here, not by sonner.
 */

type Sonner = typeof import("sonner");
type SonnerData = NonNullable<Parameters<Sonner["toast"]>[1]>;

/* ── Loading sonner ──────────────────────────────────────────────────────── */

let sonner: Sonner | null = null;
let loading: Promise<Sonner | null> | null = null;
const queue: Array<(s: Sonner) => void> = [];

function loadSonner(): Promise<Sonner | null> {
  loading ??= import("sonner").then(
    (mod) => {
      sonner = mod;
      // Flushed in the SAME callback that sets `sonner`, so a call arriving between
      // the two cannot overtake one that was queued before it.
      for (const fn of queue.splice(0)) fn(mod);
      return mod;
    },
    () => {
      queue.length = 0;
      console.warn(
        "@eifi1/ui-kit: `toast` needs the optional peer `sonner` — install it (npm i sonner) to show toasts.",
      );
      return null;
    },
  );
  return loading;
}

function withSonner(fn: (s: Sonner) => void): void {
  if (sonner) {
    fn(sonner);
    return;
  }
  queue.push(fn);
  void loadSonner();
}

let counter = 0;
const nextId = () => `kit-toast-${++counter}`;

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** The words the toast layer says. `close` and `notifications` are read by a screen
 *  reader (the close button's name, the toast region's name); `undo` and `redo` are
 *  the default action labels of {@link toast.undo} / {@link toast.redo}. */
export interface ToastLabels {
  close: string;
  notifications: string;
  undo: string;
  redo: string;
}

export const DEFAULT_TOAST_LABELS: ToastLabels = {
  close: "Close notification",
  notifications: "Notifications",
  undo: "Undo",
  redo: "Redo",
};

/** What the mounted `<Toaster>` resolved from `<UiKitProvider>` — so `toast.undo()`,
 *  which is called from mutation callbacks and not from a component, still says
 *  "Rückgängig" in a German app. */
let activeLabels: ToastLabels = DEFAULT_TOAST_LABELS;

/* ── The API ─────────────────────────────────────────────────────────────── */

export type ToastId = string | number;

/** A button on the toast. Clicking it dismisses the toast, unless `onClick` calls
 *  `event.preventDefault()`. */
export interface ToastAction {
  label: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export interface ToastOptions {
  /** Re-using an id REPLACES the toast on screen with that id (in place — it does not
   *  stack a second one), which is how a toast is updated. Default: a fresh id. */
  id?: ToastId;
  description?: ReactNode;
  action?: ToastAction;
  /** A second, quieter button (sonner's `cancel`). */
  cancel?: ToastAction;
  /** Milliseconds; `Infinity` keeps it until dismissed. Default 4s — or
   *  {@link TOAST_ACTION_DURATION} when there is an `action`, so there is time to
   *  read the message AND reach the button. */
  duration?: number;
  /** Called when the toast is closed by the user (close button, swipe, action). */
  onDismiss?: (toast: { id: ToastId }) => void;
  /** Called when the toast times out. */
  onAutoClose?: (toast: { id: ToastId }) => void;
  /** Wrap the message and the description in `data-private`, so an app's demo /
   *  privacy mode blurs them like every other sensitive value. */
  redact?: boolean;
  /** Replaces the tone's icon. */
  icon?: ReactNode;
  /** `false`: no close button, no swipe. */
  dismissible?: boolean;
  /** Per toast, over the `<Toaster>`'s `closeButton`. */
  closeButton?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** The default duration of a toast that carries an action (8s rather than 4s). */
export const TOAST_ACTION_DURATION = 8000;

type Kind = "default" | "success" | "error" | "warning" | "info" | "loading";

const privately = (node: ReactNode) => <span data-private="">{node}</span>;

function toSonnerData(opts: ToastOptions | undefined, id: ToastId): SonnerData {
  const { redact, description, duration, action, ...rest } = opts ?? {};
  const data: SonnerData = { ...rest, id };
  if (description !== undefined) data.description = redact ? privately(description) : description;
  if (action) data.action = action;
  const resolved = duration ?? (action ? TOAST_ACTION_DURATION : undefined);
  if (resolved !== undefined) data.duration = resolved;
  return data;
}

function show(kind: Kind, message: ReactNode, opts?: ToastOptions): ToastId {
  const id = opts?.id ?? nextId();
  const title = opts?.redact ? privately(message) : message;
  const data = toSonnerData(opts, id);
  withSonner((s) => {
    if (kind === "default") s.toast(title, data);
    else s.toast[kind](title, data);
  });
  return id;
}

export interface ToastPromiseOptions<T> extends ToastOptions {
  loading: ReactNode;
  /** The success message, or a function of the resolved value. Omitted: the loading
   *  toast is dismissed. */
  success?: ReactNode | ((value: T) => ReactNode);
  /** The error message, or a function of the rejection. Omitted: dismissed. */
  error?: ReactNode | ((error: unknown) => ReactNode);
  finally?: () => void;
}

export interface ToastUndoOptions extends Omit<ToastOptions, "action"> {
  /** Called when the button is pressed. */
  onUndo: () => void;
  /** Default: `toast.undo` from `<UiKitProvider>` ("Undo"). */
  label?: ReactNode;
  /** Default `success` — the step the toast reports worked. */
  tone?: Exclude<Kind, "loading">;
}

export interface ToastRedoOptions extends Omit<ToastUndoOptions, "onUndo"> {
  onRedo: () => void;
}

function undoable(
  message: ReactNode,
  { tone = "success", label, run, ...opts }: Omit<ToastUndoOptions, "onUndo"> & { run: () => void },
  fallback: ReactNode,
): ToastId {
  return show(tone, message, {
    ...opts,
    action: { label: label ?? fallback, onClick: () => run() },
  });
}

/**
 * Show a toast. The same shape as sonner's `toast`, so an app migrates by changing the
 * import: `toast(msg, opts)`, `toast.success` / `error` / `warning` / `info` /
 * `loading`, `toast.promise`, `toast.dismiss`, `toast.custom`. Each returns the toast's
 * id; pass it back as `id` to replace that toast in place.
 *
 * Needs a mounted {@link Toaster}. Messages may be any ReactNode.
 */
export const toast = Object.assign(
  (message: ReactNode, opts?: ToastOptions): ToastId => show("default", message, opts),
  {
    message: (message: ReactNode, opts?: ToastOptions) => show("default", message, opts),
    success: (message: ReactNode, opts?: ToastOptions) => show("success", message, opts),
    error: (message: ReactNode, opts?: ToastOptions) => show("error", message, opts),
    warning: (message: ReactNode, opts?: ToastOptions) => show("warning", message, opts),
    info: (message: ReactNode, opts?: ToastOptions) => show("info", message, opts),
    /** A spinner that does not time out — replace it (same `id`) or dismiss it. */
    loading: (message: ReactNode, opts?: ToastOptions) => show("loading", message, opts),

    /**
     * A loading toast that becomes the success or the error toast, in place, when
     * `promise` settles. Returns the toast's id; the promise itself is the caller's.
     */
    promise<T>(promise: Promise<T> | (() => Promise<T>), options: ToastPromiseOptions<T>): ToastId {
      const { loading: pending, success, error, finally: onFinally, ...opts } = options;
      const id = show("loading", pending, opts);
      const same = { ...opts, id };
      Promise.resolve()
        .then(() => (typeof promise === "function" ? promise() : promise))
        .then(
          (value) => {
            if (success === undefined) toast.dismiss(id);
            else show("success", typeof success === "function" ? success(value) : success, same);
          },
          (reason: unknown) => {
            if (error === undefined) toast.dismiss(id);
            else show("error", typeof error === "function" ? error(reason) : error, same);
          },
        )
        .finally(() => onFinally?.());
      return id;
    },

    /** Close one toast, or every toast when `id` is omitted. */
    dismiss(id?: ToastId): void {
      withSonner((s) => s.toast.dismiss(id));
    },

    /** Render your own node in a toast slot — `render` receives the id to dismiss it. */
    custom(render: (id: ToastId) => ReactElement, opts?: Omit<ToastOptions, "redact">): ToastId {
      const id = opts?.id ?? nextId();
      const data = toSonnerData(opts, id);
      withSonner((s) => s.toast.custom(render, data));
      return id;
    },

    /**
     * "Deleted — Undo": a toast whose action takes the step back, labelled by the
     * provider's `toast.undo`. The journal stays the app's; this is only its toast.
     * Pair with {@link toast.redo} so the step back can itself be taken back.
     */
    undo(message: ReactNode, { onUndo, ...opts }: ToastUndoOptions): ToastId {
      return undoable(message, { ...opts, run: onUndo }, activeLabels.undo);
    },

    /** {@link toast.undo}'s mirror: the action is labelled `toast.redo`. */
    redo(message: ReactNode, { onRedo, ...opts }: ToastRedoOptions): ToastId {
      return undoable(message, { ...opts, run: onRedo }, activeLabels.redo);
    },
  },
);

/* ── The Toaster ─────────────────────────────────────────────────────────── */

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ToastSwipeDirection = "top" | "right" | "bottom" | "left";

/** sonner's offset: one value for every edge, or per edge. Numbers are px. */
export type ToasterOffset =
  | string
  | number
  | { top?: string | number; right?: string | number; bottom?: string | number; left?: string | number };

export interface ToasterProps {
  /** Default: `bottom-center` on a phone (so the toast covers neither the header's
   *  buttons nor the bottom nav's), `top-center` from `md` up. */
  position?: ToastPosition;
  /** The height to keep clear at the bottom — AppShell's bottom nav. Default: its
   *  measured `--app-nav-h`, so nothing has to be passed under an AppShell. The safe
   *  area is added either way. Numbers are px. */
  navOffset?: string | number;
  /** Default: follows the `.dark` class the kit's theme store (`useApplyTheme`) puts
   *  on `<html>` — whichever store the app built, with nothing passed. */
  theme?: "light" | "dark" | "system";
  labels?: Partial<ToastLabels>;
  /** Default 4s (8s for a toast with an action). */
  duration?: number;
  visibleToasts?: number;
  expand?: boolean;
  /** Default true. */
  closeButton?: boolean;
  /** Tone-coloured toasts (the AlertBanner tokens). Default true. */
  richColors?: boolean;
  /** Default: every direction. */
  swipeDirections?: ToastSwipeDirection[];
  /** Overrides the computed offset outright (above the nav on a phone, below a 48px
   *  top bar on desktop). */
  offset?: ToasterOffset;
  /** Below 600px, where sonner switches to its full-width layout. Default: `offset`'s
   *  phone value. */
  mobileOffset?: ToasterOffset;
  /** Keyboard shortcut that moves focus into the toasts. Default Alt+T. */
  hotkey?: string[];
  gap?: number;
  dir?: "ltr" | "rtl" | "auto";
  className?: string;
  style?: CSSProperties;
}

/** The kit's palette, mapped onto sonner's variables. Inline on the toaster element,
 *  so it wins over sonner's injected sheet with no specificity contest. The tone
 *  backgrounds go through `--toast-*` aliases computed at `:root` in tokens.css:
 *  sonner redefines `--success-bg` on this same element, and a variable cannot read
 *  its own name — `--success-bg: var(--success-bg)` here would be a cycle. */
const KIT_TOASTER_STYLE = {
  zIndex: "var(--z-toast, 2147483647)",
  fontFamily: "inherit",
  "--normal-bg": "var(--bg-surface)",
  "--normal-bg-hover": "var(--bg-hover)",
  "--normal-border": "var(--border)",
  "--normal-border-hover": "var(--border-strong)",
  "--normal-text": "var(--text-primary)",
  "--gray2": "var(--bg-hover)",
  "--gray5": "var(--border-strong)",
  "--gray11": "var(--text-muted)",
  "--success-bg": "var(--toast-success-bg)",
  "--success-border": "var(--toast-success-border)",
  "--success-text": "var(--success)",
  "--info-bg": "var(--toast-info-bg)",
  "--info-border": "var(--toast-info-border)",
  "--info-text": "var(--info)",
  "--warning-bg": "var(--toast-warning-bg)",
  "--warning-border": "var(--toast-warning-border)",
  "--warning-text": "var(--warning)",
  "--error-bg": "var(--toast-danger-bg)",
  "--error-border": "var(--toast-danger-border)",
  "--error-text": "var(--danger)",
} as CSSProperties;

const ALL_DIRECTIONS: ToastSwipeDirection[] = ["top", "right", "bottom", "left"];

/** Light or dark, as the `.dark` class on `<html>` says right now. */
function readDocumentTheme(): "light" | "dark" {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

function subscribeDocumentTheme(onChange: () => void): () => void {
  if (typeof MutationObserver === "undefined") return () => {};
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

const px = (v: string | number) => (typeof v === "number" ? `${v}px` : v);

/**
 * Where the toasts appear, with the kit's defaults — mount ONE, near the root and
 * inside `<UiKitProvider>` (it reads the `toast` labels) and inside the router if a
 * toast's content navigates.
 *
 * Accessible as sonner makes it: the toasts sit in a polite live region, so a message
 * is announced with its description and its action's label; every toast and every
 * button in it is focusable, the timer pauses while focus or the pointer is inside,
 * and Alt+T ({@link ToasterProps.hotkey}) moves focus to the newest toast. A toast
 * with an action stays up 8s by default, so the button can be reached.
 */
export function Toaster({
  position,
  navOffset,
  theme,
  labels: labelsProp,
  closeButton = true,
  richColors = true,
  swipeDirections = ALL_DIRECTIONS,
  offset,
  mobileOffset,
  className,
  style,
  ...rest
}: ToasterProps) {
  const [mod, setMod] = useState<Sonner | null>(sonner);
  useEffect(() => {
    if (mod) return;
    let live = true;
    void loadSonner().then((m) => {
      if (live && m) setMod(m);
    });
    return () => {
      live = false;
    };
  }, [mod]);

  const labels = useKitLabels("toast", DEFAULT_TOAST_LABELS, labelsProp);
  useEffect(() => {
    activeLabels = labels;
    return () => {
      if (activeLabels === labels) activeLabels = DEFAULT_TOAST_LABELS;
    };
  }, [labels]);

  const documentTheme = useSyncExternalStore(subscribeDocumentTheme, readDocumentTheme, () => "light" as const);
  const phone = useMediaQuery(PHONE_QUERY, false);
  const resolved: ToastPosition = position ?? (phone ? "bottom-center" : "top-center");

  // Above the bottom nav and the home indicator: whichever is taller, since the nav
  // already pads itself by the safe area (the same sum BulkActionBar floats on).
  const bottom = `calc(max(${navOffset === undefined ? "var(--app-nav-h, 0px)" : px(navOffset)}, env(safe-area-inset-bottom, 0px)) + 0.75rem)`;
  // Below a 48px TopBar with the same 1rem clearance.
  const top = "calc(env(safe-area-inset-top, 0px) + 4rem)";
  const computed = resolved.startsWith("bottom") ? { bottom } : { top };

  if (!mod) return null;
  const Sonner = mod.Toaster;
  return (
    <Sonner
      {...rest}
      position={resolved}
      theme={theme ?? documentTheme}
      closeButton={closeButton}
      richColors={richColors}
      swipeDirections={swipeDirections}
      offset={offset ?? computed}
      mobileOffset={mobileOffset ?? offset ?? computed}
      containerAriaLabel={labels.notifications}
      toastOptions={{ closeButtonAriaLabel: labels.close }}
      className={className ? `kit-toaster ${className}` : "kit-toaster"}
      style={{ ...KIT_TOASTER_STYLE, ...style }}
    />
  );
}
