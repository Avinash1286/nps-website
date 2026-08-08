import { describe, expect, it } from "vitest";
import { editorDateValue, editorRecordValue, seoInputFromEditor } from "@/lib/content/admin-editor";

describe("generic CMS editor field serialization", () => {
  it("exposes SEO, expiry, department-head references, and supported featured controls", async () => {
    const { getCollectionDefinition } = await import("@/components/admin/content-manager");
    const pageFields = getCollectionDefinition("pages").fields;
    expect(pageFields.map((field) => field.key)).toEqual(
      expect.arrayContaining([
        "template",
        "seo.title",
        "seo.description",
        "seo.imageUrl",
        "seo.noIndex",
        "expireAt",
      ]),
    );

    const leadershipFields = getCollectionDefinition("leadership").fields;
    expect(leadershipFields.some((field) => field.key === "expireAt")).toBe(true);
    expect(leadershipFields.some((field) => field.key.startsWith("seo."))).toBe(false);

    const headField = getCollectionDefinition("departments").fields.find(
      (field) => field.key === "headTeacherId",
    );
    expect(headField).toMatchObject({
      type: "reference",
      referenceType: "teachers",
      referenceStatus: "published",
      referenceMatchCurrentIdBy: "departmentId",
    });
    expect(getCollectionDefinition("events").fields.some((field) => field.key === "featured")).toBe(true);
  });

  it("reads nested SEO fields and serializes only supported values", () => {
    const record = {
      seo: {
        title: "Current search title",
        noIndex: true,
      },
    };
    expect(editorRecordValue(record, "seo.title")).toBe("Current search title");
    expect(editorRecordValue(record, "seo.noIndex")).toBe(true);
    expect(
      seoInputFromEditor({
        "seo.title": "  Updated title  ",
        "seo.description": "",
        "seo.imageUrl": " https://example.com/share.jpg ",
        "seo.noIndex": false,
      }),
    ).toEqual({
      title: "Updated title",
      imageUrl: "https://example.com/share.jpg",
      noIndex: false,
    });
  });

  it("parses optional expiry timestamps and rejects invalid values", () => {
    expect(editorDateValue("", "Automatic expiry")).toBeUndefined();
    expect(editorDateValue("2027-01-15T10:30", "Automatic expiry")).toBe(
      new Date("2027-01-15T10:30").getTime(),
    );
    expect(() => editorDateValue("not-a-date", "Automatic expiry")).toThrow(
      "Automatic expiry must be a valid date and time.",
    );
  });

  it("separates optional technical fields from required editing fields", async () => {
    const { editorFieldGuidance, isAdvancedEditorField } = await import("@/components/admin/content-manager");

    expect(isAdvancedEditorField({ key: "seo.title", label: "Search title" })).toBe(true);
    expect(isAdvancedEditorField({ key: "order", label: "Order", type: "number" })).toBe(true);
    expect(isAdvancedEditorField({ key: "slug", label: "Slug", required: true })).toBe(false);
    expect(isAdvancedEditorField({ key: "title", label: "Title", required: true })).toBe(false);
    expect(editorFieldGuidance({ key: "order", label: "Order", type: "number" })).toContain(
      "Lower numbers appear first",
    );
  });

  it("uses status-aware save labels so live edits cannot be mistaken for drafts", async () => {
    const { editorSavePresentation } = await import("@/components/admin/content-manager");

    expect(editorSavePresentation(null, "page")).toMatchObject({
      actionLabel: "Save draft",
      live: false,
    });
    expect(editorSavePresentation({ _id: "page-1", status: "published" }, "page")).toMatchObject({
      actionLabel: "Update live page",
      live: true,
    });
    expect(editorSavePresentation({ _id: "page-2", status: "scheduled" }, "page")).toMatchObject({
      actionLabel: "Update scheduled page",
      live: false,
    });
  });
});
