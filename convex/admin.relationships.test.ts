import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

const PUBLISHER_SUBJECT = "department-relationship-publisher";

async function createPublisher(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("users", {
      clerkUserId: PUBLISHER_SUBJECT,
      email: "department-relationship-publisher@example.test",
      name: "Department Relationship Publisher",
      roles: ["publisher"],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });
  return t.withIdentity({ subject: PUBLISHER_SUBJECT });
}

function departmentData(
  slug: string,
  status: "draft" | "scheduled" | "published" | "archived",
  overrides: Record<string, unknown> = {},
) {
  return {
    slug,
    name: `Contract ${slug}`,
    description: "CMS-managed department relationship fixture.",
    responsibilities: ["Maintain verified department information"],
    status,
    ...overrides,
  };
}

function teacherData(
  slug: string,
  status: "draft" | "scheduled" | "published" | "archived",
  departmentId?: Id<"departments">,
  overrides: Record<string, unknown> = {},
) {
  return {
    slug,
    name: `Contract ${slug}`,
    title: "Teacher",
    departmentId,
    bio: "CMS-managed teacher relationship fixture.",
    qualifications: [],
    subjects: [],
    showContact: false,
    status,
    ...overrides,
  };
}

describe("department and teacher administration integrity", () => {
  it("keeps drafts flexible but requires a published department before publishing a teacher", async () => {
    const t = convexTest(schema, modules);
    const publisher = await createPublisher(t);
    const departmentId = (await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "departments",
        data: departmentData("draft-first", "draft"),
      },
    })) as Id<"departments">;
    await expect(
      publisher.mutation(api.admin.upsertContent, {
        payload: {
          type: "teachers",
          data: teacherData("premature-published-teacher", "published", departmentId),
        },
      }),
    ).rejects.toThrow(/publish the selected department/i);
    const teacherId = (await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "teachers",
        data: teacherData("draft-first-teacher", "draft", departmentId),
      },
    })) as Id<"teachers">;

    await expect(
      publisher.mutation(api.admin.changeContentStatus, {
        type: "teachers",
        id: teacherId,
        status: "published",
      }),
    ).rejects.toThrow(/publish the selected department/i);

    await publisher.mutation(api.admin.changeContentStatus, {
      type: "departments",
      id: departmentId,
      status: "published",
    });
    await publisher.mutation(api.admin.changeContentStatus, {
      type: "teachers",
      id: teacherId,
      status: "published",
    });

    const teacher = await t.run(async (ctx) => ctx.db.get("teachers", teacherId));
    expect(teacher).toMatchObject({ status: "published", departmentId });
  });

  it("accepts only an assigned teacher as head and requires that head to be published for an active department", async () => {
    const t = convexTest(schema, modules);
    const publisher = await createPublisher(t);
    const firstDepartmentId = (await publisher.mutation(api.admin.upsertContent, {
      payload: { type: "departments", data: departmentData("first", "published") },
    })) as Id<"departments">;
    const secondDepartmentId = (await publisher.mutation(api.admin.upsertContent, {
      payload: { type: "departments", data: departmentData("second", "published") },
    })) as Id<"departments">;
    const firstTeacherId = (await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "teachers",
        data: teacherData("first-published-teacher", "published", firstDepartmentId),
      },
    })) as Id<"teachers">;
    const draftTeacherId = (await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "teachers",
        data: teacherData("first-draft-teacher", "draft", firstDepartmentId),
      },
    })) as Id<"teachers">;

    await expect(
      publisher.mutation(api.admin.upsertContent, {
        payload: {
          type: "departments",
          id: secondDepartmentId,
          data: departmentData("second", "published", { headTeacherId: firstTeacherId }),
        },
      }),
    ).rejects.toThrow(/assigned to this department/i);
    await expect(
      publisher.mutation(api.admin.upsertContent, {
        payload: {
          type: "departments",
          id: firstDepartmentId,
          data: departmentData("first", "published", { headTeacherId: draftTeacherId }),
        },
      }),
    ).rejects.toThrow(/publish the selected department head/i);

    await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "departments",
        id: firstDepartmentId,
        data: departmentData("first", "published", { headTeacherId: firstTeacherId }),
      },
    });
    const department = await t.run(async (ctx) => ctx.db.get("departments", firstDepartmentId));
    expect(department?.headTeacherId).toBe(firstTeacherId);
  });

  it("requires changing the department head before moving, unassigning, unpublishing, or deleting that teacher", async () => {
    const t = convexTest(schema, modules);
    const publisher = await createPublisher(t);
    const firstDepartmentId = (await publisher.mutation(api.admin.upsertContent, {
      payload: { type: "departments", data: departmentData("headed", "published") },
    })) as Id<"departments">;
    const secondDepartmentId = (await publisher.mutation(api.admin.upsertContent, {
      payload: { type: "departments", data: departmentData("destination", "published") },
    })) as Id<"departments">;
    const headTeacherId = (await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "teachers",
        data: teacherData("current-head", "published", firstDepartmentId),
      },
    })) as Id<"teachers">;
    await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "departments",
        id: firstDepartmentId,
        data: departmentData("headed", "published", { headTeacherId }),
      },
    });

    await expect(
      publisher.mutation(api.admin.upsertContent, {
        payload: {
          type: "teachers",
          id: headTeacherId,
          data: teacherData("current-head", "published", secondDepartmentId),
        },
      }),
    ).rejects.toThrow(/choose another department head/i);
    await expect(
      publisher.mutation(api.admin.upsertContent, {
        payload: {
          type: "teachers",
          id: headTeacherId,
          data: teacherData("current-head", "published"),
        },
      }),
    ).rejects.toThrow(/choose another department head/i);
    await expect(
      publisher.mutation(api.admin.changeContentStatus, {
        type: "teachers",
        id: headTeacherId,
        status: "archived",
      }),
    ).rejects.toThrow(/choose another department head/i);

    const draftDepartmentId = (await publisher.mutation(api.admin.upsertContent, {
      payload: { type: "departments", data: departmentData("draft-headed", "draft") },
    })) as Id<"departments">;
    const draftHeadId = (await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "teachers",
        data: teacherData("draft-current-head", "draft", draftDepartmentId),
      },
    })) as Id<"teachers">;
    await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "departments",
        id: draftDepartmentId,
        data: departmentData("draft-headed", "draft", { headTeacherId: draftHeadId }),
      },
    });
    await expect(
      publisher.mutation(api.admin.removeContent, {
        type: "teachers",
        id: draftHeadId,
      }),
    ).rejects.toThrow(/choose another department head/i);

    await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "departments",
        id: firstDepartmentId,
        data: departmentData("headed", "published"),
      },
    });
    await publisher.mutation(api.admin.upsertContent, {
      payload: {
        type: "teachers",
        id: headTeacherId,
        data: teacherData("current-head", "published", secondDepartmentId),
      },
    });
    const movedTeacher = await t.run(async (ctx) => ctx.db.get("teachers", headTeacherId));
    expect(movedTeacher?.departmentId).toBe(secondDepartmentId);
  });
});
