# Adopting `@eifi1/ui-kit` 0.36 and `eifi1-server-kit` 0.9

Round 0.36 took Kurvenschmiede's Select hints and every queued round (Marcel, 2026-10-13:
"The select hints and the queued rounds. All of them."). Four contracts were drafted, reviewed
by all three apps and settled on Marcel's word ("As recommended", 20 decisions):
- **notifications:** `docs/notifications-harmonization.md` (new; settings §6.4 deferred to it);
- **server services**, server-kit layer 2: `docs/server-services-harmonization.md` (new), with
  feedback §3.5/§3.6 amended (the limiter is charged before the work);
- **reset this device's settings:** settings §11;
- **the More-contrast light well:** colour-roles §13 (colour decision 15 reversed);
- and text-size §4: a field's `help` beside its `hint`.

The contracts' per-app sections are the checklists; this note is the kits' side and the order.

**Bumping changes nothing by itself** except what More contrast looks like in light (§2). The
rest is adopted step by step, in any order: the help slot and the reset card are small; the
feedback service (server-kit layer 2) removes code; notifications are the large one, and
keksdose is their canon. Kurvenschmiede's Select hints are done (its four commits of the round).

## 1. What's new

### ui-kit 0.36

- **`help` beside `hint` on every field** (text-size §4, decision 1): about sixty fields and the
  Rhf bound fields take `help`, drawn as the field's one "?" (a HelpPopover named "About
  <label>") while `hint` stays the visible caption at every size. A FieldHint passed as `hint`
  draws no "?" of its own while `help` is set. Two label keys: `common.aboutField(field)` and
  `common.help`.
- **Notification cards** (notifications §4.2), in the main barrel: `NotificationTypesSetting`,
  `QuietHoursSetting`, `TimeZoneSelect`, `PushDeviceSetting`, `PushDevicesSetting` (each a card
  taking `id`, like SessionsSetting), `usePushDevice` with `PUSH_SUBSCRIPTION_CHANGED` /
  `notifyPushSubscriptionChanged`, `UnsubscribePanel` for the public `/unsubscribe` page, and the
  `notifications` label namespace (with ten region names) in seven languages. The server's list
  is the only list of types: the card draws what `GET /notifications/settings` answers.
  `emailUnverified` puts "Confirm your address to receive these." under every e-mail switch.
  The kit makes no network call: the app passes its fetch and mutate functions.
- **Reset this device's settings** (settings §11): `registerDeviceSetting`, `deviceSettings`,
  `resetDeviceSettings` and the `DeviceResetSetting` card (the last card of the appearance
  group; a confirm, then a toast; the `deviceReset` namespace). The kit's own stores join by
  themselves — theme, palette (state only, never `applyTokenSet`), text size, contrast,
  `AppShell`'s sidebar key and `UiKitProvider`'s table prefix — and each resets through its
  own setter, live, without a reload. Each app registers its own keys (§3).
- **The More-contrast light well** (colour-roles §13): in light, More contrast darkens the well
  (`--bg-surface-2`, 10 % ink into the card, 1.19–1.24:1 from it) and deepens what sits on it so
  every role keeps its floor: the four money colours (per token set), danger, warning, success,
  info, teal, orange, `--status-edited`, `--bg-active` (16 %) and the border. Measured on all six
  presets: primary 7.44, secondary 6.88, muted 6.35, money 4.50 and status 4.53 on the well (on
  the page ≥ 4.95 and ≥ 5.08). Dark keeps its well. A link Button's and TextLink's brand reads
  `--brand-muted` under More contrast, in both modes. `auditPalette(t, semantic, { level })`.

### server-kit 0.9

- **`eifi1_server_kit.notifications`** (layer 1): the type registry, the settings resource and
  its PATCH, `plan_delivery`, quiet hours (fail open; a null or unknown zone is Europe/Zurich),
  the digest's period key (`2026-W42`, `2026-10`) and `digest_due`, push shapes and
  `push_outcome` / `should_reap`, the signed unsubscribe token (keyed from the app's own secret,
  never stored, never expires, e-mail-off only), the inbox row. `mail`: `MailMessage.headers`,
  `list_unsubscribe_headers(url)` (https only) and `render_mail(…, unsubscribe=MailUnsubscribe(…))`
  for the footer line. `settings.apply_patch(…, skip=)`.
- **Layer 2, the feedback service** (server services §4.1): `FeedbackService` over the app's
  `FeedbackRepository`, `AttachmentStorage` and clock (the actor on every call), `erase_author`
  (returns the keys; each app deletes them at its own commit), `feedback.router`'s
  `feedback_router(FeedbackDeps(…))` with keksdose's endpoint names and **the app's own demo and
  admin guards as route dependencies**, and `feedback.testing` (in-memory fakes, three
  conformance checks). The kit never commits. New **`fastapi` extra**.

## 2. Breaking and must-change, every app

- **Nothing is removed** in either kit.
- **More contrast in light looks darker** on wells (inset cards, read-only fields, table group
  rows, a selected row) and money/status text is deeper there. No app test pins these colours
  (checked by all three).
- **An app that writes a whole `UiKitLabels` object by hand** for a language needs the new keys:
  `common.aboutField`, `common.help`, the `notifications` and `deviceReset` namespaces
  (`missingKitLabels` lists them). keksdose's translation review shows the new rows.
- **Tests that read `deviceSettings()`** right after rendering `UiKitProvider` must
  `await waitFor(…)`: the provider joins the registry a microtask late (a dynamic import keeps
  the label module free of other imports).
- **server-kit typing:** `render_mail` takes a typed `unsubscribe=`, so a `**Mapping[str, str]`
  splat into it no longer type-checks (no app does this).
- **Route walks on FastAPI ≥ 0.142** iterate the router itself: lazily included routers no
  longer list their APIRoutes in `app.routes` (Kurvenschmiede's `route_table.py` already does).

## 3. Per app

### keksdose

1. Bump both kits (§4).
2. **Light well:** `features/budget/budget-table.tsx:443` `hover:bg-hover` → `hover:bg-surface`
   (the stepped well would otherwise sit 1.04:1 from its hover). The appearance tests assert
   attributes and state only; the assistant's bubbles get the 16 % `--bg-active` by themselves.
3. **Device reset:** `useDeviceLanguage.set` takes `null` (removes `keksdose-lang`;
   `shared/i18n/account-language.tsx:58-68`), then register `DEVICE_LANGUAGE_KEY` (`:35`) as
   appearance with reset `set(null)`; `keksdose-date-format` → `setPref("auto")`
   (`date-format-store.ts:71-74`); `keksdose-appearance` → `setMode("enhanced")`
   (`appearance-store.ts:24-28`); `keksdose-swipe-prefs` → `resetToShipped()`
   (`swipe-prefs-store.ts:187`). Views: the `keksdose.pageParams.` prefix with reset
   `clearPersistedPageParams` (`use-persisted-search-params.ts:4`, `:21`, the sweep
   `forgetPreviousAccount` at `auth-store.ts:47` already uses), `budget.collapsedGroups`
   (`use-budget-prefs.ts:3`) and the `budget.displayCurrency.` prefix
   (`display-currency-store.ts:23-27`). Presentation mode, what's-new and the home position stay
   out (decision 11). The card after `AppearanceCard` (`settings-page.tsx:106-109`), its entry
   after `chart_palette` (`settings-index.ts:127`; the index is key-based, so map the kit's
   title or use keksdose's own keys).
4. **Feedback service:** pin `[billing,fastapi,images]` (`backend/pyproject.toml:57`, `:121`).
   The repository adapter from `feedback_service.py`'s queries (`get` = `session.get`;
   `urls_named_except` with `Feedback.id.not_in(ids)`; ties by `Feedback.id.desc()`); storage
   `save` = `content_addressed_key` + `save_object("feedback/…")` (`upload_guards.py:238-242`),
   `read` via `invoke_file_store.py:116`; `commit_boundary` commits (`dependencies.py:45`);
   `not_in_the_demo`, `admin_guard=require_role(UserRole.ADMIN)`, `decode_images=True`;
   `app.state.feedback_limiters = FeedbackLimiters()`, and the support door calls
   `throttle_upload(…)` (`support_router.py:550`). `_anonymise_feedback` calls `erase_author`,
   prefixes `feedback/` and adds the keys to `_purge_objects_after_commit`
   (`budgets_service.py:1419`); the `feedback_comments` scrub stays. Goes: `feedback_service.py`,
   `upload_guards.refuse_demo` (~160 code lines). Visible: the identity stamp, and
   `Content-Disposition` on every download. Regenerating `openapi-schema.d.ts` changes JSDoc
   comments only.
5. **Notifications** (contract §5.1): `NOTIFICATION_TYPE_DEFAULTS`
   (`domain/models/push_subscription.py:30-56`) → the kit's `NotificationTypes`;
   `domain/schemas/push.py` onto the kit models (`PushUnsubscribeIn` → `PushUnregisterIn`,
   `PublicKeyResponse` → `PushKeyResponse`, `PushDeviceResponse`, the inbox); one settings model
   with the registry and `low_balance_threshold`, its PATCH through `apply_switches_patch` +
   `apply_patch(skip=SETTINGS_SKIP)` + `resolve_switches`; `should_push_now`
   (`notification_preferences_service.py:140-181`) → `not in_quiet_hours(…)`; the digest
   (`push_notifications.py:1094-1119`) → `digest_due` + `digest_tag`, the marker set on the inbox
   write; the payload → `PushPayload(…).encode()`; `push_service.py` → `PushEndpointTakenError`,
   `push_outcome`, `should_reap`; `vapid_subject(reply_to_address())` (and `cloudbuild.yaml:205`);
   `INBOX_RETENTION`. `GET/PATCH /notifications/settings`; `/push/*` stay as hidden aliases with a
   body shim until `http.route` shows no hits. Frontend: `settings-page.tsx:170` →
   `NotificationTypesSetting id="settings-notifications-card"` (groups from `PREF_GROUPS`,
   `renderExtra` for the threshold), plus `PushDeviceSetting` and `QuietHoursSetting` under new
   anchors (and their `settings-index.ts` entries); `:174` → `PushDevicesSetting
   id="settings-devices-card"`; `notifications-card.tsx`, `push-devices-card.tsx` and
   `shared/push/use-push.ts` go; `push-checkup-card.tsx` and `notification-inbox.tsx` move to the
   kit's hook, event and keksdose's own id list. Pass `labels` to keep keksdose's reviewed push
   words.

### kastlan

1. Bump both kits (§4).
2. **Light well:** nothing to code; `features/reporting/components/charts-tab.tsx:105-106` bars
   step with their legend (the dashboard's fixed-hex chart does not).
3. **Device reset:** a `resetDeviceLanguage()` in `shared/i18n/switch-language.ts` removes
   `kastlan-lang` and `i18nextLng` (`language-storage.ts:11`, `:14`), then shows
   account → browser → de-CH (`config.ts:18` without the device; not `applyAccountLanguage`);
   register `kastlan-lang` as appearance with it. `kastlan-account-*` stay. The card last in
   `AppearanceGroup` (`settings-page.tsx:103-166`), its entry after contrast
   (`settings-catalogue.tsx:73`), visible in a demo too.
4. **Feedback service:** pin `[billing,fastapi,images,mail]`.
   `SqlAlchemyFeedbackRepository(session, *, company_id=None, commit=False)` commits after a flush
   only with `commit=True`, which only the router's dependency sets; `AdminUserService.erase`
   builds it with the flag off on the superuser session (`platform_router.py:237-246`), commits
   once, then deletes `feedback/<key>` (`admin_user_service.py:414-420`). Storage over
   `FileStoragePort`; `admin_guard=require_role(*ADMIN_ONLY)`; the kit router at `/feedback`, then
   kastlan's own `/feedback/counts` and `/feedback/{feedback_id}` after it; the limiters move to
   `app.state`. Goes: `FeedbackService`, `_enrich_many`, the `Location` headers (~225 code lines).
   Wire: no `user_name`, the address in the inbox only, keksdose's 429 sentence, operation ids
   renamed.
5. **Notifications** (contract §5.2), e-mail per type now, push later as its own step: fix the
   poller first (honour `since`, translated cards, a tag; gate the switch on staff). Registry
   `invoices_overdue` (`app=False, email=False`), `dunnings_pending` (`app=False`), receivable by
   staff in any company (role checked in the event's company at delivery); a types-only PATCH
   (`apply_patch(not_nullable=SETTINGS_SKIP, skip=SETTINGS_SKIP)`), `plan_delivery(…,
   keeps_inbox=False)`; `unsubscribe_token` with `jwt_secret` (`infrastructure/config.py:29`);
   `list_unsubscribe_headers(url)` into the Resend JSON (`infrastructure/email.py:81`) and the
   SMTP message (`:102`), the footer written by kastlan. Frontend: `NotificationsGroup`
   (`settings-page.tsx:292-351`) → `NotificationTypesSetting` with
   `emailUnverified={!email_verified}`; one catalogue entry gated on staff
   (`settings-catalogue.tsx:82-83`); `UnsubscribePanel` on a public `/unsubscribe` route. The two
   fields leave `/auth/me`.

### Kurvenschmiede

1. Bump both kits (§4). The Select hints are done.
2. **Help slot:** `features/gear/hysteresis-editor.tsx:308-311` "How it was measured" can split
   now: `hint` = the fact sentence (`gear.layout_hint.*`), `help={<HelpPopover
   label={t("gear.how_measured_help")}>{t(`gear.layout_help.${sent}`)}</HelpPopover>}`. Optional:
   the other `hint={<HelpPopover>}` sites (`shortcut-dialog.tsx:992`, `plant-panel.tsx:38`,
   `kinematics-dialog.tsx:139`, `load-command-dialog.tsx:225`, `:312`, `:368`) may move to
   `help=`, freeing `hint` for a fact.
3. **Light well:** nothing to code; the no-palette path writes the stepped well and money in
   light. `corner-page.tsx:316`'s link button reads `--brand-muted` under More contrast.
4. **Device reset:** `kurvenschmiede-lang` as appearance (reset removes the key, then
   `changeLanguage(i18n, readerLanguage(user?.locale))`, `shared/i18n/index.ts:303`, `:183`; not
   `followAccountLanguage`); `steering-curve-channels` as a view with reset
   `useCurveChannels.setState({ flipped: [] })` (`curve-channels-store.ts:36-52`); `KIND_OF`
   beside `ENTRY_OF` (`storage-keys.ts:82`), its test awaiting the provider's join, `SITES` gains
   `registerDeviceSetting`. The card after `AppearanceCards` (`settings-page.tsx:205-210`), its
   entry after contrast (`:181`).
5. **Feedback service:** pin `[billing,fastapi,mail]`. Move `ATTACHMENT_URLS` beside the model
   and add the `screenshot_url` / `attachment_urls` properties. Repository: `get` =
   `visible_by_id`; `add` claims uploads (keeps the 422); `apply` hangs a rework's files as the
   actor's, **clears the attachment rows when the erasure nulls both URL columns**, writes
   `.value` and drops the plan's `resolved_at`, all through `save(session, row, actor=…)`.
   Storage = `upload()` / `attachment_by_key`; `foreign_row="not_found"`,
   `require_utf8_text=True`; `{row_id}` → `{feedback_id}` (`test_demo.py:145` and the walk's
   `fill`). `erasure_service` ignores the keys. `feedback_loop.file_report` creates through
   `FeedbackService(repo, policy=ATTACHMENT_URLS, foreign_row="not_found").create(…)` (~185 code
   lines go).
6. **Notifications** (contract §5.3), e-mail only, three types (`feedback_answered` on;
   `share_granted`, `team_added` off): the hook in `feedback_service.save` with the actor (both
   writers pass there); `send` (`infrastructure/email.py:182`) widens `kind` to `MailKind | str`;
   mails via `render_mail(…, unsubscribe=MailUnsubscribe(…))` (the kit's `ResendClient` sends the
   headers); `unsubscribe_token` with `jwt_secret` (`infrastructure/settings.py:137`);
   `plan_delivery(…, keeps_inbox=False, email_verified=email_verified_at is not None)`. No sealed
   content in a mail (the sharer and the kind of work, the team's name, "your report has an
   answer" and a link). Frontend: `Group` gains `"notifications"` (`settings-page.tsx:40`) with
   `NotificationTypesSetting` (`app: null`, `emailUnverified`); `/unsubscribe` with
   `UnsubscribePanel` joins `public-paths.ts:36`. The feedback loop refuses `--resolve` while mail
   goes to the console against a non-local database.

## 4. Versions

- **`@eifi1/ui-kit` `^0.36.0`.** Bump by hand: a caret below 1.0 locks the minor version.
- **`eifi1-server-kit` 0.9.0**, the release wheel by URL, now with the `fastapi` extra, and the
  sha256 pinned in `uv.lock`:

  ```sh
  uv add "eifi1-server-kit[billing,fastapi,images,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.9.0/eifi1_server_kit-0.9.0-py3-none-any.whl"   # kastlan
  uv add "eifi1-server-kit[billing,fastapi,images] @ https://github.com/Eifi1/server-kit/releases/download/v0.9.0/eifi1_server_kit-0.9.0-py3-none-any.whl"        # keksdose
  uv add "eifi1-server-kit[billing,fastapi,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.9.0/eifi1_server_kit-0.9.0-py3-none-any.whl"          # Kurvenschmiede
  ```

  sha256: (written at release)
