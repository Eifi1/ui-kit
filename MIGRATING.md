# Migrating from `@hb/ui` to `@eifi1/ui-kit`

The design system moved from a git submodule consumed over a `file:` path to a
published npm package.

| | before | after |
|---|---|---|
| repo | `Eifi1/hb-ui` (private) | `Eifi1/ui-kit` (public) |
| package | `@hb/ui` 0.3.0, `private: true` | `@eifi1/ui-kit` 0.4.0 on npmjs.com |
| ships | raw `src/*.tsx` | compiled ESM + `.d.ts` from `dist/` |
| obtained by | submodule, or a `file:` path into a sibling checkout | `npm install` |
| auth | `HB_UI_SUBMODULE_TOKEN` in every consumer's CI | none — the package is public |

**Why.** Two of the four consumers had no submodule at all and resolved
`file:../../keksdose/packages/ui` — a path into a neighbouring clone. Their CI
worked around it by cloning `hb-ui` at `--depth 1` into a fabricated
`../keksdose/packages/ui` directory, which pulls whatever `main` points at that
minute. Nothing recorded which design-system commit a given build used, so
builds were not reproducible and a UI regression could not be bisected. A
published package pins a version in each app's lockfile instead.

---

## Starting state per repo

Each repo starts somewhere different. Find yours.

| repo | dependency | submodule | CI obtains the package by |
|---|---|---|---|
| ~~kastlan~~ | ~~`file:../packages/ui`~~ | ~~yes~~ | **migrated** — use it as the worked example |
| **keksdose** | `"*"` (npm workspace) | yes | `git submodule update --init` (PAT) |
| **lenkbank** | `file:../../keksdose/packages/ui` | **no** | shallow clone into a fake sibling path (PAT) |
| ~~aspice-atlas~~ | — | — | **legacy, unmaintained** (see below) |

`steering-design` is a symlink to `lenkbank` and needs nothing of its own.

**aspice-atlas is legacy and no longer maintained** (decided 2026-09-24). It was never
migrated: it still declares `file:../../keksdose/packages/ui`, and its CI used to
shallow-clone the private `hb-ui` repository with `HB_UI_SUBMODULE_TOKEN`. That secret has
been deleted from the repository and the token behind it revoked, so its CI can no longer
fetch the design system at all — expected, and not something to repair.

If it is ever revived, it is migrated like the others (the steps below) onto the published
`@eifi1/ui-kit`, which needs no token — not reconnected to `hb-ui`. Releases here do not
have to consider it.

---

## Steps

### 1. Swap the dependency

In the `package.json` that currently declares `@hb/ui` (usually `frontend/`):

```diff
-  "@hb/ui": "file:../../keksdose/packages/ui",
+  "@eifi1/ui-kit": "^0.4.0",
```

**keksdose only:** it declares `"@hb/ui": "*"` and lists `packages/*` in its
root `workspaces`. Remove `packages/ui` from `workspaces` as well, or npm keeps
preferring the local copy over the registry one and the migration silently does
nothing.

Then `npm install` and commit the lockfile.

### 2. Rewrite the imports

Mechanical, and the only large edit. From the repo root:

```bash
grep -rl '@hb/ui' --include='*.ts' --include='*.tsx' --include='*.css' \
     --include='*.json' . | grep -v node_modules | grep -v '^./packages/ui' \
  | xargs sed -i 's#@hb/ui#@eifi1/ui-kit#g'
```

Covers `from "@hb/ui"`, the `@hb/ui/dates` subpath, and
`@import "@hb/ui/tokens.css"` alike. Check the diff before committing — the
string also appears in prose comments, where replacing it is correct but worth
eyeballing.

### 2b. Repoint the Tailwind `@source` scan — the step the `sed` cannot do

**Do not skip this. Both apps that have already migrated skipped it, and both are
currently rendering the kit unstyled.**

The `sed` above rewrites every `@hb/ui` specifier, but the `@source` line in your
main CSS does not contain that string — it points at a *path*, and under `file:`
that path was the submodule working tree:

```diff
  @import "@eifi1/ui-kit/tokens.css";
- @source "../../packages/ui/src";
+ @source "../../node_modules/@eifi1/ui-kit/dist";
```

After the migration `packages/ui` is gone, so the scan matches nothing. Tailwind
does not warn about an `@source` that resolves to no files, and the app still
builds, still runs and is still fully interactive — it is simply unpainted
wherever a class came from the kit rather than from your own code. That reads as
"the design system is broken", which is why it has survived two migrations.

The path is relative to **the CSS file it is written in**. Confirm it landed:

```bash
npm run build && grep -c 'pointer-events-auto' dist/assets/*.css   # 0 = still missing
```

`pointer-events-auto` is emitted by the kit's overlays and by little else, so a
zero here means the scan is not reaching the package. `dist` is the path to use:
it is published by every version of the package.

### 3. Delete the workarounds that existed only because of `file:`

This is the part that is easy to miss, because everything still *works* if you
skip it. These were compensating for a symlinked source package, and now
compensate for nothing.

**`frontend/tsconfig.json` — remove the singleton `paths` mappings.** They look
like this, under a comment about a "SIBLING repository":

```jsonc
"paths": {
  "@/*": ["./src/*"],
  "react": ["../node_modules/@types/react"],          // ← delete
  "react/jsx-runtime": ["../node_modules/@types/react/jsx-runtime"], // ← delete
  "react-dom": ["../node_modules/@types/react-dom"],  // ← delete
  "react-router": ["../node_modules/react-router"],   // ← delete
  "recharts": ["../node_modules/recharts"],           // ← delete
  "sonner": ["../node_modules/sonner"],               // ← delete
  "zustand": ["../node_modules/zustand"],             // ← delete
  "lucide-react": ["../node_modules/lucide-react"]    // ← delete
}
```

Keep `"@/*"`. The rest existed because a symlinked package resolves its own
`import "react"` upward from *its* location — into the sibling repo's
`@types/react` — leaving TypeScript holding two unrelated declarations of every
React type ("two different types with this name exist"). A package installed
from the registry sits in your own `node_modules` and resolves React from your
own tree, so the mappings are inert at best and will hide a genuine version
mismatch at worst.

**`frontend/vite.config.ts` — keep `resolve.dedupe`, fix its comment.** The
dedupe list itself is still cheap insurance against two React copies arriving
via a transitive version mismatch. But its comment says `@hb/ui` "is a linked
source package", which is no longer true; leave the code, rewrite the reason.

### 4. Remove the submodule (kastlan and keksdose only)

```bash
git submodule deinit -f packages/ui
git rm -f packages/ui
rm -rf .git/modules/packages/ui
git rm -f .gitmodules          # only if ui-kit was the sole submodule
```

Work on the design system in its own clone at `/home/marcel/ui-kit` instead.

### 5. Simplify CI

Delete the step that obtains the package — whichever shape it takes:

- the `git submodule update --init --recursive` step plus its
  `git config url.insteadOf` line (kastlan, keksdose);
- the "Stage the shared design system" / shallow-clone-into-`../keksdose` step
  and its token pre-check (lenkbank, aspice-atlas).

`npm ci` now installs the package from the public registry with no credential.
Also drop `persist-credentials: false` from `actions/checkout` if it was only
there to keep the PAT out of git config.

Then delete the now-unused secret:

```bash
gh secret delete HB_UI_SUBMODULE_TOKEN --repo Eifi1/<repo>
```

---

## Verify

```bash
npm ci          # must succeed with no token and no sibling checkout present
npm run typecheck
npm test
npm run build
npm run lint
```

Two checks worth doing by hand, because nothing above catches them:

1. **`grep -rn '@hb/ui' . | grep -v node_modules` returns nothing.** A missed
   import fails the build loudly; a missed string in a CI file or a comment does
   not.
2. **The bundle did not grow.** Compare `dist/assets/*.js` sizes before and
   after. The package is built non-bundled specifically so `sideEffects` can
   still drop unused modules; if an entry chunk suddenly gains ~400 KB, it is
   recharts arriving through the barrel and it is a bug in the package, not in
   your app — open an issue at `Eifi1/ui-kit`.

---

## Working on the design system after this

It is a normal repo now:

```bash
cd /home/marcel/ui-kit
git checkout -b feat/whatever
npm run build && npm test
```

To try a change against an app before publishing, link it rather than
reintroducing a `file:` path:

```bash
cd /home/marcel/ui-kit && npm link
cd /home/marcel/<app>/frontend && npm link @eifi1/ui-kit
# undo with: npm unlink @eifi1/ui-kit && npm install
```

Releases are tag-driven: `npm version patch|minor|major` then
`git push --follow-tags`. The workflow refuses to publish when the tag and
`package.json` disagree.

Consumers then upgrade on their own schedule — which is the whole point of the
move, and the thing the `file:` path made impossible.
