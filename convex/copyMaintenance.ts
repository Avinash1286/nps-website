import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";

function replaceLegacySchoolWording(value: string): string {
  return value
    .replace(/\bschool campus building\b/gi, (match) =>
      match.startsWith("School") ? "School building" : "school building",
    )
    .replace(/\bschool campus\b/gi, (match) =>
      match.startsWith("School") ? "School grounds" : "school grounds",
    )
    .replace(/\bcampus\b/gi, (match) => {
      if (match === match.toUpperCase()) return "SCHOOL";
      return match[0] === match[0]?.toUpperCase() ? "School" : "school";
    });
}

function replaceTextFields<T extends object, K extends keyof T>(row: T, fields: readonly K[]) {
  const patch: Partial<Pick<T, K>> = {};
  for (const field of fields) {
    const current = row[field];
    if (typeof current !== "string") continue;
    const next = replaceLegacySchoolWording(current);
    if (next !== current) Object.assign(patch, { [field]: next });
  }
  return patch;
}

function hasFields(value: object): boolean {
  return Object.keys(value).length > 0;
}

function replaceSeoCopy(seo: Doc<"galleryAlbums">["seo"]): Doc<"galleryAlbums">["seo"] | null {
  const title = seo.title ? replaceLegacySchoolWording(seo.title) : seo.title;
  const description = seo.description ? replaceLegacySchoolWording(seo.description) : seo.description;
  if (title === seo.title && description === seo.description) return null;
  return { ...seo, title, description };
}

async function requireInternalMigrationActor(ctx: MutationCtx): Promise<Doc<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", "system:seed"))
    .unique();
  if (existing) return existing;
  const now = Date.now();
  const id = await ctx.db.insert("users", {
    clerkUserId: "system:seed",
    email: "seed-system@nps.invalid",
    name: "Convex seed service",
    roles: [],
    status: "suspended",
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get("users", id))!;
}

function assertBelowLimit(rows: unknown[], limit: number, table: string): void {
  if (rows.length === limit) {
    throw new Error(`${table} wording migration stopped at its safe ${limit}-record limit.`);
  }
}

/**
 * One-time, re-runnable copy migration. Technical routes and media URLs keep
 * their established `/campus-life` and `campus-*` values so public links and
 * existing assets remain backwards compatible.
 */
async function applySchoolCopyMigration(ctx: MutationCtx, actor: Doc<"users">): Promise<{ updated: number }> {
  const now = Date.now();
  let updated = 0;

  const navigation = await ctx.db.query("navigationItems").take(500);
  assertBelowLimit(navigation, 500, "navigationItems");
  for (const row of navigation) {
    const patch = replaceTextFields(row, ["label", "description"] as const);
    if (!hasFields(patch)) continue;
    await ctx.db.patch("navigationItems", row._id, { ...patch, updatedBy: actor._id, updatedAt: now });
    updated += 1;
  }

  const sections = await ctx.db.query("homeSections").take(100);
  assertBelowLimit(sections, 100, "homeSections");
  for (const row of sections) {
    const patch = replaceTextFields(row, [
      "eyebrow",
      "heading",
      "body",
      "secondaryBody",
      "imageAlt",
      "ctaLabel",
    ] as const);
    if (!hasFields(patch)) continue;
    await ctx.db.patch("homeSections", row._id, { ...patch, updatedBy: actor._id, updatedAt: now });
    updated += 1;
  }

  const highlights = await ctx.db.query("homeHighlights").take(200);
  assertBelowLimit(highlights, 200, "homeHighlights");
  for (const row of highlights) {
    const patch = replaceTextFields(row, ["title", "summary", "imageAlt"] as const);
    if (!hasFields(patch)) continue;
    await ctx.db.patch("homeHighlights", row._id, { ...patch, updatedBy: actor._id, updatedAt: now });
    updated += 1;
  }

  const albums = await ctx.db.query("galleryAlbums").take(200);
  assertBelowLimit(albums, 200, "galleryAlbums");
  for (const row of albums) {
    const copyPatch = replaceTextFields(row, ["title", "description"] as const);
    const seo = replaceSeoCopy(row.seo);
    if (!hasFields(copyPatch) && !seo) continue;
    await ctx.db.patch("galleryAlbums", row._id, {
      ...copyPatch,
      ...(seo ? { seo } : {}),
      updatedBy: actor._id,
      updatedAt: now,
    });
    updated += 1;
  }

  const galleryItems = await ctx.db.query("galleryItems").take(1_000);
  assertBelowLimit(galleryItems, 1_000, "galleryItems");
  for (const row of galleryItems) {
    const patch = replaceTextFields(row, ["alt", "caption", "credit"] as const);
    if (!hasFields(patch)) continue;
    await ctx.db.patch("galleryItems", row._id, { ...patch, updatedAt: now });
    updated += 1;
  }

  await writeAudit(ctx, actor, {
    action: "content.copy_renamed",
    entityType: "system",
    summary: `School wording migration completed (${updated} records updated).`,
  });
  return { updated };
}

export const renameSchoolCopy = mutation({
  args: {},
  returns: v.object({ updated: v.number() }),
  handler: async (ctx) => {
    const actor = await requireRole(ctx, ["admin"]);
    return await applySchoolCopyMigration(ctx, actor);
  },
});

export const renameSchoolCopyInternal = internalMutation({
  args: {},
  returns: v.object({ updated: v.number() }),
  handler: async (ctx) => {
    const actor = await requireInternalMigrationActor(ctx);
    return await applySchoolCopyMigration(ctx, actor);
  },
});
