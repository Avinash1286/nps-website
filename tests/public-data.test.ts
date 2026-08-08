import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchQueryMock } = vi.hoisted(() => ({ fetchQueryMock: vi.fn() }));

vi.mock("convex/nextjs", () => ({ fetchQuery: fetchQueryMock }));
vi.mock("convex/server", () => ({ makeFunctionReference: (name: string) => name }));

import {
  getCmsPage,
  getDepartment,
  getFaqs,
  getLeader,
  getLeadership,
  getNews,
  getNotice,
  getPrograms,
  getTeacher,
  getTestimonials,
  prioritizeFeatured,
} from "@/lib/data/public";

describe("public Convex data normalization", () => {
  beforeEach(() => {
    fetchQueryMock.mockReset();
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
  });

  afterAll(() => vi.unstubAllEnvs());

  it("uses the approved leadership welcome message without dropping the biography", async () => {
    fetchQueryMock.mockResolvedValueOnce({
      _id: "leader-1",
      slug: "principal",
      name: "Principal",
      role: "School Principal",
      bio: "Long-form professional biography.",
      quote: "Welcome to our school community.",
    });

    await expect(getLeader("principal")).resolves.toMatchObject({
      bio: "Long-form professional biography.",
      message: "Welcome to our school community.",
    });
  });

  it("does not invent leadership profiles when no admin-authored records are published", async () => {
    fetchQueryMock.mockResolvedValueOnce([]);

    await expect(getLeadership()).resolves.toEqual([]);
  });

  it("preserves notice priority and every intended audience", async () => {
    fetchQueryMock.mockResolvedValueOnce({
      _id: "notice-1",
      slug: "exam-update",
      title: "Exam update",
      body: "Please review the revised schedule.",
      priority: "urgent",
      audiences: ["Students", "Parents"],
    });

    await expect(getNotice("exam-update")).resolves.toMatchObject({
      priority: "urgent",
      audiences: ["Students", "Parents"],
    });
  });

  it("maps the existing FAQ and testimonial query surfaces for public routes", async () => {
    fetchQueryMock
      .mockResolvedValueOnce([
        { _id: "faq-1", question: "How do I apply?", answer: "Follow the current admissions notice." },
      ])
      .mockResolvedValueOnce([
        {
          _id: "testimonial-1",
          name: "A Parent",
          role: "Parent",
          quote: "The school communicates clearly.",
        },
      ]);

    await expect(getFaqs()).resolves.toEqual([
      {
        id: "faq-1",
        question: "How do I apply?",
        answer: "Follow the current admissions notice.",
        category: undefined,
      },
    ]);
    await expect(getTestimonials()).resolves.toEqual([
      {
        id: "testimonial-1",
        name: "A Parent",
        role: "Parent",
        organization: undefined,
        quote: "The school communicates clearly.",
        photoUrl: undefined,
      },
    ]);
  });

  it("retains page templates, featured state, and record-level SEO", async () => {
    fetchQueryMock.mockResolvedValueOnce({
      _id: "page-1",
      slug: "community/overview",
      title: "Community overview",
      body: "Welcome to our community.",
      template: "landing",
      featured: true,
      seo: {
        title: "NPS community",
        description: "Meet our school community.",
        imageUrl: "https://example.com/community.jpg",
        noIndex: false,
      },
    });

    await expect(getCmsPage("community/overview")).resolves.toMatchObject({
      template: "landing",
      featured: true,
      seo: {
        title: "NPS community",
        description: "Meet our school community.",
        imageUrl: "https://example.com/community.jpg",
        noIndex: false,
      },
    });
  });

  it("retains teacher subjects and resolves the published department head", async () => {
    const head = {
      _id: "teacher-head",
      slug: "maya-shrestha",
      name: "Maya Shrestha",
      title: "Head of Science",
      subjects: ["Physics", "Science"],
      qualifications: ["M.Ed."],
      status: "published",
    };
    fetchQueryMock
      .mockResolvedValueOnce(head)
      .mockResolvedValueOnce({
        _id: "department-science",
        slug: "science",
        name: "Science",
        description: "Practical and inquiry-led learning.",
        responsibilities: ["Laboratory learning"],
        headTeacherId: "teacher-head",
        teachers: [],
      })
      .mockResolvedValueOnce([head]);

    await expect(getTeacher("maya-shrestha")).resolves.toMatchObject({
      subjects: ["Physics", "Science"],
      qualification: "M.Ed.",
    });
    await expect(getDepartment("science")).resolves.toMatchObject({
      headTeacher: {
        id: "teacher-head",
        name: "Maya Shrestha",
        subjects: ["Physics", "Science"],
      },
    });
  });

  it("uses featured flags as a stable public ordering signal", async () => {
    expect(
      prioritizeFeatured([
        { id: "recent", featured: false },
        { id: "featured-1", featured: true },
        { id: "featured-2", featured: true },
        { id: "older", featured: false },
      ]).map((item) => item.id),
    ).toEqual(["featured-1", "featured-2", "recent", "older"]);

    fetchQueryMock
      .mockResolvedValueOnce([
        {
          _id: "program-regular",
          slug: "regular",
          name: "Regular",
          shortDescription: "Regular programme",
          description: "Regular programme",
          featured: false,
        },
        {
          _id: "program-featured",
          slug: "featured",
          name: "Featured",
          shortDescription: "Featured programme",
          description: "Featured programme",
          featured: true,
        },
      ])
      .mockResolvedValueOnce([]);

    await expect(getPrograms()).resolves.toMatchObject([
      { id: "program-featured", featured: true },
      { id: "program-regular", featured: false },
    ]);
    await getNews(3, true);
    expect(fetchQueryMock).toHaveBeenLastCalledWith(
      "content:listNews",
      expect.objectContaining({ limit: 3, featured: true }),
      expect.any(Object),
    );
  });
});
