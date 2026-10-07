// Types for the parts of sync-server-kit.mjs the showcase tests import.

export const OUT: string;
export const FORMAT: string;
export const FORMAT_VERSION: number;
export const DOCS_BASE: string;

export interface HeadingAnchor {
  level: number;
  text: string;
  anchor: string;
}

export function headingSlug(markdownText: string): string;
export function headingAnchors(markdown: string): HeadingAnchor[];
export function sectionNumbers(section: string): string[];
export function findSection(markdown: string, number: string): HeadingAnchor | undefined;
export function validate(api: unknown, options?: { tag?: string }): string[];
export function withContractLinks<T>(api: T, readDoc: (path: string) => string): T;
export function render(api: unknown, options?: { readDoc?: (path: string) => string; tag?: string }): string;

export class SyncError extends Error {
  lines: string[];
  constructor(lines: string[]);
}
