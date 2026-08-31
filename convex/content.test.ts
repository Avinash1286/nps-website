/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("public department details", () => {
  it("returns CMS-managed department information with ordered published teachers and its published head", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const { departmentSlug } = await t.run(async (ctx) => {
      const editorId = await ctx.db.insert("users", {
        clerkUserId: "department-contract-editor",
        email: "department-contract@example.test",
        name: "Department Contract Editor",
        roles: ["editor"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const departmentSlug = "contract-test-department";
      const departmentId = await ctx.db.insert("departments", {
        slug: departmentSlug,
        name: "Contract Test Department",
        description: "CMS-managed department copy.",
        responsibilities: ["Maintain the published curriculum"],
        featured: true,
        order: 1,
        seo: {},
        status: "published",
        publishedAt: now,
        createdBy: editorId,
        updatedBy: editorId,
        createdAt: now,
        updatedAt: now,
      });
      const teacherFields = {
        title: "Teacher",
        bio: "CMS-managed test fixture.",
        qualifications: ["Test qualification"],
        subjects: ["Test subject"],
        showContact: false,
        seo: {},
        publishedAt: now,
        createdBy: editorId,
        updatedBy: editorId,
        createdAt: now,
        updatedAt: now,
      };
      await ctx.db.insert("teachers", {
        ...teacherFields,
        slug: "contract-test-teacher-later",
        name: "Contract Test Teacher Later",
        departmentId,
        order: 20,
        status: "published",
      });
      await ctx.db.insert("teachers", {
        ...teacherFields,
        slug: "contract-test-teacher-first",
        name: "Contract Test Teacher First",
        departmentId,
        order: 5,
        status: "published",
      });
      await ctx.db.insert("teachers", {
        ...teacherFields,
        slug: "contract-test-teacher-draft",
        name: "Contract Test Teacher Draft",
        departmentId,
        order: 1,
        status: "draft",
        publishedAt: undefined,
      });
      const headTeacherId = await ctx.db.insert("teachers", {
        ...teacherFields,
        slug: "contract-test-department-head",
        name: "Contract Test Department Head",
        title: "Department Head",
        departmentId,
        order: 1,
        status: "published",
      });
      await ctx.db.patch("departments", departmentId, { headTeacherId });
      return { departmentSlug };
    });

    const department = await t.query(api.content.getDepartment, { slug: departmentSlug });

    expect(department).toMatchObject({
      slug: departmentSlug,
      description: "CMS-managed department copy.",
      responsibilities: ["Maintain the published curriculum"],
      headTeacher: {
        slug: "contract-test-department-head",
        name: "Contract Test Department Head",
      },
    });
    expect(department?.teachers.map((teacher) => teacher.slug)).toEqual([
      "contract-test-department-head",
      "contract-test-teacher-first",
      "contract-test-teacher-later",
    ]);
    expect(department?.teachers[0]).not.toHaveProperty("email");
    expect(department?.teachers[0]).not.toHaveProperty("phone");
    expect(department).not.toHaveProperty("createdBy");
    expect(department?.headTeacher).not.toHaveProperty("createdBy");
  });

  it("does not expose an unpublished department or unpublished configured head", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const { publishedSlug, draftSlug } = await t.run(async (ctx) => {
      const editorId = await ctx.db.insert("users", {
        clerkUserId: "department-visibility-editor",
        email: "department-visibility@example.test",
        name: "Department Visibility Editor",
        roles: ["editor"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const unpublishedHeadId = await ctx.db.insert("teachers", {
        slug: "contract-test-unpublished-head",
        name: "Contract Test Unpublished Head",
        title: "Department Head",
        bio: "CMS-managed test fixture.",
        qualifications: [],
        subjects: [],
        showContact: false,
        order: 1,
        seo: {},
        status: "draft",
        createdBy: editorId,
        updatedBy: editorId,
        createdAt: now,
        updatedAt: now,
      });
      const shared = {
        name: "Department Visibility Fixture",
        description: "CMS-managed test fixture.",
        responsibilities: [],
        featured: false,
        order: 1,
        seo: {},
        createdBy: editorId,
        updatedBy: editorId,
        createdAt: now,
        updatedAt: now,
      };
      const publishedSlug = "contract-test-published-department";
      await ctx.db.insert("departments", {
        ...shared,
        slug: publishedSlug,
        headTeacherId: unpublishedHeadId,
        status: "published",
        publishedAt: now,
      });
      const draftSlug = "contract-test-draft-department";
      await ctx.db.insert("departments", {
        ...shared,
        slug: draftSlug,
        status: "draft",
      });
      return { publishedSlug, draftSlug };
    });

    await expect(t.query(api.content.getDepartment, { slug: publishedSlug })).resolves.toMatchObject({
      headTeacher: null,
      teachers: [],
    });
    await expect(t.query(api.content.getDepartment, { slug: draftSlug })).resolves.toBeNull();
  });
});
