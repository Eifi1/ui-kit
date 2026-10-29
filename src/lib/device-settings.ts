import { readSessionStored, readStored, removeStored, storedKeys, writeSessionStored } from "./safe-storage";

/**
 * What this device keeps of how it shows the app, and the one action that puts it all
 * back: "Reset this device's settings" (docs/settings-harmonization.md §11).
 *
 * A registry, because no one part knows every key. The kit's own stores and components
 * join it themselves — the theme, palette, text-size and contrast stores when they are
 * created, `UiKitProvider` (the prefix its tables keep their views under) and `AppShell`
 * (the sidebar's folded state) while they are mounted — and an app adds its own keys
 * beside the store or accessor that owns each (keksdose's date format, kastlan's
 * language, Kurvenschmiede's curve channels). {@link resetDeviceSettings} then clears
 * exactly what joined, and nothing else: the sign-in, the session, what waits to be sent
 * and the account never join (§11.2 decision 2), so a key nobody registered survives.
 *
 * No React and no router: a store joins at module scope, when it is created. Here in
 * `src/lib` beside `safe-storage.ts`, which the stores and the shell already import, so
 * `src/theme` and `src/shell` do not import `src/settings`. One module instance, one
 * module-level list.
 */

/** What a reset of this device's settings clears (§11.2 decision 1): how the app looks
 *  here, and how its tables and panels were left. An app's own list may add a third kind
 *  of its own for what never goes (Kurvenschmiede's "never"). */
export type DeviceSettingKind = "appearance" | "view";

export interface DeviceSetting {
  /** The storage key; with `prefix`, every key that starts with it. */
  key: string;
  /** `true`: `key` is a prefix (a table's views, keksdose's display currency per budget).
   *  It matches by `startsWith`: `budget.displayCurrency.` does not take the legacy
   *  `budget.displayCurrency`. */
  prefix?: boolean;
  /** Default `"local"`. */
  storage?: "local" | "session";
  kind: DeviceSettingKind;
  /**
   * Puts the live value back to its default through the store's own setter, the one its
   * control calls, so whatever that setter also does still happens — never
   * `setState(getInitialState())`, which skips it. REQUIRED for anything held in memory:
   * every persisted zustand store (removing its key alone, it writes its value back on its
   * next change), a mounted component's state. With `reset` the key is left to it (a
   * persisted store writes its default itself); without, the key, or every key under the
   * prefix, is removed — for what is read where it is next used (a table at its mount, a
   * plain accessor).
   */
  reset?: () => void;
}

/** Whoever joined one key, in join order; the last one's entry is the key's entry. */
type Holders = { entry: DeviceSetting }[];

/** One slot per key and storage area, in the order each was first joined. */
const slots = new Map<string, Holders>();

const areaOf = (entry: DeviceSetting): "local" | "session" => (entry.storage === "session" ? "session" : "local");
const slotOf = (entry: DeviceSetting) => `${areaOf(entry)}:${entry.key}`;

/**
 * Join the registry; answers the leave function. A store joins once, at creation, and
 * never leaves; a component joins while mounted and leaves in its effect's cleanup.
 *
 * **One entry per key** (and storage area): joining a key again replaces its entry and
 * adds a holder, and a leave drops its holder — the entry goes with the last one, and
 * until then the latest remaining holder's entry is the key's. So a module evaluated twice
 * (a test, a hot reload) does not reset twice, and two nested providers with one prefix
 * keep their entry until the outer one unmounts.
 */
export function registerDeviceSetting(entry: DeviceSetting): () => void {
  const slot = slotOf(entry);
  const holder = { entry: { ...entry } };
  const holders = slots.get(slot);
  if (holders) holders.push(holder);
  else slots.set(slot, [holder]);
  let left = false;
  return () => {
    if (left) return;
    left = true;
    // A holder that has not left is in its slot: only its own leave takes it out, and a
    // slot goes only once it is empty.
    const current = slots.get(slot) as Holders;
    current.splice(current.indexOf(holder), 1);
    if (current.length === 0) slots.delete(slot);
  };
}

/** Every entry, in join order: for an app's own test (Kurvenschmiede holds it to its
 *  `STORAGE` list) or its privacy page. */
export function deviceSettings(): readonly DeviceSetting[] {
  return [...slots.values()].map((holders) => holders[holders.length - 1].entry);
}

/** Is this a development build? `import.meta.env` is a Vite injection, absent under Node. */
function devBuild(): boolean {
  return Boolean(import.meta.env?.DEV);
}

/** The keys an entry covers now: a prefix's keys found under it, else its own key. */
function keysOf(entry: DeviceSetting): string[] {
  return entry.prefix ? storedKeys(entry.key, areaOf(entry)) : [entry.key];
}

/** Remove what `entry` covers; answers the keys that were there. */
function removeEntry(entry: DeviceSetting): string[] {
  const session = areaOf(entry) === "session";
  const present = keysOf(entry).filter((key) => (session ? readSessionStored(key) : readStored(key)) !== null);
  for (const key of present) {
    if (session) writeSessionStored(key, null);
    else removeStored(key);
  }
  return present;
}

/**
 * Reset every entry, at once; answers the keys it reset or removed, prefixes expanded.
 *
 * Synchronous, in two passes: first every `reset`, in join order, so each live store puts
 * its value back (and writes its default); then the keys of the entries without one. A
 * `reset` that throws is caught (`console.error` in development), its key is removed
 * instead, and the rest still run. It never reloads, navigates or sends a request, and
 * never touches a key nobody registered. Where the browser refuses storage, the live
 * values still reset and nothing throws.
 *
 * The answer: an entry with a `reset` lists its key (a prefix, the keys found under it);
 * an entry without lists the keys it removed, those that were there.
 */
export function resetDeviceSettings(): string[] {
  const keys: string[] = [];
  const remove: DeviceSetting[] = [];
  for (const entry of deviceSettings()) {
    if (!entry.reset) {
      remove.push(entry);
      continue;
    }
    const covered = keysOf(entry);
    try {
      entry.reset();
      keys.push(...covered);
    } catch (error) {
      if (devBuild())
        console.error(`resetDeviceSettings: the reset of "${entry.key}" threw; its key is removed instead.`, error);
      remove.push(entry);
    }
  }
  for (const entry of remove) keys.push(...removeEntry(entry));
  return [...new Set(keys)];
}
