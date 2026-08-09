import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

const ADMIN_SUBJECT = "clerk_facilities_admin";

async function createAdmin(t: ReturnType<typeof convexTest>): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      clerkUserId: ADMIN_SUBJECT,
      email: "facilities-admin@example.com",
      name: "Facilities Admin",
      roles: ["admin"],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });
}

function facilityData(slug: string, order: number, overrides: Record<string, unknown> = {}) {
  return {
    slug,
    name: slug === "library" ? "Library" : "Science Laboratories",
    summary: `Published information about the ${slug}.`,
    details: "A maintained facility supporting student learning.",
    iconKey: slug === "library" ? ("library" as const) : ("science" as const),
    verificationStatus: "confirmed" as const,
    featured: order === 10,
    order,
    seo: { noIndex: false },
    status: "published" as const,
    ...overrides,
  };
}

describe("facilities content", () => {
  it("supports admin CRUD input and returns only published facilities in display order", async () => {
    const t = convexTest(schema, modules);
    await createAdmin(t);
    const admin = t.withIdentity({ subject: ADMIN_SUBJECT });

    await admin.mutation(api.admin.upsertContent, {
      payload: { type: "facilities", data: facilityData("science-laboratories", 20) },
    });
    await admin.mutation(api.admin.upsertContent, {
      payload: { type: "facilities", data: facilityData("library", 10) },
    });
    await admin.mutation(api.admin.upsertContent, {
      payload: {
        type: "facilities",
        data: facilityData("future-facility", 5, { status: "draft" }),
      },
    });

    const facilities = await t.query(api.content.listFacilities, { limit: 20 });
    expect(facilities.map((facility) => facility.slug)).toEqual(["library", "science-laboratories"]);
    expect(facilities[0]).toMatchObject({
      name: "Library",
      iconKey: "library",
      verificationStatus: "confirmed",
      featured: true,
      order: 10,
    });
  });

  it("requires accessible image text, HTTPS sources, and unique slugs", async () => {
    const t = convexTest(schema, modules);
    await createAdmin(t);
    const admin = t.withIdentity({ subject: ADMIN_SUBJECT });

    await expect(
      admin.mutation(api.admin.upsertContent, {
        payload: {
          type: "facilities",
          data: facilityData("computer-lab", 10, { imageUrl: "/media/computer-lab.jpg" }),
        },
      }),
    ).rejects.toThrow("Add an image description");

    await expect(
      admin.mutation(api.admin.upsertContent, {
        payload: {
          type: "facilities",
          data: facilityData("computer-lab", 10, {
            sourceUrl: "http://example.com/facility",
          }),
        },
      }),
    ).rejects.toThrow("public HTTPS address");

    await admin.mutation(api.admin.upsertContent, {
      payload: {
        type: "facilities",
        data: facilityData("computer-lab", 10, {
          sourceLabel: "School publication",
          sourceUrl: "https://example.com/facility",
        }),
      },
    });
    await expect(
      admin.mutation(api.admin.upsertContent, {
        payload: {
          type: "facilities",
          data: facilityData("computer-lab", 20),
        },
      }),
    ).rejects.toThrow("slug");
  });

  it("publishes scheduled facilities and protects referenced storage", async () => {
    const t = convexTest(schema, modules);
    const userId = await createAdmin(t);
    const admin = t.withIdentity({ subject: ADMIN_SUBJECT });
    const now = Date.now();
    const scheduledId = await t.run(async (ctx) => {
      return await ctx.db.insert("facilities", {
        slug: "sports-ground",
        name: "Sports Ground",
        summary: "Outdoor space for sports and physical education.",
        iconKey: "sports",
        verificationStatus: "confirmed",
        featured: false,
        order: 30,
        seo: { noIndex: false },
        status: "scheduled",
        publishAt: now - 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(
      t.mutation(internal.jobs.transitionContent, {
        type: "facilities",
        id: scheduledId,
        transition: "publish",
      }),
    ).resolves.toEqual({ changed: true });

    const blob = new Blob(["facility-image"], { type: "image/png" });
    const storageId = await t.run(async (ctx) => await ctx.storage.store(blob));
    const mediaId = await admin.mutation(api.media.finalizeUpload, {
      storageId,
      fileName: "sports-ground.png",
      mimeType: "image/png",
      size: blob.size,
      alt: "Students using the sports ground",
      folder: "facilities",
    });
    await admin.mutation(api.admin.upsertContent, {
      payload: {
        type: "facilities",
        data: facilityData("sports-ground-image", 40, {
          imageId: storageId,
          imageAlt: "Students using the sports ground",
        }),
      },
    });

    await expect(admin.mutation(api.media.deleteMedia, { mediaId })).rejects.toThrow(
      "Remove this file from facilities",
    );
    const published = await t.query(api.content.listFacilities, { limit: 20 });
    expect(published.some((facility) => facility.slug === "sports-ground")).toBe(true);
  });
});
