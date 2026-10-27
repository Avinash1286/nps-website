/** Seed/setup placeholders must not be presented as a school-approved year. */
export function normalizeAcademicYear(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const year = value.trim();
  if (!year || /^(configure in admin|current intake|current)$/i.test(year)) return undefined;
  return year;
}
