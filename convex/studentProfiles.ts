import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { singleLineText } from "./lib/input";
import { enforceRateLimit } from "./lib/rateLimit";
import { currentStudentProfile, ensureStudentProfile } from "./lib/studentAuth";

const currentProfileValidator = v.object({
  id: v.id("studentProfiles"),
  name: v.string(),
  email: v.string(),
});

export const getCurrent = query({
  args: {},
  returns: v.union(v.null(), currentProfileValidator),
  handler: async (ctx) => {
    const profile = await currentStudentProfile(ctx);
    if (!profile) return null;
    if (profile.status !== "active") {
      throw new ConvexError({ code: "ACCOUNT_DISABLED", message: "This student account is suspended." });
    }
    return { id: profile._id, name: profile.name, email: profile.email };
  },
});

export const updateDisplayName = mutation({
  args: { name: v.string() },
  returns: currentProfileValidator,
  handler: async (ctx, args) => {
    const profile = await ensureStudentProfile(ctx);
    await enforceRateLimit(ctx, {
      key: profile._id,
      scope: "student-profile:update",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    const name = singleLineText(args.name, "Display name", 2, 120);
    if (name !== profile.name) {
      await ctx.db.patch("studentProfiles", profile._id, { name, updatedAt: Date.now() });
    }

    return { id: profile._id, name, email: profile.email };
  },
});
