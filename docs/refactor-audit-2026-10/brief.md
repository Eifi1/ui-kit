# Refactor audit 2026-10 — brief for the six auditors

Target: @eifi1/ui-kit at /home/marcel/ui-kit-034 (branch feat/0.34.0, the newest code: 0.33.1 + round 0.34,
committed; docs/archive/adopt/adopt-0.34.md is in progress — ignore it). Apps (read-only, for usage evidence):
/home/marcel/keksdose, /home/marcel/kastlan, /home/marcel/kurvenschmiede.

RULES
- READ-ONLY. Change no file in any repo. No git commands that write (no checkout/stash/commit).
- Don't run the test suite, builds or checks (memory is tight; other sessions run heavy checks). A tiny
  read-only node one-liner or grep/wc is fine. If you must run one targeted test file to prove a bug, first
  run /home/marcel/.claude/projects/-home-marcel-ui-kit/audits/wait-mem.sh 3000.
- Evidence or it didn't happen: every finding cites file:line in ui-kit-034 (and app file:line when usage
  matters). Trace the code path; don't infer from names.
- Don't re-report what's already planned or decided: audits/round-034-candidates.md (incl. "Not yet" and
  0.35 items), audits/round-034/adopt-notes.md "Open" lines. Do check the two earlier audits
  (docs/refactor-plan-2026-08-24.md, docs/module-audit-2026-09-22.md) for items that were deferred or
  regressed, and say so.
- Prefer few, real, actionable findings over many weak ones. Rank by value to the three apps.

FINDING FORMAT (write all findings to your output file, in this format):
### <AREA>-<n> · sev <1-4> · <bug|risk|structure|duplication|consistency|efficiency|tests|docs> · <XS|S|M|L> · <PROVEN|CONFIRMED|PLAUSIBLE> · touches: `file`, `file`
- What: one or two sentences.
- Evidence: file:line refs (and app usage counts where relevant).
- Fix: the concrete change, and its blast radius (public API? apps affected? breaking?).
- Order: what it depends on / must come before.
sev 4 = live defect in an app; 3 = defect reachable / real maintenance cost now; 2 = worth doing; 1 = nice.
PROVEN = shown by running something; CONFIRMED = traced in the code; PLAUSIBLE = likely, not traced to the end.

Output file: /home/marcel/.claude/projects/-home-marcel-ui-kit/audits/refactor-2026-10/<your-area>.md
Start it with a 5-line summary (counts by sev, the top 3). Final message to the main session: ≤ 10 lines.
