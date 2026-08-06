/**
 * Serializes JSON for an inline `application/ld+json` script without allowing
 * user-managed content to terminate the script element.
 */
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
