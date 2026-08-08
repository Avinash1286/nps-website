import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

async function insertUser(
  t: ReturnType<typeof convexTest>,
  clerkUserId: string,
  roles: Array<"admin" | "publisher" | "editor" | "admissions">,
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      clerkUserId,
      email: `${clerkUserId}@example.test`,
      name: clerkUserId,
      roles,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });
}

describe("home page content", () => {
  it("publishes admin-authored section copy to the public query", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "publisher-user", ["publisher"]);
    const asPublisher = t.withIdentity({ subject: "publisher-user" });

    await asPublisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "homeSections",
        data: {
          slug: "about",
          eyebrow: "Our school",
          heading: "A verified heading from the CMS",
          body: "Lead paragraph maintained by school staff.",
          ctaLabel: "Read more",
          ctaHref: "/about",
          status: "published",
        },
      },
    });

    const sections = await t.query(api.content.listHomeSections, {});
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      slug: "about",
      heading: "A verified heading from the CMS",
      ctaHref: "/about",
    });
  });

  it("hides unpublished sections and cards from the public queries", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "editor-user", ["editor"]);
    const asEditor = t.withIdentity({ subject: "editor-user" });

    // An editor cannot publish, so this stays a draft.
    await asEditor.mutation(api.admin.upsertContent, {
      payload: {
        type: "homeSections",
        data: { slug: "eca", heading: "Draft heading" },
      },
    });
    await asEditor.mutation(api.admin.upsertContent, {
      payload: {
        type: "homeHighlights",
        data: { section: "eca", title: "Draft activity" },
      },
    });

    await expect(t.query(api.content.listHomeSections, {})).resolves.toEqual([]);
    await expect(t.query(api.content.listHomeHighlights, { section: "eca" })).resolves.toEqual([]);
  });

  it("returns published cards for the requested section only, in display order", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "admin-user", ["admin"]);
    const asAdmin = t.withIdentity({ subject: "admin-user" });

    for (const [section, title, order] of [
      ["eca", "Second activity", 20],
      ["eca", "First activity", 10],
      ["about", "A pillar", 10],
    ] as const) {
      await asAdmin.mutation(api.admin.upsertContent, {
        payload: {
          type: "homeHighlights",
          data: { section, title, order, status: "published", href: "/campus-life/activities" },
        },
      });
    }

    const eca = await t.query(api.content.listHomeHighlights, { section: "eca" });
    expect(eca.map((row) => row.title)).toEqual(["First activity", "Second activity"]);

    const about = await t.query(api.content.listHomeHighlights, { section: "about" });
    expect(about.map((row) => row.title)).toEqual(["A pillar"]);
  });

  it("rejects an unknown section key and an unsafe link target", async () => {
    const t = convexTest(schema, modules);
    await insertUser(t, "admin-user", ["admin"]);
    const asAdmin = t.withIdentity({ subject: "admin-user" });

    await expect(
      asAdmin.mutation(api.admin.upsertContent, {
        payload: {
          type: "homeSections",
          // @ts-expect-error "footer" intentionally exercises the runtime validator.
          data: { slug: "footer", heading: "Not a home section" },
        },
      }),
    ).rejects.toThrow();

    await expect(
      asAdmin.mutation(api.admin.upsertContent, {
        payload: {
          type: "homeHighlights",
          data: { section: "eca", title: "Bad link", href: "javascript:alert(1)" },
        },
      }),
    ).rejects.toThrow();
  });

  it("refuses to delete a media asset that a home section still references", async () => {
    const t = convexTest(schema, modules);
    const adminId = await insertUser(t, "admin-user", ["admin"]);
    const asAdmin = t.withIdentity({ subject: "admin-user" });

    const storageId = await t.run(async (ctx) => await ctx.storage.store(new Blob(["image"])));
    const mediaId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("mediaAssets", {
        storageId,
        fileName: "hero.png",
        mimeType: "image/png",
        size: 5,
        status: "ready",
        uploadedBy: adminId,
        createdAt: now,
        updatedAt: now,
      });
    });

    await asAdmin.mutation(api.admin.upsertContent, {
      payload: {
        type: "homeSections",
        data: { slug: "hero", heading: "Hero", imageId: storageId, status: "published" },
      },
    });

    await expect(asAdmin.mutation(api.media.deleteMedia, { mediaId })).rejects.toThrow();
  });
});
