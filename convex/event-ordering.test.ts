import { convexTest } from "convex-test";
import { expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

it.each(["upcoming", "past", "all"] as const)(
  "limits %s events only after ordering by start time and applying the scope",
  async (scope) => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        clerkUserId: "event-test",
        email: "test@example.test",
        name: "Test Admin",
        roles: ["admin"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("publicationClock", { singletonKey: "main", currentTime: now, updatedAt: now });
      const fields = {
        description: "Test fixture",
        timezone: "Asia/Kathmandu",
        isOnline: false,
        registrationEnabled: false,
        featured: false,
        seo: {},
        status: "published" as const,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      };
      await ctx.db.insert("events", {
        ...fields,
        slug: "first-result",
        title: "First result",
        startAt: now - 2000,
        endAt: scope === "past" ? now - 1000 : now + 100000,
      });
      for (let i = 0; i < 31; i++) {
        await ctx.db.insert("events", {
          ...fields,
          slug: `other-${i}`,
          title: `Other ${i}`,
          startAt: scope === "past" ? now - 100000 + i * 1000 : now + 2000 + i * 1000,
          endAt: scope === "past" ? now - 500 - i : now + 3000 + i * 1000,
        });
      }
      // Rows outside the scope must not consume the result limit.
      if (scope !== "all") {
        for (let i = 0; i < 31; i++) {
          await ctx.db.insert("events", {
            ...fields,
            slug: `excluded-${i}`,
            title: "Outside scope",
            startAt: scope === "past" ? now + i : now - 200000 + i,
            endAt: scope === "past" ? now + 1000 + i : now - 100000 + i,
          });
        }
      }
      await ctx.db.insert("events", {
        ...fields,
        slug: "draft",
        title: "Unpublished",
        startAt: scope === "past" ? now - 1 : now - 300000,
        endAt: scope === "past" ? now - 1 : now + 100000,
        status: "draft",
      });
    });
    // Caller-supplied time must not override the publication clock.
    const events = await t.query(api.content.listEvents, { now: now + 1000000, scope, limit: 10 });
    expect(events).toHaveLength(10);
    expect(events[0].slug).toBe("first-result");
    expect(events.map((event) => event.slug)).toEqual([
      "first-result",
      ...Array.from({ length: 9 }, (_, i) => `other-${scope === "past" ? 30 - i : i}`),
    ]);
  },
);

it("returns no scoped events before the publication clock is initialized", async () => {
  const t = convexTest(schema, modules);
  for (const scope of ["upcoming", "past"] as const) {
    expect(await t.query(api.content.listEvents, { now: Date.now(), scope })).toEqual([]);
  }
});
