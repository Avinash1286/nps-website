import { ConvexError, v } from "convex/values";
import { paginationResultValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { optionalMediaUrl, plainText } from "./lib/input";
import { boundedPaginationOpts, paginationOptsValidator } from "./lib/validators";
import { writeAudit } from "./lib/audit";

const MEDIA_ROLES = ["admin", "publisher", "editor"] as const;
const MEDIA_PUBLISH_ROLES = ["admin", "publisher"] as const;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const mediaAssetValidator = v.object({
  _id: v.id("mediaAssets"),
  _creationTime: v.number(),
  storageId: v.id("_storage"),
  fileName: v.string(),
  mimeType: v.string(),
  size: v.number(),
  alt: v.optional(v.string()),
  folder: v.optional(v.string()),
  url: v.optional(v.string()),
  status: v.union(v.literal("ready"), v.literal("deleted")),
  uploadedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
});

const galleryItemValidator = v.object({
  _id: v.id("galleryItems"),
  _creationTime: v.number(),
  albumId: v.id("galleryAlbums"),
  storageId: v.optional(v.id("_storage")),
  url: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  mediaType: v.union(v.literal("image"), v.literal("video")),
  alt: v.string(),
  caption: v.optional(v.string()),
  credit: v.optional(v.string()),
  order: v.number(),
  visible: v.boolean(),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function allowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

function cleanFolder(folder?: string): string | undefined {
  if (!folder) return undefined;
  const cleaned = folder
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, "-")
    .replace(/\/{2,}/g, "/");
  if (!cleaned || cleaned.length > 120 || cleaned.startsWith("/") || cleaned.includes("..")) {
    throw new ConvexError({ code: "INVALID_FOLDER", message: "Invalid media folder." });
  }
  return cleaned;
}

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireRole(ctx, MEDIA_ROLES);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeUpload = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    alt: v.optional(v.string()),
    folder: v.optional(v.string()),
  },
  returns: v.id("mediaAssets"),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, MEDIA_ROLES);
    const fileName = plainText(args.fileName, "File name", 1, 240);
    const mimeType = args.mimeType.trim().toLowerCase();
    if (!allowedMimeType(mimeType)) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError({ code: "UNSUPPORTED_MEDIA", message: "This file type is not supported." });
    }
    if (!Number.isSafeInteger(args.size) || args.size <= 0 || args.size > MAX_FILE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError({ code: "FILE_TOO_LARGE", message: "Files must be 50 MB or smaller." });
    }
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata)
      throw new ConvexError({ code: "UPLOAD_MISSING", message: "The uploaded file was not found." });
    if (metadata.size !== args.size || (metadata.contentType && metadata.contentType !== mimeType)) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError({ code: "UPLOAD_MISMATCH", message: "Uploaded file metadata did not match." });
    }
    const existing = await ctx.db
      .query("mediaAssets")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (existing) return existing._id;
    const now = Date.now();
    const url = await ctx.storage.getUrl(args.storageId);
    const id = await ctx.db.insert("mediaAssets", {
      storageId: args.storageId,
      fileName,
      mimeType,
      size: args.size,
      alt: args.alt ? plainText(args.alt, "Alternative text", 1, 300) : undefined,
      folder: cleanFolder(args.folder),
      url: url ?? undefined,
      status: "ready",
      uploadedBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, actor, {
      action: "media.uploaded",
      entityType: "mediaAssets",
      entityId: id,
      summary: `Uploaded ${fileName}.`,
      metadata: { mimeType, size: String(args.size) },
    });
    return id;
  },
});

async function findStorageReference(
  ctx: Parameters<typeof requireRole>[0],
  storageId: any,
  mediaUrl?: string,
) {
  const idChecks: Array<[string, string, string, unknown]> = [
    ["siteSettings", "by_logo_id", "logoId", storageId],
    ["siteSettings", "by_favicon_id", "faviconId", storageId],
    ["pages", "by_hero_image_id", "heroImageId", storageId],
    ["programs", "by_hero_image_id", "heroImageId", storageId],
    ["leadership", "by_photo_id", "photoId", storageId],
    ["teachers", "by_photo_id", "photoId", storageId],
    ["news", "by_featured_image_id", "featuredImageId", storageId],
    ["notices", "by_attachment_id", "attachmentId", storageId],
    ["events", "by_featured_image_id", "featuredImageId", storageId],
    ["documents", "by_storage_id", "storageId", storageId],
    ["galleryAlbums", "by_cover_image_id", "coverImageId", storageId],
    ["galleryItems", "by_storage_id", "storageId", storageId],
    ["testimonials", "by_photo_id", "photoId", storageId],
    ["homeSections", "by_image_id", "imageId", storageId],
    ["homeSections", "by_secondary_image_id", "secondaryImageId", storageId],
    ["homeHighlights", "by_image_id", "imageId", storageId],
  ];
  const urlChecks: Array<[string, string, string, unknown]> = mediaUrl
    ? [
        ["siteSettings", "by_logo_url", "logoUrl", mediaUrl],
        ["siteSettings", "by_favicon_url", "faviconUrl", mediaUrl],
        ["pages", "by_hero_image_url", "heroImageUrl", mediaUrl],
        ["programs", "by_hero_image_url", "heroImageUrl", mediaUrl],
        ["leadership", "by_photo_url", "photoUrl", mediaUrl],
        ["teachers", "by_photo_url", "photoUrl", mediaUrl],
        ["news", "by_featured_image_url", "featuredImageUrl", mediaUrl],
        ["notices", "by_attachment_url", "attachmentUrl", mediaUrl],
        ["events", "by_featured_image_url", "featuredImageUrl", mediaUrl],
        ["documents", "by_external_url", "externalUrl", mediaUrl],
        ["galleryAlbums", "by_cover_image_url", "coverImageUrl", mediaUrl],
        ["galleryItems", "by_url", "url", mediaUrl],
        ["galleryItems", "by_thumbnail_url", "thumbnailUrl", mediaUrl],
        ["testimonials", "by_photo_url", "photoUrl", mediaUrl],
        ["homeSections", "by_image_url", "imageUrl", mediaUrl],
        ["homeSections", "by_secondary_image_url", "secondaryImageUrl", mediaUrl],
        ["homeHighlights", "by_image_url", "imageUrl", mediaUrl],
      ]
    : [];
  for (const [table, index, field, target] of [...idChecks, ...urlChecks]) {
    const reference = await (ctx.db.query(table as any) as any)
      .withIndex(index, (q: any) => q.eq(field, target))
      .first();
    if (reference) return { table, id: reference._id as string };
  }
  return null;
}

export const deleteMedia = mutation({
  args: { mediaId: v.id("mediaAssets") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, MEDIA_ROLES);
    const media = await ctx.db.get("mediaAssets", args.mediaId);
    if (!media || media.status === "deleted") return { ok: true };
    const reference = await findStorageReference(ctx, media.storageId, media.url);
    if (reference) {
      throw new ConvexError({
        code: "MEDIA_IN_USE",
        message: `Remove this file from ${reference.table} before deleting it.`,
      });
    }
    await ctx.storage.delete(media.storageId);
    const now = Date.now();
    await ctx.db.patch("mediaAssets", media._id, {
      status: "deleted",
      deletedAt: now,
      url: undefined,
      updatedAt: now,
    });
    await writeAudit(ctx, actor, {
      action: "media.deleted",
      entityType: "mediaAssets",
      entityId: media._id,
      summary: `Deleted ${media.fileName}.`,
    });
    return { ok: true };
  },
});

export const listMedia = query({
  args: { paginationOpts: paginationOptsValidator, folder: v.optional(v.string()) },
  returns: paginationResultValidator(mediaAssetValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, MEDIA_ROLES);
    const page = args.folder
      ? await ctx.db
          .query("mediaAssets")
          .withIndex("by_folder_and_status_and_created_at", (q) =>
            q.eq("folder", cleanFolder(args.folder)).eq("status", "ready"),
          )
          .order("desc")
          .paginate(boundedPaginationOpts(args.paginationOpts))
      : await ctx.db
          .query("mediaAssets")
          .withIndex("by_status_created_at", (q) => q.eq("status", "ready"))
          .order("desc")
          .paginate(boundedPaginationOpts(args.paginationOpts));
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (asset) => ({
          ...asset,
          url: (await ctx.storage.getUrl(asset.storageId)) ?? asset.url,
        })),
      ),
    };
  },
});

export const listGalleryItemsAdmin = query({
  args: { albumId: v.id("galleryAlbums"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(galleryItemValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, MEDIA_ROLES);
    return await ctx.db
      .query("galleryItems")
      .withIndex("by_album_order", (q) => q.eq("albumId", args.albumId))
      .paginate(boundedPaginationOpts(args.paginationOpts));
  },
});

export const upsertGalleryItem = mutation({
  args: {
    id: v.optional(v.id("galleryItems")),
    item: v.object({
      albumId: v.id("galleryAlbums"),
      storageId: v.optional(v.id("_storage")),
      url: v.optional(v.string()),
      thumbnailUrl: v.optional(v.string()),
      mediaType: v.union(v.literal("image"), v.literal("video")),
      alt: v.string(),
      caption: v.optional(v.string()),
      credit: v.optional(v.string()),
      order: v.optional(v.number()),
      visible: v.optional(v.boolean()),
    }),
  },
  returns: v.id("galleryItems"),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, MEDIA_ROLES);
    const album = await ctx.db.get("galleryAlbums", args.item.albumId);
    if (!album) throw new ConvexError({ code: "NOT_FOUND", message: "Gallery album not found." });
    if (!args.item.storageId && !args.item.url) {
      throw new ConvexError({ code: "MEDIA_REQUIRED", message: "A storage ID or URL is required." });
    }
    if (args.item.storageId) {
      const asset = await ctx.db
        .query("mediaAssets")
        .withIndex("by_storage_id", (q) => q.eq("storageId", args.item.storageId!))
        .unique();
      if (!asset || asset.status !== "ready") {
        throw new ConvexError({ code: "MEDIA_NOT_READY", message: "Finalize this upload before using it." });
      }
      const expectedPrefix = args.item.mediaType === "image" ? "image/" : "video/";
      if (!asset.mimeType.startsWith(expectedPrefix)) {
        throw new ConvexError({
          code: "MEDIA_TYPE_MISMATCH",
          message: "The uploaded file has the wrong media type.",
        });
      }
    }
    const now = Date.now();
    const baseValues = {
      albumId: args.item.albumId,
      storageId: args.item.storageId,
      url: optionalMediaUrl(args.item.url),
      thumbnailUrl: optionalMediaUrl(args.item.thumbnailUrl),
      mediaType: args.item.mediaType,
      alt: plainText(args.item.alt, "Alternative text", 1, 300),
      caption: args.item.caption ? plainText(args.item.caption, "Caption", 1, 500) : undefined,
      credit: args.item.credit ? plainText(args.item.credit, "Credit", 1, 160) : undefined,
      order: Math.max(0, Math.floor(args.item.order ?? 0)),
      updatedAt: now,
    };
    if (args.id) {
      const existing = await ctx.db.get("galleryItems", args.id);
      if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Gallery item not found." });
      const changesVisibility = args.item.visible !== undefined && args.item.visible !== existing.visible;
      const changesAlbum = existing.albumId !== args.item.albumId;
      if (existing.visible || changesVisibility || changesAlbum) await requireRole(ctx, MEDIA_PUBLISH_ROLES);
      await ctx.db.patch("galleryItems", existing._id, {
        ...baseValues,
        visible: args.item.visible ?? existing.visible,
      });
      await writeAudit(ctx, actor, {
        action: "gallery_item.updated",
        entityType: "galleryItems",
        entityId: existing._id,
        summary: `Updated a gallery item in ${album.title}.`,
      });
      return existing._id;
    }
    const visible = args.item.visible ?? false;
    if (visible) await requireRole(ctx, MEDIA_PUBLISH_ROLES);
    const id = await ctx.db.insert("galleryItems", {
      ...baseValues,
      visible,
      createdBy: actor._id,
      createdAt: now,
    });
    await writeAudit(ctx, actor, {
      action: "gallery_item.created",
      entityType: "galleryItems",
      entityId: id,
      summary: `Added a gallery item to ${album.title}.`,
    });
    return id;
  },
});

export const deleteGalleryItem = mutation({
  args: { id: v.id("galleryItems") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, MEDIA_ROLES);
    const existing = await ctx.db.get("galleryItems", args.id);
    if (!existing) return { ok: true };
    const album = await ctx.db.get("galleryAlbums", existing.albumId);
    if (!album) throw new ConvexError({ code: "NOT_FOUND", message: "Gallery album not found." });
    if (existing.visible || album.status === "published" || album.status === "scheduled") {
      await requireRole(ctx, MEDIA_PUBLISH_ROLES);
    }
    await ctx.db.delete("galleryItems", existing._id);
    await writeAudit(ctx, actor, {
      action: "gallery_item.deleted",
      entityType: "galleryItems",
      entityId: existing._id,
      summary: "Deleted a gallery item.",
    });
    return { ok: true };
  },
});
