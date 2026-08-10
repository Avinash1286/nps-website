import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

const studentIssuer = "https://student-auth.convex.site";

function setup() {
  const t = convexTest(schema, modules);
  betterAuthTest.register(t);
  return t;
}

async function studentIdentity(t: ReturnType<typeof setup>, email: string, name: string) {
  const now = Date.now();
  const authUser = await t.run(
    async (ctx) =>
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "user",
          data: { email, emailVerified: false, name, createdAt: now, updatedAt: now },
        },
      }),
  );
  const session = await t.run(
    async (ctx) =>
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "session",
          data: {
            userId: authUser._id,
            token: `session-${authUser._id}`,
            expiresAt: now + 60 * 60 * 1000,
            createdAt: now,
            updatedAt: now,
          },
        },
      }),
  );
  return {
    authUserId: authUser._id as string,
    client: t.withIdentity({
      subject: authUser._id,
      issuer: studentIssuer,
      tokenIdentifier: `${studentIssuer}|${authUser._id}`,
      sessionId: session._id,
      email,
      name,
    }),
  };
}

async function staffIdentity(
  t: ReturnType<typeof setup>,
  role: "admin" | "publisher",
  subjectOverride?: string,
) {
  const subject = subjectOverride ?? `${role}-article-reviewer`;
  const now = Date.now();
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      clerkUserId: subject,
      email: `${role}@example.edu.np`,
      name: role === "admin" ? "Administrator" : "Publisher",
      roles: [role],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });
  return t.withIdentity({
    subject,
    issuer: process.env.CLERK_JWT_ISSUER_DOMAIN!,
    email: `${role}@example.edu.np`,
  });
}

const draftInput = {
  title: "Learning through community service",
  excerpt:
    "A student reflection on how service activities strengthen responsibility, cooperation, and care for others.",
  body: "Community service gives students a practical way to learn responsibility. Working together on a useful project asks us to listen, plan, and solve problems respectfully. It also shows that small actions matter when a group shares a clear purpose. Through this experience, I learned that service is not only about helping others; it also builds patience, confidence, and teamwork in the students who take part.",
  category: "Student reflections",
  tags: ["service", "teamwork"],
};

describe("student article publishing", () => {
  beforeEach(() => {
    process.env.CLERK_JWT_ISSUER_DOMAIN = "https://convex.test";
  });

  it(
    "keeps drafts private, enforces ownership, and allows only an admin to publish",
    { timeout: 15_000 },
    async () => {
      const t = setup();
      const { client: student } = await studentIdentity(t, "writer@example.com", "Student Writer");
      const { client: otherStudent } = await studentIdentity(t, "other@example.com", "Other Student");
      const admin = await staffIdentity(t, "admin");
      const publisher = await staffIdentity(t, "publisher");

      const transient = await student.query(api.articles.currentStudent, {});
      expect(transient).toMatchObject({ name: "Student Writer", email: "writer@example.com" });

      const draft = await student.mutation(api.articles.saveDraft, { article: draftInput });
      expect(draft.status).toBe("draft");
      expect(await otherStudent.query(api.articles.getMine, { articleId: draft._id })).toBeNull();
      await expect(
        otherStudent.mutation(api.articles.saveDraft, {
          articleId: draft._id,
          article: { ...draftInput, title: "An unauthorized edit" },
        }),
      ).rejects.toThrow(/not found/i);

      const privateDetail = await admin.query(api.articleAdmin.getArticle, { id: draft._id });
      expect(privateDetail).toBeNull();
      const publicBeforeReview = await t.query(api.articles.listPublished, {
        paginationOpts: { numItems: 20, cursor: null },
      });
      expect(publicBeforeReview.page).toHaveLength(0);

      const submitted = await student.mutation(api.articles.submitForReview, { articleId: draft._id });
      expect(submitted.status).toBe("submitted");
      const queue = await admin.query(api.articleAdmin.listArticles, {
        status: "submitted",
        paginationOpts: { numItems: 20, cursor: null },
      });
      expect(queue.page).toHaveLength(1);
      expect(queue.page[0]).not.toHaveProperty("body");

      await expect(publisher.mutation(api.articleAdmin.approve, { id: draft._id })).rejects.toThrow(/admin/i);
      const approved = await admin.mutation(api.articleAdmin.approve, { id: draft._id });
      expect(approved.status).toBe("published");

      const publicAfterApproval = await t.query(api.articles.listPublished, {
        paginationOpts: { numItems: 20, cursor: null },
      });
      expect(publicAfterApproval.page).toHaveLength(1);
      expect(publicAfterApproval.page[0]).not.toHaveProperty("body");
      const publicDetail = await t.query(api.articles.getPublished, {
        slug: publicAfterApproval.page[0]!.slug,
      });
      expect(publicDetail?.body).toBe(draftInput.body);
      expect(publicDetail?.authorName).toBe("Student Writer");
      expect(publicAfterApproval.page[0]).not.toHaveProperty("authorId");
      expect(publicAfterApproval.page[0]).not.toHaveProperty("_id");
      expect(publicAfterApproval.page[0]).not.toHaveProperty("_creationTime");
      expect(publicAfterApproval.page[0]).not.toHaveProperty("email");
      expect(publicAfterApproval.page[0]).not.toHaveProperty("reviewNote");
      expect(publicDetail).not.toHaveProperty("authUserId");
      expect(publicDetail).not.toHaveProperty("_id");
      expect(publicDetail).not.toHaveProperty("_creationTime");
      expect(publicDetail).not.toHaveProperty("email");
      expect(publicDetail).not.toHaveProperty("reviewNote");
    },
  );

  it("refuses to publish an article owned by a suspended student", { timeout: 15_000 }, async () => {
    const t = setup();
    const { client: student } = await studentIdentity(t, "suspended@example.com", "Suspended Writer");
    const admin = await staffIdentity(t, "admin");
    const draft = await student.mutation(api.articles.saveDraft, { article: draftInput });
    await student.mutation(api.articles.submitForReview, { articleId: draft._id });

    await t.run(async (ctx) => {
      const article = await ctx.db.get("articles", draft._id);
      await ctx.db.patch("studentProfiles", article!.authorId as Id<"studentProfiles">, {
        status: "suspended",
        updatedAt: Date.now(),
      });
    });

    await expect(admin.mutation(api.articleAdmin.approve, { id: draft._id })).rejects.toThrow(/suspended/i);
    expect(
      await t.query(api.articles.getPublished, { slug: "learning-through-community-service" }),
    ).toBeNull();
  });

  it("rejects unauthenticated writes and locks submitted content", { timeout: 15_000 }, async () => {
    const t = setup();
    await expect(t.mutation(api.articles.saveDraft, { article: draftInput })).rejects.toThrow(
      /unauthenticated|sign in/i,
    );

    const { client: student } = await studentIdentity(t, "locked@example.com", "Locked Writer");
    const draft = await student.mutation(api.articles.saveDraft, { article: draftInput });
    await student.mutation(api.articles.submitForReview, { articleId: draft._id });
    await expect(
      student.mutation(api.articles.saveDraft, {
        articleId: draft._id,
        article: { ...draftInput, title: "Changed after submission" },
      }),
    ).rejects.toThrow(/only draft or rejected articles/i);
  });

  it(
    "returns rejection feedback only to the owner, then makes revisions private",
    { timeout: 15_000 },
    async () => {
      const t = setup();
      const { client: student } = await studentIdentity(t, "revision@example.com", "Revision Writer");
      const { client: otherStudent } = await studentIdentity(t, "viewer@example.com", "Other Writer");
      const admin = await staffIdentity(t, "admin");
      const draft = await student.mutation(api.articles.saveDraft, { article: draftInput });
      await student.mutation(api.articles.submitForReview, { articleId: draft._id });

      await expect(admin.mutation(api.articleAdmin.reject, { id: draft._id, note: "no" })).rejects.toThrow(
        /between 3 and 1000/i,
      );
      await admin.mutation(api.articleAdmin.reject, {
        id: draft._id,
        note: "Please add one concrete example from the service activity.",
      });
      expect((await student.query(api.articles.getMine, { articleId: draft._id }))?.reviewNote).toMatch(
        /concrete example/i,
      );
      expect(await otherStudent.query(api.articles.getMine, { articleId: draft._id })).toBeNull();
      expect(
        await t.query(api.articles.getPublished, { slug: "learning-through-community-service" }),
      ).toBeNull();

      const revised = await student.mutation(api.articles.saveDraft, {
        articleId: draft._id,
        article: {
          ...draftInput,
          body: `${draftInput.body}\n\nFor example, our group divided the cleanup work into small teams and checked one another's progress.`,
        },
      });
      expect(revised.status).toBe("draft");
      expect(await admin.query(api.articleAdmin.getArticle, { id: draft._id })).toBeNull();

      const resubmitted = await student.mutation(api.articles.submitForReview, { articleId: draft._id });
      expect(resubmitted.status).toBe("submitted");
      expect(resubmitted.reviewNote).toBeUndefined();
    },
  );

  it("returns a withdrawn submission to a private draft", { timeout: 15_000 }, async () => {
    const t = setup();
    const { client: student } = await studentIdentity(t, "withdraw@example.com", "Withdraw Writer");
    const admin = await staffIdentity(t, "admin");
    const draft = await student.mutation(api.articles.saveDraft, { article: draftInput });
    await student.mutation(api.articles.submitForReview, { articleId: draft._id });
    expect(await admin.query(api.articleAdmin.getArticle, { id: draft._id })).not.toBeNull();

    const withdrawn = await student.mutation(api.articles.withdrawSubmission, { articleId: draft._id });
    expect(withdrawn.status).toBe("draft");
    expect(await admin.query(api.articleAdmin.getArticle, { id: draft._id })).toBeNull();
    const queue = await admin.query(api.articleAdmin.listArticles, {
      status: "submitted",
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(queue.page).toHaveLength(0);
  });

  it("generates stable unique public slugs for colliding titles", { timeout: 20_000 }, async () => {
    const t = setup();
    const { client: firstStudent } = await studentIdentity(t, "first@example.com", "First Writer");
    const { client: secondStudent } = await studentIdentity(t, "second@example.com", "Second Writer");
    const admin = await staffIdentity(t, "admin");
    const first = await firstStudent.mutation(api.articles.saveDraft, { article: draftInput });
    const second = await secondStudent.mutation(api.articles.saveDraft, { article: draftInput });
    await firstStudent.mutation(api.articles.submitForReview, { articleId: first._id });
    await secondStudent.mutation(api.articles.submitForReview, { articleId: second._id });
    await admin.mutation(api.articleAdmin.approve, { id: first._id });
    await admin.mutation(api.articleAdmin.approve, { id: second._id });

    const published = await t.query(api.articles.listPublished, {
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(published.page).toHaveLength(2);
    const slugs = published.page.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(2);
    expect(slugs).toContain("learning-through-community-service");
    await Promise.all(
      slugs.map(async (slug) => expect(await t.query(api.articles.getPublished, { slug })).not.toBeNull()),
    );
  });

  it(
    "does not treat a Better Auth identity as Clerk staff even when subjects collide",
    { timeout: 15_000 },
    async () => {
      const t = setup();
      const { client: student, authUserId } = await studentIdentity(
        t,
        "collision@example.com",
        "Collision Student",
      );
      await staffIdentity(t, "admin", authUserId);

      await expect(
        student.query(api.articleAdmin.listArticles, {
          status: "submitted",
          paginationOpts: { numItems: 20, cursor: null },
        }),
      ).rejects.toThrow(/sign in is required/i);
    },
  );

  it(
    "does not treat a Clerk identity as a student even when subjects collide",
    { timeout: 15_000 },
    async () => {
      const t = setup();
      const { authUserId } = await studentIdentity(t, "clerk-collision@example.com", "Student Account");
      const clerkAdmin = await staffIdentity(t, "admin", authUserId);

      expect(await clerkAdmin.query(api.articles.currentStudent, {})).toBeNull();
      await expect(clerkAdmin.mutation(api.articles.saveDraft, { article: draftInput })).rejects.toThrow(
        /student sign in is required/i,
      );
    },
  );
});
