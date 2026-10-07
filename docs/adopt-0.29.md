# Adopting `@eifi1/ui-kit` 0.29 and `eifi1-server-kit` 0.3

The sign-in, sign-up and account harmonisation (Marcel, 2026-10-05). **The user always
signs in**; companies, households and teams are associated with the user. First and
last name are required. Every app gets the full set of signed-out pages.

The contract, reviewed by all three apps, is `docs/auth-harmonization.md`. §9 there is
each app's checklist. This note is the kits' side.

**keksdose is the reference**, except for Marcel's decisions in §2 and what the reviews
settled in §10.

## 0.29.1

A patch from the apps' adoption. Nothing to change unless you want the new options.

- **Dropdowns open above** when the list's full height (320 px) doesn't fit below but
  fits above, or when above is clearly roomier (48 px or more). It used to stay below
  until fewer than 160 px were left, so a select near the bottom of the screen opened as
  a cramped list (keksdose live #384). This affects every `useAnchoredPanel` consumer:
  comboboxes, the currency select, the pickers.
- **`RegisterForm defaultEmail`**: an editable start address, with the `+tag`
  suggestion still offered, for a link anyone can build, such as a token-free
  `/register?email=…` kept during the move to invitations. `invitedEmail` still locks the
  field and wins.
- **`EmailVerificationBanner` / `VerifyEmailStatus` `describeError`**: the server's own
  sentence for a refused resend (a throttle's "try again in N minutes"), else the kit's.
- **`token_expired`** joins `AuthErrorCode`. Without a `classifyError`,
  `VerifyEmailStatus` shows a coded `token_expired` as "expired".
- Kurvenschmiede's corrections to the hu and es sign-in wording.

## Everyone

1. Bump the kit to `^0.29.0` by hand; a caret below 1.0 locks the minor version. Take
   server-kit 0.3.0: the release wheel's URL in the install line, with the sha256
   pinned in `uv.lock`.
2. Nothing changes on the bump alone. Every 0.29 part is new, and `UserAvatar`'s new
   `person` prop is optional.
3. **The forms never send a request.** Each takes callbacks and renders the answer you
   give it. Your HTTP client maps the server's answers onto the kit's shapes; the
   JSDoc of `SignInAnswer` shows keksdose's mapping. keksdose needs this, because it
   must see the password on its way.

## New in the kit

- **`SignInForm`** handles credentials, then the 2FA step, then a forced new password,
  all on one answer union: `signed-in`, `2fa`, or `password-change`. `onSubmit`,
  `onCode` and `onSetPassword` each return it.
  - `onPasskey` and `passkeyAutofill(signal)`: the email field is
    `autoComplete="username webauthn"`, so the form arms conditional mediation once and
    aborts it on unmount.
  - After `invalid_credentials` it shows one message, plus the deactivated hint
    (`deactivatedContact`) and the `+tag` hint (`emailTag`).
  - `token_invalid` on a later step goes back to the credentials with "expired".
- **`RegisterForm`**: first and last name (1–120), email with the **`+app` suggestion**
  (`emailTag="kastlan"`; offered, never applied), password with the advisory strength
  meter, confirmation, language, and the terms checkbox.
  - Slots: `aboveForm`, `underEmail`, `appFields` (gate them with
    `appFieldsComplete`), `afterFields`.
  - `invitedEmail` fixes the address; the invitee may still take the tag.
  - `email_taken`, `registration_closed`, `invitation_invalid` and `invitation_expired`
    show in the form.
- **`CompleteNameDialog`**: shown once after sign-in while `/auth/me` says
  `name_incomplete`. Dismissing it defers it to the next sign-in.
- **`ForgotPasswordForm`**: one answer whether or not the account exists.
- **`ResetPasswordForm`** checks the link first (`onCheck`) and **is not a sign-in**.
  It ends on "Sign in" with the email filled in, and shows your outcomes (keksdose's
  recovery-code notice, "N API tokens revoked").
- **`VerifyEmailStatus`** (posts the token, so a link scanner's GET verifies nothing)
  and **`EmailVerificationBanner`** (resend with a cooldown).
- **`NotFoundPage`** (noindex) and **`AcceptInvitation`**: an existing account accepts
  after signing in.
- **`formatPersonName({first, last}, locale)`** and **`personInitials`** follow the
  language's order:
  - "First Last" in most languages;
  - hu "Last First";
  - zh runs a CJK name together family-first ("李小龙") and leaves a Latin one as
    written.
  `UserAvatar person={{ first, last }}`.
- **`CompanySwitcher`** (kastlan, §5.3): hidden for one company, busy while
  `onSwitch(id)` runs.
- **Helpers:** `taggedEmail(email, tag)` and `isAuthError(err, code)` /
  `authErrorCode(err)`. The latter read `{code}` from the usual error shapes, FastAPI's
  `detail.code` included.
- Nine label namespaces in all seven languages: `signIn`, `register`, `completeName`,
  `forgotPassword`, `resetPassword`, `verifyEmail`, `notFound`, `acceptInvitation`,
  `companySwitcher`. Your translation review shows them as kit words.

Every signed-out page goes on your `AuthLayout` with the legal links and `useNoIndex`
(0.28).

## New in the server kit (0.3.0)

- **`auth.accounts`**
  - `normalise_email` never strips a `+tag`.
  - `tagged_variant` and `invitation_accepts`: the exact address, or your own tag on
    it.
  - `verified_by_invitation` is true for the **exact** address only. A tagged sign-up
    verifies by its own mail.
  - `addresses_for_reset`: the reset falls back to the tagged account.
  - `registration_decision`: **the environment list only bootstraps the first admin**.
    When it is set, the first account must be on it, and it grants nothing after. An
    invitation, which is what an allow-list entry becomes, opens everything else.
    **keksdose:** if your list is set on a fresh deploy and you relied on it for later
    sign-ups, those now need invitations.
  - `full_name`, `name_incomplete` (never for a demo), and `erasure_identifiers` for
    `anonymise_feedback`.
- **`auth.tokens`**
  - One-time tokens: `mint`, `hash_token`, `is_expired`; 1 h reset, 48 h verification,
    14 d invitation.
  - `access_claims` / `refresh_claims` with a fractional `iat`, and `token_is_revoked`.
  - **The claim builders refuse names, email and locale**: kastlan drops those claims
    (§6.2).
- **`auth.limits`**: `AuthLimiters` is the hard limit per IP. Per address, failures only
  **delay** the next attempt, never lock the account (§5.2). The reset budgets are
  10/h per IP and 3/h per address.
- **`auth.schemas`**: `RegisterRequest`, `LoginRequest`, `TokenResponse` (nullable
  `refresh_token`), the two challenges, `UserResponse` (`display_name` and
  `name_incomplete` derived), `ProfileUpdate`.
- **`auth.errors`**: `AuthError` with `code`. `install_contract_error_handlers` answers
  `{detail, code}`, and only `AuthError` adds `code`.
- **`mail`** (extra `mail`): `MailText`, `pick(locale, …)`, `render_message`, and
  `ResendClient`. The client retries once with the same `Idempotency-Key`, which Resend
  honours for 24 h, and never logs the recipient. `ConsoleMailer` is for dev.
- **`translation_review.area_like_patterns`**: the area rule as SQL `LIKE` patterns, for
  a listing query (the bug Kurvenschmiede found in 0.28).

## Per app

The checklists are §9 of the contract. The order that keeps each step small:

1. **The forms and pages from the kit**:
   - sign-in;
   - register, with the `+app` tag;
   - forgot, reset and verify;
   - 404;
   - invitation acceptance.
   Map your API's answers onto the kit's shapes.
2. **Coded refusals**: the server's `AuthError` and the pages' `isAuthError` switch
   together.
3. **First and last name**: the migration, `name_incomplete`, `CompleteNameDialog`, the
   derived `display_name`, and lists sorted by `(last_name, first_name)`.
4. **Invitations** replace token-free `/register?email=` links and kastlan's
   admin-chosen passwords. An allow-list entry becomes an invitation.
5. **kastlan only:** several companies, the most work in this round: §5.3, and §9
   kastlan 3a–h, where (a) roles per company and (c) membership on refresh are the
   must-not-miss items. Plus the per-request revocation check, after which the token
   lifetimes become an app setting.
6. **Kurvenschmiede only:** email verification arrives with this round (§2.8); 2FA comes
   later.
