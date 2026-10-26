# Adopting `@eifi1/ui-kit` 0.51

ui-kit 0.51 removes the names 0.49 deprecated, brings the dev switchers together in one
`DevMenu`, adds `PublicPage` (the general frame for a public page) and fixes a handful of smaller
things. This guide lists, per change, what each app does, with the places found in keksdose,
kastlan and Kurvenschmiede on 2026-10-26 (`frontend/src`).

**server-kit:** the dev switch learns a "today" override (see the DevMenu section). Pin
`@eifi1/ui-kit` `^0.51` beside the server-kit release named there.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show):
it keeps serving the old kit from `node_modules/.vite/deps` until it restarts.

## Removed: the 0.49 deprecations (breaking)

| Removed | Use |
|---|---|
| `Button` / `buttonClasses` / `IconButton` `variant="primary"` | `variant="default"` (same look) |
| `Button` / `buttonClasses` / `IconButton` `variant="brand"` | `variant="accent"` (same look) |
| `FloatingActionButton` / `FloatingAction` `variant="primary"` | `variant="accent"` (same look) |
| `IMPRINT_PRESET` | `DEFAULT_PRESET` (Imprint is the default) |
| `AppShell` `mobileBarMax` | `mobileMaxItems`, which counts the bar's cells with "More": `mobileBarMax={4}` is `mobileMaxItems={5}` |
| `DEFAULT_MOBILE_BAR_MAX` | `DEFAULT_MOBILE_MAX_ITEMS` (cells, "More" included: one more per size) |

**All three apps: nothing to do.** None of the names is used in keksdose (9dff22b0), kastlan
(1f9b16d) or Kurvenschmiede (8ad43f9), tests included: the apps switched in their 0.49 bump
commits. The development warnings for these names are gone with them.

A JavaScript caller that still passes `variant="primary"` gets no class for the variant (no
error at run time); TypeScript reports it.

## `TourLauncher`'s `engine` stays required (keksdose's 0.50.1 note)

0.50.1 gave `TourLauncher` a required fourth parameter, `engine`, and code that CALLS a
launcher with `(id, opts, start)` stopped compiling (TS2554) in a patch release. That was the
kit's mistake. 0.51 keeps the parameter required anyway: the kit always passes it, and an
optional `engine` would make every launcher that uses it check for `undefined`. Code that
forwards a launcher passes the engine on, as keksdose's AppTourProvider already does:

```ts
const launch = useCallback<TourLauncher>((id, opts, start, engine) => launcher.current?.(id, opts, start, engine), []);
```

**Apps:** nothing to do. keksdose forwards the engine (app-tour-provider.tsx:27); kastlan and
Kurvenschmiede never call a launcher themselves.
