import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchQueryMock } = vi.hoisted(() => ({ fetchQueryMock: vi.fn() }));

vi.mock("convex/nextjs", () => ({ fetchQuery: fetchQueryMock }));
vi.mock("convex/server", () => ({ makeFunctionReference: (name: string) => name }));

import {
  getCmsPage,
  getDepartment,
  getFacilities,
  getFaqs,
  getLeader,
  getLeadership,
  getNews,
  getNotice,
  getPrograms,
  getStudentArticle,
  getStudentArticles,
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

  it("normalizes facility evidence and defaults unknown verification values to pending", async () => {
    fetchQueryMock.mockResolvedValueOnce([
      {
        _id: "facility-library",
        slug: "library",
        name: "Library",
        summary: "Reading and independent-learning resources.",
        iconKey: "library",
        verificationStatus: "confirmed",
        sourceLabel: "SAMPADA 2082",
        sourceUrl: "https://example.com/sampada",
        imageId: "storage-1",
        imageUrl: "https://example.convex.cloud/library.webp",
        imageAlt: "Library reading tables and bookshelves",
        featured: true,
        order: 20,
      },
      {
        _id: "facility-auditorium",
        slug: "auditorium",
        name: "Auditorium",
        summary: "Awaiting confirmation.",
        iconKey: "unsupported-icon",
        verificationStatus: "unknown",
        featured: false,
        order: 90,
      },
    ]);

    await expect(getFacilities()).resolves.toMatchObject([
      {
        id: "facility-library",
        iconKey: "library",
        verificationStatus: "confirmed",
        imageId: "storage-1",
        featured: true,
      },
      {
        id: "facility-auditorium",
        iconKey: "classroom",
        verificationStatus: "school_confirmation_required",
      },
    ]);
    expect(fetchQueryMock).toHaveBeenLastCalledWith(
      "content:listFacilities",
      expect.objectContaining({ limit: 100, now: expect.any(Number) }),
      expect.any(Object),
    );
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

  it("normalizes only the reviewed student-article fields returned by the public API", async () => {
    fetchQueryMock
      .mockResolvedValueOnce({
        page: [
          {
            _id: "article-1",
            slug: "learning-through-service",
            title: "Learning through service",
            excerpt: "A student reflection on helping the community.",
            body: "Service taught me to listen and work with others.",
            category: "Reflection",
            tags: ["service", "community"],
            authorName: "Student Writer",
            featured: false,
            publishedAt: 1_800_000_000_000,
            updatedAt: 1_800_000_100_000,
            reviewNote: "This must never reach the public DTO.",
            authorEmail: "private@example.com",
          },
        ],
        isDone: true,
        continueCursor: "",
      })
      .mockResolvedValueOnce({
        slug: "learning-through-service",
        title: "Learning through service",
        excerpt: "A student reflection on helping the community.",
        body: "Service taught me to listen and work with others.",
        category: "Reflection",
        tags: ["service", "community"],
        authorName: "Student Writer",
        featured: false,
        publishedAt: 1_800_000_000_000,
        updatedAt: 1_800_000_100_000,
      });

    const list = await getStudentArticles(25);
    expect(fetchQueryMock).toHaveBeenNthCalledWith(
      1,
      "articles:listPublished",
      { paginationOpts: { numItems: 25, cursor: null } },
      expect.any(Object),
    );
    expect(list).toEqual([
      expect.objectContaining({
        id: "learning-through-service",
        slug: "learning-through-service",
        authorName: "Student Writer",
        tags: ["service", "community"],
      }),
    ]);
    expect(list[0]).not.toHaveProperty("authorEmail");
    expect(list[0]).not.toHaveProperty("reviewNote");
    expect(list[0]).not.toHaveProperty("body");
    expect(list[0]).not.toHaveProperty("_id");

    await expect(getStudentArticle("learning-through-service")).resolves.toMatchObject({
      id: "learning-through-service",
      title: "Learning through service",
      authorName: "Student Writer",
    });
    expect(fetchQueryMock).toHaveBeenNthCalledWith(
      2,
      "articles:getPublished",
      { slug: "learning-through-service" },
      expect.any(Object),
    );
  });
});
