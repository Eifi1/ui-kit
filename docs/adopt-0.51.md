# Adopting `@eifi1/ui-kit` 0.51

ui-kit 0.51 removes the names 0.49 deprecated, brings the dev switchers together in one
`DevMenu`, adds `PublicPage` (the general frame for a public page) and fixes a handful of smaller
things. This guide lists, per change, what each app does, with the places found in keksdose,
kastlan and Kurvenschmiede on 2026-10-26 (`frontend/src`).

**server-kit:** the dev switch learns a "today" override (see the DevMenu section). Pin
`@eifi1/ui-kit` `^0.51` beside the server-kit release named there.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show):
it keeps serving the old kit from `node_modules/.vite/deps` until it restarts.

## `DevMenu`: one dev flask, with the app's own sections (top bar §2.7.1)

New in `@eifi1/ui-kit/shell` (and the barrel): `DevMenu`, with the types `DevMenuProps` and
`DevMenuSection`. It is one `TopBarActionMenu` behind the amber flask. The kit's Account
section comes first: the role group, with "Back to {role}", then the plan group, with the
billing-off note. The app's `sections` follow, each a group under its `title`, in the order
given. It takes every `DevSwitchers` prop unchanged, plus `sections` and `active`. The
contract is docs/top-bar-harmonization.md §2.7.1.

```tsx
<DevMenu<UserRole, DevPlan>
  enabled={import.meta.env.DEV && probe.isSuccess}
  roles={DEV_ROLES}
  currentRole={probe.data?.role}
  onRole={(role) => apply.mutate({ role })}
  plans={DEV_PLANS}
  currentPlan={probe.data?.plan ?? undefined}
  onPlan={(plan) => apply.mutate({ plan })}
  billingOff={!billingEnabled}
  sections={[
    { key: "budget", title: "Budget", entries: BUDGET_ROLES.map((r) => ({ key: r, label: r, checked: r === budgetRole, onSelect: () => pickBudgetRole(r) })) },
    { key: "time", title: "Time", entries: [...timePresets, { key: "custom", label: "Custom…", checked: isCustomDay, onSelect: openDayDialog }] },
    { key: "resets", title: "Resets", entries: [{ key: "tours", label: "Reset tours", onSelect: resetTours }] },
  ]}
  active={todayOverridden}
/>
```

- **The rows are `TopBarMenuEntry`s; there is no dev item type.** A select is radio rows
  (`checked`), a toggle is a `checkable: "checkbox"` row, an action is a plain row. A row's
  key need be unique only within its section.
- **`active`** puts a dot on the flask while an override the developer could forget is on (a
  "today" that is not today, a simulated slow server), and its words join the trigger's name:
  "Dev tools · Role: ADMIN · Plan: free Overrides on". The app decides what counts.
- **The panel scrolls.** Some 25 dev rows ran off a 390×844 phone. The cap is
  `TopBarActionMenu`'s new opt-in, `scrollable` (`100dvh − 4rem`), which any other tall
  menu may use too; without it nothing changes.
- **New words** in all seven catalogues: `topBarParts.dev.menu` ("Dev tools") and
  `topBarParts.dev.overridesOn` ("Overrides on"). An app that writes its own
  `topBarParts.dev` tree gets English for them until it adds them.
- **server-kit:** the menu itself needs nothing new. Its Account section is server-kit
  0.14's `POST /dev/switch`, as before; a "today" override is a server-backed row of the
  app's (rule 3 below).

**The dev-only rules (§2.7.1).** They are the app's to keep; the kit cannot check them.
1. Render the menu only with `enabled = import.meta.env.DEV` AND the probe of the dev route
   (`GET /dev/switch`), as all three apps already do.
2. Put the section DEFINITIONS in a module imported only behind `import.meta.env.DEV`.
   `enabled={false}` hides the menu but leaves the sections' code in the production bundle.
   The constant in front of the `import()` is what drops the chunk:
   ```tsx
   const AppDevMenu = import.meta.env.DEV ? lazy(() => import("./dev-menu")) : null;
   // …
   dev={AppDevMenu && user ? <Suspense fallback={null}><AppDevMenu /></Suspense> : undefined}
   ```
3. Every server-backed dev row (a "today" override, a reset that writes) goes through a route
   behind the same gate as the switch (§6.1): the local flag AND the local-run check,
   otherwise a 404.
4. No form fields in the menu: a free day is a "Custom…" row that opens the app's own dialog.

**Deprecated (removed in 0.52):** `DevSwitchers` → `DevMenu`; `DevSwitchersProps` →
`DevMenuProps`; `DevSwitchersLabels.switchPlan`, which nothing reads now (the one flask is
named by `menu`). **On the bump, `DevSwitchers` draws ONE flask where it drew two.** It is a
`DevMenu` with no sections, so the role and the plan are groups of one menu, and the trigger
is named "Dev tools · Role: ADMIN · Plan: free" instead of "Switch role · Role: ADMIN" and
"Switch plan · Plan: free". The rows, "Back to {role}" and its `sessionStorage` are unchanged.
A test that finds a trigger by "Switch role" or "Switch plan" now finds nothing.

| App | Where | Steps |
|---|---|---|
| keksdose | `app/dev-switchers.tsx:67`: `TopBarDevSwitchers` renders `DevSwitchers<UserRole, DevPlan>`; its slot is `app/top-bar.tsx:166` (`import.meta.env.DEV && user ? … : undefined`), imported statically at `:13`. Its tests `app/__tests__/top-bar.test.tsx:66–67`, `:74–75`, `:85` and `:93` find the triggers by "Switch role · Role: ADMIN" and "Switch plan · Plan: standard" / "Plan: pro". | **In the bump:** those four tests look up the one flask: `/^Dev tools/`, or "Dev tools · Role: ADMIN · Plan: standard" (`:74–75` become one lookup, `:93` is "… · Plan: pro"); `:66–67` become one `queryByRole("button", { name: /^Dev tools/ })`. Then `DevSwitchers` → `DevMenu` (same props). For the budget role, the "today" override and the resets: move `TopBarDevSwitchers` with their definitions into a module loaded by `import.meta.env.DEV ? lazy(…) : null` in `top-bar.tsx` (rule 2), set `active` while "today" is overridden, and route each server-backed row behind `KEKSDOSE_DEV_SWITCH_ENABLED` and the local-run check (rule 3). |
| kastlan | `shared/components/dev/dev-role-switcher.tsx:56`: `DevRoleSwitcher` renders `DevSwitchers<UserRole, Plan>` with a per-company `storageKey`; its slot is `app/top-bar.tsx:201` (`import.meta.env.DEV && <DevRoleSwitcher />`). No test names the triggers. | `DevSwitchers` → `DevMenu`, same props; it draws one flask on the bump either way. No sections needed. Optional: the lazy import of rule 2. |
| Kurvenschmiede | `app/top-bar-parts.tsx:157`: `AppDevSwitchers` renders `DevSwitchers<UserRole, …>`; its slot is `app/top-bar.tsx:75` (`user ? <AppDevSwitchers user={user} /> : undefined`, **not** behind `import.meta.env.DEV`: only `enabled` is). Its test `app/top-bar.test.tsx:192` finds the trigger by `/Switch role/` (`:183`'s `/Dev/` still matches nothing while the gate is shut). | **In the bump:** `:192` looks up `/^Dev tools/`. Then `DevSwitchers` → `DevMenu`, same props. Optional: fill the slot only behind `import.meta.env.DEV` (`import.meta.env.DEV && user ? … : undefined`), as the other two do, so a production build drops the branch. |
