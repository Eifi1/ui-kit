# Adopting `@eifi1/ui-kit` 0.49 and `eifi1-server-kit` 0.19

ui-kit 0.49 is the design-review round (KIT-1 … KIT-15). This guide lists, per change, what
each app does, with the places found in keksdose, kastlan and Kurvenschmiede on 2026-10-22
(`frontend/src`, production code; line numbers at that date).

## KIT-5: Button variants `default` and `accent` (`primary` and `brand` deprecated)

`variant="primary"` drew the quiet warm chip and `variant="brand"` the solid brand call to
action, so the name promised the opposite of the look. 0.49 adds the names for what they draw:

| Look | New name | Deprecated alias (same look) |
|---|---|---|
| warm filled chip with a hairline border; a Button with no `variant` | `default` | `primary` |
| solid `--brand` with `--brand-contrast` text, the one strong call to action | `accent` | `brand` |

`secondary`, `ghost`, `danger` and `link` do not change. Nothing changes on screen: the aliases
draw exactly the new names. The defaults now carry the new names and never warn: Button,
`Button href`, `buttonClasses()` → `default`; `FormActions.submitVariant` and the wizard's
`finishVariant` → `accent`; `ConfirmDialog` / `DangerConfirm` with `tone="warning"` and the
ErrorBoundary retry → `default`.

`FloatingActionButton.variant` is now `"accent" | "surface"` (default `accent`) and
`FloatingAction.variant` `"default" | "accent"`. Their `"primary"` was always the **solid brand
fill**, so there it is an alias of `accent`, not of `default`.

DEPRECATED: `variant="primary"` and `variant="brand"` on every prop typed `ButtonVariant`
(`variant`, `submitVariant`, `cancelVariant`, `confirmVariant`, `finishVariant`,
`buttonVariant`, `attachmentButtonVariant`, `buttonClasses(…)`) and `variant="primary"` on
`FloatingActionButton` / `FloatingAction`. A development build warns once per component and
name (`[ui-kit] Button variant="brand" is deprecated: use "accent" (same look)`); production
and vitest stay silent. They are removed no earlier than 0.51, and `primary` will not come back
with another meaning: a forgotten site then becomes a type error, never a silent change of look.

### The codemod (component-aware)

A blind `sed` is wrong for one case: `FloatingAction(Button) variant="primary"` must become
`accent`, not `default`. Change those by hand first, then run the rest.

Quick (sed), in `frontend/`:

```sh
# 0) the FAB sites that must NOT become "default" — fix these by hand to variant="accent"
rg -n -U '<FloatingAction(Button)?\b[^>]*variant="primary"' src
# 1) the button-variant props, literal attributes
rg -l --glob '*.tsx' '(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="(primary|brand)"' src \
 | xargs sed -i -E \
   -e 's/\b(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="primary"/\1="default"/g' \
   -e 's/\b(variant|submitVariant|cancelVariant|confirmVariant|finishVariant|buttonVariant|attachmentButtonVariant)="brand"/\1="accent"/g'
# 2) what is left (ternaries, objects, local types): tsc does not flag the aliases, rg does
rg -n '"(primary|brand)"' src | rg -i 'variant'
```

Read the `git diff`: step 1 also rewrites a `variant="brand"` on a component that is not a
button. None of the three apps has one today (Chip and Badge take `tone=`), but check.

Robust (ts-morph, rewrites only button-like tags and the FAB, ternaries included):

```ts
import { Project, SyntaxKind, Node } from "ts-morph";
const BUTTONLIKE = new Set(["Button", "IconButton", "FileButton", "ResendButton", "CopyButton", "ButtonGroup"]);
const FAB = new Set(["FloatingAction", "FloatingActionButton"]);
const PROPS = new Set(["variant", "submitVariant", "cancelVariant", "confirmVariant", "finishVariant", "buttonVariant", "attachmentButtonVariant"]);
const MAP: Record<string, string> = { primary: "default", brand: "accent" };
const p = new Project({ tsConfigFilePath: "tsconfig.app.json" });
for (const sf of p.getSourceFiles("src/**/*.tsx")) {
  sf.getDescendantsOfKind(SyntaxKind.JsxAttribute).forEach((a) => {
    const prop = a.getNameNode().getText();
    if (!PROPS.has(prop)) return;
    const tag = a.getFirstAncestor((n) => Node.isJsxOpeningElement(n) || Node.isJsxSelfClosingElement(n));
    const name = tag && (tag as any).getTagNameNode().getText().split(".").pop();
    const fab = FAB.has(name);
    if (!fab && !BUTTONLIKE.has(name) && prop === "variant") return; // another component's `variant`
    a.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach((s) => {
      const v = s.getLiteralValue();
      if (fab && v === "primary") s.setLiteralValue("accent");
      else if (!fab && MAP[v]) s.setLiteralValue(MAP[v]);
    });
  });
}
p.saveSync();
```

Afterwards the check is the dev console (no `[ui-kit] … is deprecated` line) or the `rg` of
step 2. Implicit buttons (no `variant`) and FormActions without `submitVariant` need nothing.

| App | `variant="primary"` | `submitVariant="primary"` | `variant="brand"` | ternaries / local types | FAB `primary` (→ `accent`!) | Effort |
|---|---|---|---|---|---|---|
| keksdose | 2 Button: `features/translations/kit-showcase-handoff.tsx:67`, `features/reports/tabs/matching-tab.tsx:517` | 18: `budgets/flag-names-card.tsx:84`, `rules/rule-editor.tsx:475`, `accounts/loan-payment-panel.tsx:333`, `accounts/accounts-page.tsx:1130`, `:1163`, `transactions/convert-transfer-control.tsx:186`, `:270`, `invoices/image-cropper.tsx:242`, `invoices/invoice-attach-panel.tsx:188`, `payees/payee-editor.tsx:136`, `admin/support-panel.tsx:730`, `payees/merge-payees-dialog.tsx:94`, `support/support-page.tsx:454`, `payees/transfer-cleanup-modal.tsx:93`, `reports/product-merge-modal.tsx:452`, `assistant/assistant-handoff.tsx:175`, `reports/tabs/matching-tab.tsx:845`, `payees/payee-backfill-modal.tsx:136` (+ the comment at `invoices/image-cropper.tsx:237`) | 9: Button `budgets/budgets-page.tsx:623`, `budgets/guest-key-control.tsx:135`, `budgets/budget-share-card.tsx:224`, `admin/admin-page.tsx:703`, `:782`, `:920`, `admin/users-panel.tsx:240`; IconButton `transactions/mobile-bulk-bar.tsx:91`, `invoices/invoice-lines-bulk-bar.tsx:276` | 0 | **1**: `features/transactions/transactions-page.tsx:860` (FloatingAction) | ≈ 30–45 min; the 51 Buttons without `variant` and 4 FormActions without `submitVariant` stay |
| kastlan | 1: `features/platform/pages/platform-signup-invitations-page.tsx:173` | 0 | 51 (50 Button, mostly the "New" action in `PageHeader actions`, e.g. `accounting/pages/journal-entries-page.tsx:37`; 1 FileButton `property/components/unit-document-gallery.tsx:45`) | 0 | 0 | ≈ 15–20 min, sed is enough |
| Kurvenschmiede | 0 | 0 | 14 Button (e.g. `gear/kinematics-tab.tsx:186`, `setpoint/sessions-page.tsx:182`, `dynamics/exercise.tsx:154`) | 2: `features/dynamics/lesson-valve.tsx:132`, `features/dynamics/lesson-vacuum.tsx:280` | 0 | ≈ 10–15 min (ts-morph or by hand) |

No app uses `buttonClasses(…)`, `FloatingActionButton`, `ConfirmDialog tone="warning"` or
`DangerConfirm tone="warning"`. The `tone="brand"` on Chip, StatTile, Sparkline and friends is a
colour role, not a button variant, and does not change.
