/** "de-CH" → "DE": the language subtag in capitals, the code the language triggers show
 *  (0.49 KIT-10). Internal. */
export function languageCodeLabel(code: string): string {
  return code.split(/[-_]/)[0].toUpperCase();
}
