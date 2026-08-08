import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("school wording migration", () => {
  it("renames public copy without changing established routes or media URLs", async () => {
    const t = convexTest(schema, modules);
    const adminId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("users", {
        clerkUserId: "admin-user",
        email: "admin@example.test",
        name: "Administrator",
        roles: ["admin"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    });
    const records = await t.run(async (ctx) => {
      const now = Date.now();
      const navigationId = await ctx.db.insert("navigationItems", {
        label: "Campus life",
        href: "/campus-life",
        location: "header",
        order: 30,
        external: false,
        visible: true,
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: now,
        updatedAt: now,
      });
      const sectionId = await ctx.db.insert("homeSections", {
        slug: "gallery",
        heading: "Moments from our campus",
        imageUrl: "/media/nps-campus-building.png",
        imageAlt: "Nepal Police School campus building",
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: now,
        updatedAt: now,
      });
      const highlightId = await ctx.db.insert("homeHighlights", {
        section: "hero",
        title: "Campus life",
        summary: "A campus built around discipline.",
        imageUrl: "/media/campus-hero.png",
        imageAlt: "Students on the school campus",
        order: 10,
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: now,
        updatedAt: now,
      });
      const albumId = await ctx.db.insert("galleryAlbums", {
        slug: "campus-life",
        title: "Campus life",
        description: "Daily life across the school campus.",
        coverImageUrl: "/media/campus-hero.png",
        featured: true,
        order: 10,
        seo: { title: "Campus life", description: "Campus photographs" },
        status: "published",
        createdBy: adminId,
        updatedBy: adminId,
        createdAt: now,
        updatedAt: now,
      });
      const galleryItemId = await ctx.db.insert("galleryItems", {
        albumId,
        url: "/media/campus-hero.png",
        mediaType: "image",
        alt: "Students on the school campus",
        caption: "Campus life",
        order: 0,
        visible: true,
        createdBy: adminId,
        createdAt: now,
        updatedAt: now,
      });
      return { navigationId, sectionId, highlightId, albumId, galleryItemId };
    });

    const asAdmin = t.withIdentity({ subject: "admin-user" });
    await expect(asAdmin.mutation(api.copyMaintenance.renameSchoolCopy, {})).resolves.toEqual({
      updated: 5,
    });

    const migrated = await t.run(async (ctx) => ({
      navigation: await ctx.db.get("navigationItems", records.navigationId),
      section: await ctx.db.get("homeSections", records.sectionId),
      highlight: await ctx.db.get("homeHighlights", records.highlightId),
      album: await ctx.db.get("galleryAlbums", records.albumId),
      galleryItem: await ctx.db.get("galleryItems", records.galleryItemId),
    }));
    expect(migrated.navigation).toMatchObject({ label: "School life", href: "/campus-life" });
    expect(migrated.section).toMatchObject({
      heading: "Moments from our school",
      imageUrl: "/media/nps-campus-building.png",
      imageAlt: "Nepal Police School building",
    });
    expect(migrated.highlight).toMatchObject({
      title: "School life",
      summary: "A school built around discipline.",
      imageUrl: "/media/campus-hero.png",
      imageAlt: "Students on the school grounds",
    });
    expect(migrated.album).toMatchObject({
      slug: "campus-life",
      title: "School life",
      description: "Daily life across the school grounds.",
      coverImageUrl: "/media/campus-hero.png",
      seo: { title: "School life", description: "School photographs" },
    });
    expect(migrated.galleryItem).toMatchObject({
      url: "/media/campus-hero.png",
      alt: "Students on the school grounds",
      caption: "School life",
    });
    await expect(asAdmin.mutation(api.copyMaintenance.renameSchoolCopy, {})).resolves.toEqual({
      updated: 0,
    });
  });
});
