// Types for the parts of check.mjs its test imports (src/__tests__/local-gates.test.ts).

export const GROUPS: string[];
export const STAMPS: string;
export function isParallel(env: Record<string, string | undefined>): boolean;
export function runGroups(
  groups: string[],
  run: (group: string) => Promise<boolean>,
  options: { parallel: boolean },
): Promise<{ results: { group: string; ok: boolean }[]; skipped: string[] }>;
export function testWorkers(env: Record<string, string | undefined>, cores?: number): string;
export function cleanTree(): string | null;
export function writeStamp(tree: string, dir?: string): void;
