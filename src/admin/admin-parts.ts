import { useCallback } from "react";
import type { ReactNode } from "react";
import { useKitDateFormatter, useKitLocale } from "../i18n/kit-labels";
import { formatDate, toDate } from "../lib/format";
import type { DateInput } from "../lib/format";
import { toLocalIso } from "../lib/dates";
import { formatPersonName } from "../lib/person-name";

/**
 * What the admin parts share and do not export (0.30.0). Internal to `src/admin`.
 *
 * @internal
 */

/** A callback that may answer a promise: resolve = done, reject = stay and say why. */
export type MaybePromise<T = unknown> = void | Promise<T>;

/** A person as the admin parts show one: the two name parts of the auth contract
 *  (§3.2), an older whole `name` as the fallback, and the address. The name parts are
 *  read in either spelling — the kit's `first` / `last`, or server-kit's `PersonRef`
 *  as it serialises (`first_name` / `last_name`), so an app hands the server's object
 *  over as it came (keksdose's and kastlan's 0.30 adoptions mapped one to the other). */
export interface AdminPerson {
  id?: string | number | null;
  first?: string | null;
  last?: string | null;
  /** server-kit `PersonRef.first_name`; `first` wins when both are given. */
  first_name?: string | null;
  /** server-kit `PersonRef.last_name`; `last` wins when both are given. */
  last_name?: string | null;
  /** A whole name, for an API that still sends `display_name` only. */
  name?: string | null;
  email?: string | null;
}

/** A label that is really there — `null`, `false` and `""` are what `cond && text`
 *  evaluates to on the path where there is none. */
export function hasMessage(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

/**
 * The name to say for a person, in the READER's order (auth §3.2,
 * {@link formatPersonName}), else the whole `name`, else the address, else `""`.
 */
export function personLabel(person: AdminPerson | null | undefined, locale: string | undefined): string {
  if (!person) return "";
  return (
    formatPersonName({ first: person.first ?? person.first_name, last: person.last ?? person.last_name }, locale) ||
    (person.name ?? "").trim() ||
    (person.email ?? "").trim()
  );
}

/** {@link personLabel} in the provider's locale. */
export function usePersonLabel(localeProp?: string): (person: AdminPerson | null | undefined) => string {
  const locale = useKitLocale(localeProp);
  return useCallback((person) => personLabel(person, locale), [locale]);
}

/**
 * A day as words in a sentence ("6 Nov 2026"): the provider's `formatDate` when the app
 * set one (keksdose K12), asked for no weekday — a date in a sentence carries none — else
 * `Intl`'s medium date. `""` for no date.
 */
export function useDayText(localeProp?: string): (value: DateInput) => string {
  const locale = useKitLocale(localeProp);
  const fromProvider = useKitDateFormatter();
  return useCallback(
    (value) => {
      const date = toDate(value);
      if (!date) return "";
      const own = fromProvider
        ? fromProvider(toLocalIso(date), { unit: "day", source: "dateMark", locale, weekday: false })
        : "";
      return own || formatDate(date, "medium", { locale });
    },
    [fromProvider, locale],
  );
}

/** Call a callback that may throw or answer a promise, as a promise. */
export function settle<T>(call: () => MaybePromise<T>): Promise<T | void> {
  try {
    return Promise.resolve(call());
  } catch (error) {
    return Promise.reject(error);
  }
}
