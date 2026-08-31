export type StructuredPageSections = Record<string, string[]>;

function sectionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function paragraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Parses the lightweight `## Section` convention used by consolidated CMS pages.
 * Content before the first heading belongs to the overview section, so existing
 * page bodies continue to work while editors migrate them to the clearer format.
 */
export function structuredPageSections(body: string): StructuredPageSections {
  const sections: StructuredPageSections = {};
  let currentKey = "overview";
  let buffer: string[] = [];

  const commit = () => {
    const content = paragraphs(buffer.join("\n").trim());
    if (content.length) sections[currentKey] = [...(sections[currentKey] ?? []), ...content];
    buffer = [];
  };

  for (const line of body.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (!heading) {
      buffer.push(line);
      continue;
    }
    commit();
    currentKey = sectionKey(heading[1]) || "overview";
  }
  commit();
  return sections;
}

export function plainParagraphs(body?: string) {
  return body ? paragraphs(body) : [];
}
