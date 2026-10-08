import type { ReactNode } from "react";

import { Button } from "../components/ui";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { TopBar } from "../shell/top-bar";
import type { TopBarProps } from "../shell/top-bar";
import { TopBarBrand } from "../shell/top-bar-brand";
import { useAccessAction } from "./access";
import type { AccessChoice } from "./access";
import { useLandingLabels } from "./landing-labels";
import type { LandingLabels } from "./landing-labels";
import type { LandingSession } from "./landing-actions";

/** The header's brand: what `TopBarBrand` draws. */
export interface PublicHeaderBrand {
  /** The brand mark — an SVG or an `<img alt="">`. */
  logo: ReactNode;
  /** The product name beside it, and the link's accessible name. */
  name: ReactNode;
  /** See `TopBarBrand`. Default `sm`: the logo alone on a phone. */
  collapseBelow?: "sm" | "md" | false;
}

export interface PublicHeaderProps extends Omit<TopBarProps, "brand" | "actions" | "children"> {
  brand: PublicHeaderBrand;
  /** Where the brand links. Default `/` without a session and `/welcome` with one —
   *  `/` would resume into the app, `/welcome` is always the landing (§3.1). */
  homeHref?: string;
  session: LandingSession;
  access: AccessChoice;
  /** "Sign in". Default `/login`. */
  signInHref?: string;
  /** "Open app" for a real session — the resume target. Default `/`, which resumes
   *  through `RootEntry`. */
  openAppHref?: string;
  /** "Continue the demo" for a demo session. Default `/demo`, which continues a live
   *  demo (§3.1). */
  demoHref?: string;
  /** The app's `LanguageMenu`, before the actions. */
  languageMenu?: ReactNode;
  /** The app's `ThemeToggle`, before the language menu. */
  themeToggle?: ReactNode;
  labels?: Partial<LandingLabels>;
}

/**
 * The header of every public page (docs/landing-demo-harmonization.md §4.1): the
 * landing, the auth pages, the legal pages and the 404 — keksdose's `LandingHeader`, on
 * the kit's `TopBar` and `TopBarBrand`, with its hard-coded teal turned into `--brand`.
 *
 * | session | actions |
 * |---|---|
 * | none | Sign in (secondary, hidden below `sm`), **Request access** (primary) |
 * | demo | Continue the demo (secondary), **Request access** (primary) |
 * | user | **Open app** (primary) |
 *
 * A demo session is not "signed in" here: it is still offered access, which is the point
 * of the demo (§5.6). In the phone layout (`usePhoneLayout()`) the actions take the kit's `sm` size, so
 * the brand mark, the two controls and two actions fit 390px; "Sign in" gives way below
 * `sm` as in keksdose — the sign-in page is one tap away from "Request access" anyway.
 */
export function PublicHeader({
  brand,
  homeHref,
  session,
  access,
  signInHref = "/login",
  openAppHref = "/",
  demoHref = "/demo",
  languageMenu,
  themeToggle,
  labels: labelsProp,
  className,
  ...rest
}: PublicHeaderProps) {
  const labels = useLandingLabels(labelsProp);
  const accessLink = useAccessAction(access, labelsProp);
  const phone = usePhoneLayout();
  const size = phone ? "sm" : "md";
  const home = homeHref ?? (session === "none" ? "/" : "/welcome");

  const actions =
    session === "user" ? (
      <Button href={openAppHref} variant="brand" size={size}>
        {labels.openApp}
      </Button>
    ) : (
      <>
        {session === "demo" ? (
          <Button href={demoHref} variant="secondary" size={size}>
            {labels.continueDemo}
          </Button>
        ) : (
          <Button href={signInHref} variant="secondary" size={size} className="max-sm:hidden">
            {labels.signIn}
          </Button>
        )}
        <Button href={accessLink.href} variant="brand" size={size}>
          {accessLink.label}
        </Button>
      </>
    );

  return (
    <TopBar
      {...rest}
      className={className}
      brand={<TopBarBrand logo={brand.logo} name={brand.name} to={home} collapseBelow={brand.collapseBelow} />}
      actions={
        <>
          {themeToggle}
          {languageMenu}
          <span data-slot="public-header-actions" className="ms-1 flex items-center gap-1.5 sm:gap-2">
            {actions}
          </span>
        </>
      }
    />
  );
}
