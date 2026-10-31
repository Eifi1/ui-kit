// Types for scripts/lib/imports.mjs, for its test (src/__tests__/import-scanner.test.ts).

export function importsOf(file: string): string[];
export function resolveRelative(from: string, specifier: string): string;
export function closure(entry: string): { files: Set<string>; packages: Set<string> };
