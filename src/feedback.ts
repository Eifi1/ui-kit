// `@eifi1/ui-kit/feedback` — the report form and the parts an inbox is built from.
//
// A re-slicing of the main barrel, not a new API. The kit owns the status vocabulary,
// the transition policy and the look; each app still wires its own API, columns,
// strings and permissions — see the note at the top of feedback/feedback-inbox.tsx.
export * from "./feedback/feedback-attachment";
export * from "./feedback/feedback-dialog";
export * from "./feedback/feedback-inbox";
export * from "./feedback/feedback-thread";
// 0.27.0: the feedback harmonization (docs/feedback-harmonization.md) — one record,
// one menu, dialog, table, detail and crash reporter for keksdose, kastlan, Kurvenschmiede.
export * from "./feedback/feedback-record";
export * from "./feedback/feedback-labels";
export * from "./feedback/feedback-status-undo";
export * from "./feedback/feedback-swipe";
export * from "./feedback/feedback-menu";
export * from "./feedback/feedback-context";
export * from "./feedback/feedback-capture";
export * from "./feedback/feedback-submit";
export * from "./feedback/feedback-table";
export * from "./feedback/feedback-row-detail";
export * from "./feedback/feedback-crash";
// 0.38.0: the public pages (§9.15) — the "Visible to others" switch, the list every user
// reads and one report opened.
export * from "./feedback/feedback-public-switch";
export * from "./feedback/feedback-public-list";
// 0.38.0: public feedback (docs/feedback-harmonization.md §9) — the shapes, the vote, the
// comment thread, the replies' timeline and composer.
export * from "./feedback/feedback-public-types";
export * from "./feedback/feedback-vote-button";
export * from "./feedback/feedback-comment-thread";
export * from "./feedback/feedback-replies";
