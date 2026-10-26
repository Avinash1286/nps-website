/** Repeated URL filters use their first value, like URLSearchParams.get(). */
export function firstSearchParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}
