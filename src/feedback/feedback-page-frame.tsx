import { createContext, useContext } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { PageHeader, type PageHeaderProps } from "../components/page-header";
import { FILL_HEIGHT_CLASS } from "../shell/fill-height";

/**
 * The feedback pages' frame (0.61; Marcel 2026-11-12: "Kurvenschmiede's feedback area should
 * look and work exactly like keksdose's").
 *
 * `/feedback`, `/my-feedback` and `/all-feedback` were the kit's inside since 0.55 and 0.38,
 * but the frame around them was each app's, written twice per app and differently:
 * keksdose `py-4 md:p-6` with a `compact` header inset on the phone
 * (`frontend/src/features/feedback/feedback-page.tsx`, `all-feedback-page.tsx`),
 * Kurvenschmiede its `PAGE_SHELL` (`px-3 py-4 md:px-6`, a flex column with `gap-4`) with a
 * `size="sm"` header. So the same list sat 12px in from the phone's edge in one app and
 * edge to edge in the other, under a title a size smaller. keksdose's is the one kept:
 *
 * - **No side padding on the phone.** The list's cards run edge to edge, as every keksdose
 *   list does: the phone's card rows carry their own 16px inset (DataTable's mobile rows,
 *   `px-4`), so a page gutter would only double it. The header puts the gutter back on
 *   itself (`px-4 md:px-0`), so the title starts where the cards' text does.
 * - **`md:p-6` from md up**, where the table is a bordered card and wants the air.
 * - **The `compact` header** (`text-xl` at every width, page-header.tsx) with `mb-4`, and
 *   `md:shrink-0`: in the fill-height column the header keeps its height and only the
 *   table's body scrolls (page layout §1.3).
 * - **The fill-height column** (`FILL_HEIGHT_CLASS`), so a `fillHeight` table inside
 *   fills the window from md up and nothing else changes.
 *
 * A wrapper rather than a prop on each composite, because it frames more than the kit's
 * composites: `FeedbackInbox`, the public page, and a page an app lays out itself from the
 * parts (`FeedbackPublicList`, `useFeedbackInbox` + `DataTable`). The title has ONE place:
 *
 * - with `title`, the frame draws the header, and a kit page inside draws none;
 * - without it, the frame draws none and hands its header to the kit page inside
 *   ({@link useFeedbackPageFrameHeader}), which draws its own title in it — `FeedbackInbox`
 *   knows whether it is "Feedback inbox" or "My feedback", and an app should not have to
 *   work that out again to frame it.
 */

/** The frame's own padding — keksdose's list pages' frame (`py-4 md:p-6`: Budget,
 *  Transactions, Accounts, Payees, Feedback). */
const FRAME_CLASS = "py-4 md:p-6";
/** The header in it: the phone's gutter the frame leaves out, put back on the header alone;
 *  `md:shrink-0` so the fill-height column never squeezes it. */
const HEADER_CLASS = "mb-4 px-4 md:px-0 md:shrink-0";

/**
 * The header's props, over the frame's (`size="compact"` and its classes, `className`
 * merged after them): an `actions` row, a `description`, `documentTitle`, and a tour
 * anchor — `{ "data-tour": "feedback-header" }`, which is why a `data-*` key is allowed in
 * the object literal (TypeScript accepts one in JSX only).
 */
export type FeedbackPageFrameHeaderProps = Omit<PageHeaderProps, "title"> & {
  [data: `data-${string}`]: string | number | boolean | undefined;
};

export interface FeedbackPageFrameProps extends Omit<ComponentPropsWithRef<"div">, "title"> {
  /**
   * The page's title, drawn as the frame's header. Leave it out around a kit page
   * (`FeedbackInbox`), which draws its own title in the frame's header; give it around
   * anything else (`FeedbackPublicList`, a page of the app's own).
   */
  title?: ReactNode;
  /** Over the header's props — see {@link FeedbackPageFrameHeaderProps}. Also what a kit
   *  page inside draws its header with. */
  headerProps?: FeedbackPageFrameHeaderProps;
  children?: ReactNode;
}

/**
 * Inside a frame, how a kit page draws its DEFAULT header: the frame's (a function of the
 * page's title), or `null` when the frame drew the title itself. `undefined` outside one.
 */
type FrameHeader = ((title: ReactNode) => ReactNode) | null;

const FeedbackPageFrameContext = createContext<FrameHeader | undefined>(undefined);

/**
 * For a kit page composite (`FeedbackInbox`, the public page): what it draws when the app
 * passed no `header` of its own.
 *
 * - `undefined` — not in a frame: the composite's own default.
 * - `null` — the frame drew the title: nothing, or the page would have two.
 * - a function — draw `header(title)`: the frame's header with the page's own title.
 *
 * Internal to the kit (not on the barrel): an app frames a page with
 * {@link FeedbackPageFrame} and has nothing to read.
 */
export function useFeedbackPageFrameHeader(): FrameHeader | undefined {
  return useContext(FeedbackPageFrameContext);
}

/** A title that draws something: `PageHeader`'s own reading (`titled`). */
const isTitled = (title: ReactNode) => title != null && title !== false && title !== "";

/**
 * The frame of a feedback page — `/feedback`, `/my-feedback`, `/all-feedback` — as keksdose
 * draws it: edge to edge on the phone, `md:p-6` from md up, the `compact` header, the
 * fill-height column.
 *
 * ```tsx
 * // A kit page: it draws its own title ("Feedback inbox" / "My feedback") in the header.
 * <FeedbackPageFrame headerProps={{ "data-tour": "feedback-header" }}>
 *   <FeedbackInbox rows={…} mine={mine} canEdit={isAdmin} update={update} … />
 * </FeedbackPageFrame>
 *
 * // Anything else: the frame draws the title.
 * <FeedbackPageFrame title={labels.title}>
 *   <FeedbackPublicList fillHeight rows={…} … />
 * </FeedbackPageFrame>
 * ```
 *
 * The page's root: put it straight under the app's content column (AppShell's `<main>`),
 * where the app's own page padding would be — not inside a column that pads already
 * (kastlan's `app-layout.tsx`), where the two would add up.
 */
export function FeedbackPageFrame({ title, headerProps, className, children, ...rest }: FeedbackPageFrameProps) {
  const titled = isTitled(title);
  const header = (pageTitle: ReactNode) => (
    <PageHeader
      size="compact"
      {...headerProps}
      title={pageTitle}
      className={cn(HEADER_CLASS, headerProps?.className)}
    />
  );
  return (
    <div {...rest} className={cn(FILL_HEIGHT_CLASS, FRAME_CLASS, className)} data-feedback-page-frame="">
      {titled && header(title)}
      <FeedbackPageFrameContext.Provider value={titled ? null : header}>{children}</FeedbackPageFrameContext.Provider>
    </div>
  );
}
