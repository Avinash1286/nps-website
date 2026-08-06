export type EditorValues = Record<string, string | boolean>;

export function editorRecordValue(record: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[segment];
  }, record);
}

export function isSeoEditorField(key: string) {
  return key.startsWith("seo.");
}

export function seoInputFromEditor(values: EditorValues) {
  const title = String(values["seo.title"] ?? "").trim();
  const description = String(values["seo.description"] ?? "").trim();
  const imageUrl = String(values["seo.imageUrl"] ?? "").trim();
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    noIndex: Boolean(values["seo.noIndex"]),
  };
}

export function editorDateValue(value: string, label: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const timestamp = new Date(normalized).getTime();
  if (!Number.isFinite(timestamp)) throw new Error(`${label} must be a valid date and time.`);
  return timestamp;
}
