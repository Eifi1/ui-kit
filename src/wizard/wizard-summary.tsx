import { Pencil } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle, IconButton } from "../components/ui";
import { Tooltip } from "../components/tooltip";
import type { SummarySection, WizardLabels } from "./types";
import { DEFAULT_WIZARD_LABELS } from "./types";
import { useKitLabels } from "../i18n/kit-labels";

/**
 * The review step: one card per section, each row a label/value pair, each card
 * carrying an edit button back to the step it came from.
 *
 * Sections are data, not children, because "jump back to step N" is the whole
 * point of the component and a caller assembling its own cards invariably drops
 * it. Labels and values are `ReactNode`, so a value can be a badge or a link.
 *
 * A section with no `stepIndex` (file-level counts, a total) is a card without an
 * edit button. `disabled` greys every edit button at once — while the commit runs,
 * when jumping back would show a step whose edits can no longer reach the request.
 */
export function WizardSummary({
  sections,
  onEditStep,
  disabled = false,
  labels,
}: {
  sections: SummarySection[];
  /** Called with the section's `stepIndex`. Optional only for a summary whose
   *  sections name no step at all. */
  onEditStep?: (stepIndex: number) => void;
  /** Disable every edit button (e.g. `wizard.isSubmitting`). */
  disabled?: boolean;
  labels?: Partial<WizardLabels>;
}) {
  const l = useKitLabels("wizard", DEFAULT_WIZARD_LABELS, labels);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{l.reviewTitle}</h2>
      {sections.map((section, sIdx) => (
        <Card key={sIdx}>
          {/* CardHeader is a grid, and CardAction is the top-right column it
              reserves — the edit button has to go through it or it stacks under
              the title instead of sitting beside it. */}
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.label}</CardTitle>
            {section.stepIndex !== undefined && onEditStep && (
              <CardAction>
                {/* The kit Tooltip, not a native `title`: it shows on keyboard focus too,
                    and an app with a one-tooltip rule (keksdose dev#523) sees one. */}
                <Tooltip label={l.edit}>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label={l.edit}
                    disabled={disabled}
                    onClick={() => onEditStep(section.stepIndex as number)}
                  >
                    <Pencil />
                  </IconButton>
                </Tooltip>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              {section.items.map((item, iIdx) => (
                <div key={iIdx}>
                  {iIdx > 0 && (
                    <div className="mb-2 border-t border-[var(--border)]" role="presentation" />
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[var(--text-muted)]">{item.label}</dt>
                    <dd className="text-end font-medium text-[var(--text-primary)]">
                      {item.value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
