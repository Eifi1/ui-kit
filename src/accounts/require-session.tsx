import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { NEXT_PARAM } from "../landing/routing";
import { useAccountsClient } from "./accounts-context";

// 0.64 (Kurvenschmiede's dev.2 run): a module of its own, apart from the account pages, so an
// app that gates its eager routes with it and loads accountRoutes lazily keeps the forms out
// of its first load (+12.6 kB gzip on every page when both shared one module).

/** What {@link RequireSession} takes. */
export interface RequireSessionProps {
  children?: ReactNode;
  /** The sign-in page. Default `"/login"`. */
  signInPath?: string;
}

/**
 * The gate for the pages that need an account (Kurvenschmiede's `ProtectedRoute`): without a
 * session it goes to the sign-in, carrying where the reader was — the query and the fragment
 * too, which are often the point (`/settings?focus=…`) — so signing in lands back there
 * (KS's F34). In the URL rather than in router state, so it survives a reload of the sign-in.
 */
export function RequireSession({ children, signInPath = "/login" }: RequireSessionProps) {
  const client = useAccountsClient();
  const signedIn = client.useSession((state) => state.token !== null);
  const { pathname, search, hash } = useLocation();
  if (!signedIn) {
    const next = encodeURIComponent(`${pathname}${search}${hash}`);
    return <Navigate to={`${signInPath}${signInPath.includes("?") ? "&" : "?"}${NEXT_PARAM}=${next}`} replace />;
  }
  return <>{children}</>;
}
