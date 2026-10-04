import { useCallback, useState } from "react";
import {
  FEEDBACK_CATEGORY_ORDER,
  FeedbackCategoryBadge,
  FeedbackStatusBadge,
  FeedbackStatusTransitions,
  ToggleGroup,
  UiKitProvider,
  appendRework,
  reworkCount,
  selectableFeedbackStatuses,
  splitDescription,
  useFeedbackStatusUndo,
  type FeedbackStatus,
  type FeedbackStatusMutate,
  type UiKitLabelOverrides,
} from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.27's feedback foundation (docs/feedback-harmonization.md §5): the status and category
 * words are the kit's, a status change offers Undo, and the body's rework rounds are read
 * and written by the kit. Synthetic data only.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

// The de-CH canon for the two namespaces, as the i18n round will ship it — here only to
// show the provider taking over; an app gets it from the kit's catalogue.
const DE_CH = {
  feedbackStatus: {
    OPEN: "Offen",
    IN_PROGRESS: "In Bearbeitung",
    IN_EVALUATION: "Zur Prüfung",
    NEEDS_LIVE_TEST: "Live testen",
    POSTPONED: "Zurückgestellt",
    DONE: "Erledigt",
    WONT_DO: "Wird nicht umgesetzt",
  },
  feedbackCategory: { CRASH: "Absturz", BUG: "Fehler", IDEA: "Idee", QUESTION: "Frage", OTHER: "Sonstiges" },
} as unknown as UiKitLabelOverrides;

function Pills() {
  const [row, setRow] = useState({ id: 1, title: "Chart jumps on save", status: "IN_EVALUATION" as FeedbackStatus });
  // Stands in for the page's TanStack mutation: the PATCH "lands" at once.
  const mutate = useCallback<FeedbackStatusMutate>((patch, { onSuccess }) => {
    setRow((prev) => ({ ...prev, status: patch.status }));
    onSuccess();
  }, []);
  const changeStatus = useFeedbackStatusUndo(mutate);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {FEEDBACK_CATEGORY_ORDER.map((category) => (
          <FeedbackCategoryBadge key={category} category={category} />
        ))}
        <FeedbackStatusBadge status={row.status} />
      </div>
      <FeedbackStatusTransitions
        status={row.status}
        statuses={selectableFeedbackStatuses(row.status)}
        canEdit
        variant="pill"
        onPick={(status) => changeStatus(row, status)}
      />
    </div>
  );
}

export function FeedbackRecord027Demo() {
  const [lang, setLang] = useState<"en" | "de-CH">("en");
  const body =
    appendRework(
      "The chart jumps when I save.",
      "Still jumps after the fix.",
      "/api/v1/feedback/attachments/000000000000.png",
      new Date("2026-10-04T09:12:00Z"),
    ) ?? "";
  const { description, appended } = splitDescription(body);
  return (
    <>
      <Example
        label="Status and category in the kit's words, with Undo"
        hint="no label passed anywhere — pick a status and the toast offers the old one back for 8 s"
      >
        <div className="flex flex-col gap-3">
          <ToggleGroup
            aria-label="Language"
            value={lang}
            onChange={(v) => setLang(v as "en" | "de-CH")}
            options={[
              { value: "en", label: "English" },
              { value: "de-CH", label: "Deutsch (CH)" },
            ]}
          />
          <UiKitProvider labels={lang === "de-CH" ? DE_CH : undefined}>
            <Pills />
          </UiKitProvider>
        </div>
        <Note>
          {code("FeedbackStatusBadge")}, {code("FeedbackCategoryBadge")} and {code("FeedbackStatusTransitions")} read
          the {code("feedbackStatus")} / {code("feedbackCategory")} namespaces when no {code("label")} is passed, so an
          app drops its {code("STATUS_LABEL")} map. {code("useFeedbackStatusUndo(update.mutate)")} wraps one status
          PATCH in the toast trio; the table, the row detail and the phone swipes all go through it.
        </Note>
      </Example>
      <Example label="The body's rework rounds" hint="appendRework writes them, reworkCount counts them, splitDescription keeps them out of the editor">
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-[var(--bg-surface-2)] p-2 font-mono">{body}</pre>
          <div className="flex flex-col gap-1">
            <div>
              {code("reworkCount")}: {reworkCount(body)}
            </div>
            <div>
              {code("description")}: {description}
            </div>
            <div className="break-all">
              {code("appended")}: {appended.split("\n")[0]} …
            </div>
          </div>
        </div>
      </Example>
    </>
  );
}
