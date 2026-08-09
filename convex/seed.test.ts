import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

async function insertAdmin(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("users", {
      clerkUserId: "seed-admin",
      email: "seed-admin@example.test",
      name: "Seed administrator",
      roles: ["admin"],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });
  return t.withIdentity({ subject: "seed-admin" });
}

describe("baseline seed", () => {
  it("restores frontend content as admin-managed records without overwriting later edits", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await insertAdmin(t);

    const first = await asAdmin.mutation(api.seed.baseline, {});
    expect(first.created).toBeGreaterThan(0);

    const seeded = await t.run(async (ctx) => ({
      settings: await ctx.db
        .query("siteSettings")
        .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
        .unique(),
      navigation: await ctx.db.query("navigationItems").collect(),
      pages: await ctx.db.query("pages").collect(),
      facilities: await ctx.db.query("facilities").collect(),
      programs: await ctx.db.query("programs").collect(),
      news: await ctx.db.query("news").collect(),
      notices: await ctx.db.query("notices").collect(),
      events: await ctx.db.query("events").collect(),
      leadership: await ctx.db.query("leadership").collect(),
      testimonials: await ctx.db.query("testimonials").collect(),
      albums: await ctx.db.query("galleryAlbums").collect(),
      galleryItems: await ctx.db.query("galleryItems").collect(),
      sections: await ctx.db.query("homeSections").collect(),
      highlights: await ctx.db.query("homeHighlights").collect(),
    }));

    expect(seeded.settings).toMatchObject({
      logoUrl: "/media/nps-logo.png",
      faviconUrl: "/media/nps-logo.png",
      tagline: "Better Schooling for Ideal Citizenship",
      contact: {
        address: "Basbitti Jingadiya, Garuda Municipality-8, Rautahat",
        city: "Garuda",
        country: "Nepal",
        phone: "9855021699",
        email: "mrpschool@nepalpolice.gov.np",
        officeHours: "School office hours are published through official notices.",
      },
    });
    expect(seeded.pages.map((page) => page.slug)).toEqual(
      expect.arrayContaining(["about", "about/history", "about/mission-vision", "facilities"]),
    );
    expect(seeded.facilities).toHaveLength(12);
    expect(
      seeded.facilities
        .filter((facility) => facility.verificationStatus === "school_confirmation_required")
        .map((facility) => facility.slug),
    ).toEqual(["science-laboratory", "indoor-sports", "transportation", "auditorium-multipurpose-hall"]);
    expect(seeded.news).toHaveLength(3);
    expect(seeded.news.every((story) => story.status === "published")).toBe(true);
    expect(seeded.notices.map((notice) => notice.status)).toEqual(
      expect.arrayContaining(["published", "archived", "draft"]),
    );
    expect(seeded.events).toHaveLength(1);
    expect(seeded.events[0]).toMatchObject({
      slug: "sample-school-event-template",
      status: "draft",
      registrationEnabled: false,
    });
    expect(seeded.programs.map((program) => program.slug)).toEqual(
      expect.arrayContaining(["primary", "secondary", "plus-2"]),
    );
    expect(seeded.leadership.map((member) => member.slug)).toEqual([
      "principal",
      "vice-principal",
      "commandant",
      "pastoral-vice-principal",
    ]);
    expect(seeded.leadership.find((member) => member.slug === "principal")).toMatchObject({
      name: "Ramsharan Rijal",
      role: "Principal",
    });
    expect(seeded.testimonials.map((testimonial) => testimonial.name)).toEqual([
      "Alumni voices",
      "Share your story",
    ]);
    expect(seeded.albums).toHaveLength(6);
    expect(seeded.galleryItems).toHaveLength(8);
    expect(seeded.sections.find((section) => section.slug === "about")).toMatchObject({
      imageUrl: "/media/nps-campus-building.png",
      secondaryImageUrl: "/media/nps-hero-gate.png",
    });
    expect(
      seeded.highlights
        .filter((highlight) => highlight.section === "eca")
        .every((highlight) => Boolean(highlight.imageUrl)),
    ).toBe(true);

    const headerRoots = seeded.navigation.filter(
      (item) => item.location === "header" && item.parentId === undefined,
    );
    const updates = headerRoots.find((item) => item.label === "Updates");
    const academics = headerRoots.find((item) => item.label === "Academics");
    expect(headerRoots.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        "Home",
        "About",
        "Academics",
        "School life",
        "Facilities",
        "Admissions",
        "Updates",
      ]),
    );
    expect(headerRoots.filter((item) => item.href === "/facilities")).toHaveLength(1);
    expect(
      seeded.navigation.filter(
        (item) => item.location === "header" && item.parentId !== undefined && item.href === "/facilities",
      ),
    ).toHaveLength(0);
    expect(
      seeded.navigation.filter((item) => item.parentId === updates?._id).map((item) => item.label),
    ).toEqual(["News", "Notices", "Events", "Downloads"]);
    expect(
      seeded.navigation.find((item) => item.parentId === academics?._id && item.href === "/teachers"),
    ).toMatchObject({ label: "Teachers" });
    expect(
      seeded.navigation
        .filter((item) => item.location === "footer" && item.parentId === undefined)
        .map((item) => item.label),
    ).toEqual(expect.arrayContaining(["School", "Learning", "Information"]));
    expect(seeded.navigation.filter((item) => item.location === "utility").map((item) => item.label)).toEqual(
      ["Accessibility", "Contact", "Staff sign in"],
    );

    await t.run(async (ctx) => {
      const about = await ctx.db
        .query("homeSections")
        .withIndex("by_slug", (q) => q.eq("slug", "about"))
        .unique();
      const principal = await ctx.db
        .query("leadership")
        .withIndex("by_slug", (q) => q.eq("slug", "principal"))
        .unique();
      const library = await ctx.db
        .query("facilities")
        .withIndex("by_slug", (q) => q.eq("slug", "library"))
        .unique();
      if (!about || !principal || !library) throw new Error("Expected seeded records.");
      await ctx.db.patch("homeSections", about._id, {
        heading: "An administrator-authored heading",
        imageUrl: "/media/custom-campus.jpg",
      });
      await ctx.db.patch("leadership", principal._id, {
        name: "Verified principal name",
      });
      await ctx.db.patch("facilities", library._id, {
        summary: "Administrator-confirmed library information.",
      });
    });

    const second = await asAdmin.mutation(api.seed.baseline, {});
    expect(second).toMatchObject({ created: 0, updated: 0 });

    const preserved = await t.run(async (ctx) => ({
      about: await ctx.db
        .query("homeSections")
        .withIndex("by_slug", (q) => q.eq("slug", "about"))
        .unique(),
      principal: await ctx.db
        .query("leadership")
        .withIndex("by_slug", (q) => q.eq("slug", "principal"))
        .unique(),
      library: await ctx.db
        .query("facilities")
        .withIndex("by_slug", (q) => q.eq("slug", "library"))
        .unique(),
    }));
    expect(preserved.about).toMatchObject({
      heading: "An administrator-authored heading",
      imageUrl: "/media/custom-campus.jpg",
    });
    expect(preserved.principal?.name).toBe("Verified principal name");
    expect(preserved.library?.summary).toBe("Administrator-confirmed library information.");
  });

  it("migrates legacy programme routes while retaining admin-authored programme copy", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await insertAdmin(t);
    await t.run(async (ctx) => {
      const admin = await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", "seed-admin"))
        .unique();
      if (!admin) throw new Error("Expected seed administrator.");
      const now = Date.now();
      await ctx.db.insert("programs", {
        slug: "primary-education",
        name: "Administrator's primary programme",
        shortDescription: "Copy already reviewed by the academic office.",
        description: "This programme copy must survive the route migration.",
        outcomes: ["Verified outcome"],
        featured: true,
        order: 20,
        seo: { noIndex: false },
        status: "published",
        publishedAt: now,
        createdBy: admin._id,
        updatedBy: admin._id,
        createdAt: now,
        updatedAt: now,
      });
    });

    await asAdmin.mutation(api.seed.baseline, {});
    const programs = await t.run(async (ctx) => await ctx.db.query("programs").collect());
    const migrated = programs.find((program) => program.slug === "primary");
    expect(migrated).toMatchObject({
      name: "Administrator's primary programme",
      shortDescription: "Copy already reviewed by the academic office.",
      description: "This programme copy must survive the route migration.",
    });
    expect(programs.some((program) => program.slug === "primary-education")).toBe(false);
  });

  it("promotes the legacy Facilities child to one visible top-level link", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await insertAdmin(t);
    await t.run(async (ctx) => {
      const admin = await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", "seed-admin"))
        .unique();
      if (!admin) throw new Error("Expected seed administrator.");
      const now = Date.now();
      const schoolLifeId = await ctx.db.insert("navigationItems", {
        label: "School life",
        href: "/campus-life",
        location: "header",
        order: 30,
        external: false,
        visible: true,
        createdBy: admin._id,
        updatedBy: admin._id,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("navigationItems", {
        label: "Facilities",
        href: "/campus-life/facilities",
        location: "header",
        parentId: schoolLifeId,
        order: 10,
        external: false,
        visible: true,
        createdBy: admin._id,
        updatedBy: admin._id,
        createdAt: now,
        updatedAt: now,
      });
    });

    await asAdmin.mutation(api.seed.baseline, {});
    const facilitiesLinks = await t.run(async (ctx) =>
      (await ctx.db.query("navigationItems").collect()).filter(
        (item) => item.location === "header" && item.label === "Facilities",
      ),
    );
    expect(facilitiesLinks.filter((item) => item.parentId === undefined && item.visible)).toHaveLength(1);
    expect(facilitiesLinks.filter((item) => item.parentId !== undefined)).toEqual([
      expect.objectContaining({ href: "/facilities", visible: false }),
    ]);

    await asAdmin.mutation(api.seed.baseline, {});
    const rerunFacilitiesLinks = await t.run(async (ctx) =>
      (await ctx.db.query("navigationItems").collect()).filter(
        (item) => item.location === "header" && item.label === "Facilities",
      ),
    );
    expect(rerunFacilitiesLinks).toHaveLength(2);
  });

  it("adopts legacy School-life records without creating duplicate navigation or hero cards", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = await insertAdmin(t);
    await t.run(async (ctx) => {
      const admin = await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", "seed-admin"))
        .unique();
      if (!admin) throw new Error("Expected seed administrator.");
      const now = Date.now();
      const footerParentId = await ctx.db.insert("navigationItems", {
        label: "School",
        href: "/about",
        location: "footer",
        order: 10,
        external: false,
        visible: true,
        createdBy: admin._id,
        updatedBy: admin._id,
        createdAt: now,
        updatedAt: now,
      });
      for (const navigation of [
        { location: "header" as const, parentId: undefined },
        { location: "footer" as const, parentId: footerParentId },
      ]) {
        await ctx.db.insert("navigationItems", {
          label: "Campus life",
          href: "/campus-life",
          location: navigation.location,
          ...(navigation.parentId ? { parentId: navigation.parentId } : {}),
          order: 30,
          external: false,
          visible: true,
          createdBy: admin._id,
          updatedBy: admin._id,
          createdAt: now,
          updatedAt: now,
        });
      }
      await ctx.db.insert("homeHighlights", {
        section: "hero",
        title: "Campus life",
        summary: "A campus built around discipline, dignity, and decorum.",
        imageUrl: "/media/campus-hero.png",
        imageAlt: "Students on the school campus",
        order: 10,
        status: "published",
        publishedAt: now,
        createdBy: admin._id,
        updatedBy: admin._id,
        createdAt: now,
        updatedAt: now,
      });
    });

    await asAdmin.mutation(api.seed.baseline, {});
    const migrated = await t.run(async (ctx) => ({
      navigation: (await ctx.db.query("navigationItems").collect()).filter(
        (item) => item.href === "/campus-life",
      ),
      highlights: (await ctx.db.query("homeHighlights").collect()).filter(
        (item) => item.section === "hero" && item.imageUrl === "/media/campus-hero.png",
      ),
    }));
    expect(migrated.navigation).toHaveLength(3);
    expect(migrated.navigation.filter((item) => item.label === "School life")).toHaveLength(2);
    expect(migrated.highlights).toHaveLength(1);
    expect(migrated.highlights[0]).toMatchObject({
      title: "School life",
      summary: "A school built around discipline, dignity, and decorum.",
      imageAlt: "Students on the school grounds",
    });

    await asAdmin.mutation(api.seed.baseline, {});
    const rerun = await t.run(async (ctx) => ({
      navigation: (await ctx.db.query("navigationItems").collect()).filter(
        (item) => item.href === "/campus-life",
      ),
      highlights: (await ctx.db.query("homeHighlights").collect()).filter(
        (item) => item.section === "hero" && item.imageUrl === "/media/campus-hero.png",
      ),
    }));
    expect(rerun.navigation).toHaveLength(3);
    expect(rerun.highlights).toHaveLength(1);
  });
});
