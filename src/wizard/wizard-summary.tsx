import { Pencil } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle, IconButton } from "../components/ui";
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
 */
export function WizardSummary({
  sections,
  onEditStep,
  labels,
}: {
  sections: SummarySection[];
  onEditStep: (stepIndex: number) => void;
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
            <CardAction>
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={l.edit}
                title={l.edit}
                onClick={() => onEditStep(section.stepIndex)}
              >
                <Pencil />
              </IconButton>
            </CardAction>
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
                    <dd className="text-right font-medium text-[var(--text-primary)]">
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
