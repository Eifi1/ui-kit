/**
 * An address's shape: something, an `@`, something with a dot in it, and no spaces. Shape
 * only: whether the address may be invited, or exists, is the server's question. One copy
 * since 0.66 (refactor audit 2026-11-22, DUP-8), where InvitationsPanel, ShareCard and (in its
 * own way, the browser's `type=email` bubble) the teams' add row each had their own.
 *
 * @internal Not part of the barrel.
 */
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whether `address` (trimmed by the caller) has {@link EMAIL_SHAPE}. */
export function isEmailShape(address: string): boolean {
  return EMAIL_SHAPE.test(address);
}
