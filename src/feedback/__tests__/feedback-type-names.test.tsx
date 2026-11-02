import { describe, expectTypeOf, it } from "vitest";
import type {
  FeedbackCategoryOption,
  FeedbackDialogProps,
  FeedbackMultipleSubmission,
  FeedbackSubmission,
} from "../feedback-dialog";
import type { FeedbackDialog } from "../feedback-dialog";
import type { FeedbackCategory } from "../feedback-vocabulary";

/**
 * The feedback parts' type names (refactor audit 2026-10-30): FeedbackDialog is generic
 * over its category, `string` by default (API-7). Type-level only — `tsc` is what reads
 * these. (ChatComposer's `FeedbackComposer*` aliases, API-6, went in 0.53.)
 */

describe("FeedbackDialog's category (API-7)", () => {
  it("is a string by default, as before", () => {
    expectTypeOf<FeedbackSubmission["category"]>().toEqualTypeOf<string>();
    expectTypeOf<FeedbackMultipleSubmission["category"]>().toEqualTypeOf<string>();
    expectTypeOf<FeedbackDialogProps["onCategoryChange"]>().parameter(0).toEqualTypeOf<string>();
  });

  it("hands the app's own category type back, no cast", () => {
    type Props = FeedbackDialogProps<FeedbackCategory>;
    expectTypeOf<Props["onCategoryChange"]>().parameter(0).toEqualTypeOf<FeedbackCategory>();
    expectTypeOf<FeedbackMultipleSubmission<FeedbackCategory>["category"]>().toEqualTypeOf<FeedbackCategory>();
    // Inferred from the props: `categories` is readonly, as the kit's own list is.
    const categories: readonly FeedbackCategoryOption<FeedbackCategory>[] = [{ value: "BUG", label: "Bug" }];
    expectTypeOf(categories).toMatchTypeOf<Props["categories"]>();
    expectTypeOf<typeof FeedbackDialog<FeedbackCategory>>().parameter(0).toEqualTypeOf<Props>();
  });
});
