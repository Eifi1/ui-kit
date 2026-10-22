import { SERVER_KIT_API } from "../server-kit/api";
import { TEXT_SIZES } from "../../../src/theme/text-size";
import { CONTRAST_MODES } from "../../../src/theme/contrast";
import type { AccountAppearanceFields, AccountAppearancePatch } from "../../../src/settings/use-account-appearance";
import type { DemoSessionUser } from "../../../src/demo/demo-session";
import type { AccountErrorCode, DemoErrorCode } from "../../../src/auth/auth-errors";
import type { AdminPerson } from "../../../src/admin/admin-parts";
import { ADMIN_ACTION_KINDS } from "../../../src/admin/admin-action-log";
import { FEEDBACK_CATEGORY_ORDER, FEEDBACK_STATUS_ORDER } from "../../../src/feedback/feedback-vocabulary";
import { FEEDBACK_QUEUE_STATUSES } from "../../../src/feedback/feedback-record";
import type {
  FeedbackComment,
  FeedbackEntryKind,
  FeedbackPublicListItem,
  FeedbackReply,
} from "../../../src/feedback/feedback-public-types";
import { SUBSCRIPTION_STATUSES } from "../../../src/billing/billing-labels";
import type { BillingOverview, SubscriptionSource } from "../../../src/billing/billing-overview";
import { CHECKOUT_RETURN_PARAM, CHECKOUT_RETURN_VALUE } from "../../../src/billing/checkout-return";
import type { NotificationInboxItem } from "../../../src/notifications/notification-inbox";
import type {
  ApiTranslationReview,
  ApiTranslationReviewWrite,
  ApiTranslationReviewsResponse,
  TranslationVerdict,
} from "../../../src/lib/translation-review";
import type { SyncPageCursor, SyncRefusalBody, SyncRequestBody, SyncWireChange } from "../../../src/sync/wire";

/**
 * KIT-15 (round 0.49): the vocabularies and wire shapes written twice — in this package's
 * TypeScript and in server-kit's Python — checked against server-kit's API export
 * (`showcase/src/server-kit/api.json`, pinned per server-kit release by
 * `npm run sync:server-kit`). Before this, each side was held to the other by a comment
 * and a hard-coded value in a test; a server-kit release that renamed a code or a field
 * now fails here on the next sync.
 *
 * The two packages keep separate versions (the decision of round 0.49: keep A). The
 * snapshot is the contract between them: the release this ui-kit is tested against is
 * `api.json`'s `kit_version`.
 *
 * Values are compared as sets where the order is the kit's own (a lifecycle, a menu);
 * keys of a TypeScript shape are listed through {@link keysOf}/{@link membersOf}, whose
 * mapped parameter types make the list exhaustive at compile time — a field added to the
 * TS interface and not here fails `tsc`, a field listed here and not on the interface too.
 */

const api = SERVER_KIT_API;

/** A member of a server-kit module (`auth`, `user_admin`, …) by name. */
function member(module: string, name: string) {
  const mod = api.modules.find((m) => m.name === `eifi1_server_kit.${module}`);
  if (!mod) throw new Error(`server-kit has no module ${module}`);
  const found = mod.members.find((m) => m.name === name);
  if (!found) throw new Error(`server-kit's ${module} has no ${name}`);
  return found;
}

/** An enum's wire values. */
const enumValues = (module: string, name: string) => (member(module, name).values ?? []).map((v) => String(v.value));

/** A model's field names. */
const fieldNames = (module: string, name: string) => (member(module, name).fields ?? []).map((f) => f.name);

/** The string literals in a constant's signature — `X: tuple[...] = ("a", "b")`. */
function constantStrings(module: string, name: string): string[] {
  const signature = member(module, name).signature;
  const value = signature.slice(signature.indexOf("=") + 1);
  return [...value.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

/** Every key of `T`, listed in an object literal the compiler checks both ways. */
function keysOf<T>(record: { [K in keyof Required<T>]: true }): string[] {
  return Object.keys(record);
}

/** Every member of a string union, listed the same way. */
function membersOf<U extends string>(record: Record<U, true>): string[] {
  return Object.keys(record);
}

const sorted = (values: readonly string[]) => [...values].sort();

/** `expected ⊆ actual`, naming what is missing. */
function expectSubset(of: readonly string[], within: readonly string[], what: string) {
  expect(of.filter((key) => !within.includes(key)), `${what}: not in server-kit's shape`).toEqual([]);
}

describe("server-kit's vocabularies, as this package writes them", () => {
  it("names the release it is checked against", () => {
    expect(api.kit_version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  // 1. src/theme/text-size.ts ↔ auth/schemas.py TEXT_SIZES
  it("text sizes: TEXT_SIZES, value for value and in order", () => {
    expect([...TEXT_SIZES]).toEqual(constantStrings("auth", "TEXT_SIZES"));
  });

  // 2. src/theme/contrast.ts ↔ auth/schemas.py CONTRAST_MODES
  it("contrast modes: CONTRAST_MODES, value for value and in order", () => {
    expect([...CONTRAST_MODES]).toEqual(constantStrings("auth", "CONTRAST_MODES"));
  });

  // 3. src/settings/use-account-appearance.ts, src/demo/demo-session.ts ↔ auth/schemas.py
  it("/auth/me: the fields the kit reads are UserResponse's, the PATCH's are ProfileUpdate's", () => {
    const user = fieldNames("auth", "UserResponse");
    expectSubset(keysOf<AccountAppearanceFields>({ text_size: true, contrast: true }), user, "AccountAppearanceFields");
    // Neither is server-kit's: `isDemo` is a client's camel-cased copy, and `is_demo` the
    // field an app adds when it subclasses UserResponse (auth/schemas.py's own example).
    // Listed so a new DemoSessionUser field has to be placed here; neither is compared.
    keysOf<DemoSessionUser>({ is_demo: true, isDemo: true });
    type PatchKey = AccountAppearancePatch extends infer P ? (P extends unknown ? keyof P : never) : never;
    expectSubset(membersOf<PatchKey>({ text_size: true, contrast: true }), fieldNames("auth", "ProfileUpdate"), "AccountAppearancePatch");
  });

  // 4. src/auth/auth-errors.ts AccountErrorCode ↔ user_admin/errors.py
  it("account error codes: AccountErrorCode", () => {
    const codes = membersOf<AccountErrorCode>({
      last_admin: true,
      self_action: true,
      other_companies: true,
      household_has_members: true,
      confirmation_required: true,
      confirmation_mismatch: true,
      password_incorrect: true,
    });
    expect(sorted(codes)).toEqual(sorted(enumValues("user_admin", "AccountErrorCode")));
  });

  // 5. src/auth/auth-errors.ts DemoErrorCode ↔ demo.py
  it("demo error codes: DemoErrorCode", () => {
    const codes = membersOf<DemoErrorCode>({
      demo_disabled: true,
      demo_rate_limited: true,
      demo_capacity: true,
      demo_not_ready: true,
      demo_read_only: true,
      demo_refused: true,
    });
    expect(sorted(codes)).toEqual(sorted(enumValues("demo", "DemoErrorCode")));
  });

  // 6. src/admin/admin-parts.ts AdminPerson ↔ user_admin/schemas.py PersonRef
  it("a person: AdminPerson takes PersonRef's fields under their wire names", () => {
    const wire = keysOf<AdminPerson>({
      id: true,
      first: true,
      last: true,
      first_name: true,
      last_name: true,
      name: true,
      email: true,
    }).filter((k) => !["first", "last", "name"].includes(k)); // the kit's own spellings
    expect(sorted(wire)).toEqual(sorted(fieldNames("user_admin", "PersonRef")));
  });

  // 7. src/admin/admin-action-log.tsx ↔ user_admin/actions.py AdminAction
  it("admin actions: ADMIN_ACTION_KINDS is AdminAction", () => {
    expect(sorted(ADMIN_ACTION_KINDS)).toEqual(sorted(enumValues("user_admin", "AdminAction")));
  });

  // 8. src/feedback/feedback-vocabulary.ts, feedback-record.ts ↔ feedback/enums.py
  it("feedback: the statuses, the categories and the loops' queue", () => {
    expect(sorted(FEEDBACK_STATUS_ORDER)).toEqual(sorted(enumValues("feedback", "FeedbackStatus")));
    expect(sorted(FEEDBACK_CATEGORY_ORDER)).toEqual(sorted(enumValues("feedback", "FeedbackCategory")));
    // QUEUE_STATUSES is a frozenset of FeedbackStatus members: compare by member name.
    const queue = [...member("feedback", "QUEUE_STATUSES").signature.matchAll(/FeedbackStatus\.(\w+)/g)].map((m) => m[1]);
    expect(sorted(FEEDBACK_QUEUE_STATUSES)).toEqual(sorted(queue));
  });

  // 9. src/feedback/feedback-public-types.ts ↔ feedback schemas
  it("feedback's public side: entries, comments and the list item", () => {
    expect(sorted(membersOf<FeedbackEntryKind>({ reply: true, rework: true }))).toEqual(
      sorted(enumValues("feedback", "FeedbackEntryKind")),
    );
    expect(
      sorted(
        keysOf<FeedbackReply>({
          id: true,
          author_name: true,
          body: true,
          kind: true,
          attachment_url: true,
          status_to: true,
          status_from: true,
          created_at: true,
        }),
      ),
    ).toEqual(sorted(fieldNames("feedback", "FeedbackReplyResponse")));
    expect(
      sorted(
        keysOf<FeedbackComment>({
          id: true,
          author_name: true,
          mine: true,
          staff: true,
          body: true,
          hidden: true,
          attachment_url: true,
          created_at: true,
        }),
      ),
    ).toEqual(sorted(fieldNames("feedback", "FeedbackCommentResponse")));
    expect(
      sorted(
        keysOf<FeedbackPublicListItem>({
          id: true,
          title: true,
          category: true,
          status: true,
          created_at: true,
          updated_at: true,
          resolved_at: true,
          author_name: true,
          mine: true,
          votes: true,
          voted: true,
          comment_count: true,
        }),
      ),
    ).toEqual(sorted(fieldNames("feedback", "FeedbackPublicListItem")));
  });

  // 10. src/billing/billing-labels.ts, billing-overview.ts, checkout-return.ts ↔ billing
  it("billing: the statuses, the sources, the overview and the way back", () => {
    expect(sorted(SUBSCRIPTION_STATUSES)).toEqual(sorted(enumValues("billing", "SubscriptionStatus")));
    expect(sorted(membersOf<SubscriptionSource>({ trial: true, provider: true, manual: true, beta: true }))).toEqual(
      sorted(enumValues("billing", "SubscriptionSource")),
    );
    expect(
      sorted(
        keysOf<BillingOverview>({
          plan: true,
          status: true,
          source: true,
          in_good_standing: true,
          trial_ends_at: true,
          comped_until: true,
          current_period_end: true,
          cancel_at_period_end: true,
          limits: true,
          usage: true,
          currency: true,
          at_provider: true,
          paid: true,
          switching: true,
          portal: true,
          buyer_name: true,
        }),
      ),
    ).toEqual(sorted(fieldNames("billing", "BillingOverview")));
    expect([CHECKOUT_RETURN_PARAM]).toEqual(constantStrings("billing", "CHECKOUT_RETURN_PARAM"));
    expect([CHECKOUT_RETURN_VALUE]).toEqual(constantStrings("billing", "CHECKOUT_RETURN_VALUE"));
  });

  // 11. src/notifications/notification-inbox.tsx ↔ notifications/inbox.py InboxItem
  it("notifications: a NotificationInboxItem is an InboxItem", () => {
    expect(
      sorted(
        keysOf<NotificationInboxItem>({
          id: true,
          notification_type: true,
          title: true,
          body: true,
          url: true,
          created_at: true,
          read_at: true,
          company: true,
          company_id: true,
        }),
      ),
    ).toEqual(sorted(fieldNames("notifications", "InboxItem")));
  });

  // 12. src/lib/translation-review.ts ↔ translation_review/schemas.py
  it("translation review: the verdicts, a stored review, a write and the list", () => {
    expect(sorted(membersOf<TranslationVerdict>({ APPROVED: true, NEEDS_CHANGE: true }))).toEqual(
      sorted(enumValues("translation_review", "TranslationVerdict")),
    );
    expect(
      sorted(
        keysOf<ApiTranslationReview>({
          locale: true,
          key: true,
          text: true,
          reference_text: true,
          verdict: true,
          note: true,
          suggestion: true,
          reviewer_name: true,
          reviewer_first_name: true,
          reviewer_last_name: true,
          reviewed_at: true,
        }),
      ),
    ).toEqual(sorted(fieldNames("translation_review", "TranslationReviewOut")));
    expect(
      sorted(
        keysOf<ApiTranslationReviewWrite>({
          locale: true,
          key: true,
          text: true,
          reference_text: true,
          verdict: true,
          note: true,
          suggestion: true,
        }),
      ),
    ).toEqual(sorted(fieldNames("translation_review", "TranslationReviewWrite")));
    expect(sorted(keysOf<ApiTranslationReviewsResponse>({ locales: true, areas: true, reviews: true }))).toEqual(
      sorted(fieldNames("translation_review", "TranslationReviewsResponse")),
    );
  });

  // 13. src/sync/wire.ts ↔ sync/schemas.py
  it("sync: the request, a change, the cursor and a refusal", () => {
    expect(
      sorted(keysOf<SyncPageCursor>({ entity: true, knowledge: true, id: true, window_end: true })),
    ).toEqual(sorted(fieldNames("sync", "SyncPageCursor")));
    expect(
      sorted(
        keysOf<SyncRequestBody>({
          scope: true,
          last_knowledge: true,
          changes: true,
          refusals: true,
          client_now: true,
          paged: true,
          page_cursor: true,
        }),
      ),
    ).toEqual(sorted(fieldNames("sync", "SyncRequest")));
    expect(sorted(keysOf<SyncRefusalBody>({ code: true, detail: true, change_ids: true }))).toEqual(
      sorted(fieldNames("sync", "SyncRefusal")),
    );
    // `pk` is one app's server id on a pulled change, beyond server-kit's SyncChange.
    const change = keysOf<SyncWireChange>({
      entity: true,
      id: true,
      op: true,
      data: true,
      updated_at: true,
      pk: true,
      knowledge: true,
    }).filter((k) => k !== "pk");
    expect(sorted(change)).toEqual(sorted(fieldNames("sync", "SyncChange")));
  });
});
