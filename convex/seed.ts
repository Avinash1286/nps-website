import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireRole, requireServiceSecret } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { recordCreated } from "./lib/metrics";

const DEFAULT_SEO = { noIndex: false };

export const baseline = mutation({
  args: { seedSecret: v.optional(v.string()) },
  returns: v.object({ created: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    let actor: Doc<"users">;
    if (args.seedSecret) {
      requireServiceSecret(args.seedSecret, "SEED_SECRET");
      const existingSystem = await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", "system:seed"))
        .unique();
      if (existingSystem) {
        actor = existingSystem;
      } else {
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
        actor = (await ctx.db.get("users", id))!;
      }
    } else {
      actor = await requireRole(ctx, ["admin"]);
    }

    const now = Date.now();
    const publicationClock = await ctx.db
      .query("publicationClock")
      .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
      .unique();
    if (publicationClock) {
      await ctx.db.patch("publicationClock", publicationClock._id, { currentTime: now, updatedAt: now });
    } else {
      await ctx.db.insert("publicationClock", {
        singletonKey: "main",
        currentTime: now,
        updatedAt: now,
      });
    }
    let created = 0;
    let skipped = 0;
    const markCreated = () => {
      created += 1;
    };
    const markSkipped = () => {
      skipped += 1;
    };

    const settings = await ctx.db
      .query("siteSettings")
      .withIndex("by_singleton_key", (q) => q.eq("singletonKey", "main"))
      .unique();
    if (!settings) {
      await ctx.db.insert("siteSettings", {
        singletonKey: "main",
        schoolName: "Nepal Police School, Garuda",
        shortName: "NPS Garuda",
        tagline: "Discipline, dignity, learning, and service.",
        description:
          "The official information portal for Nepal Police School, Garuda, serving students, families, staff, and the wider school community.",
        contact: {
          address: "Garuda Municipality, Ward No. 7, Rautahat",
          city: "Garuda",
          country: "Nepal",
          phone: "",
          email: "",
          officeHours: "School office hours are published through official notices.",
        },
        social: {},
        seo: {
          title: "Nepal Police School, Garuda",
          description: "Official school information, academics, admissions, notices, events, and resources.",
          noIndex: false,
        },
        academicYear: "Configure in admin",
        timezone: "Asia/Kathmandu",
        admissionsOpen: false,
        assistantEnabled: false,
        maintenanceMode: false,
        updatedBy: actor._id,
        updatedAt: now,
      });
      markCreated();
    } else markSkipped();

    const navigation = [
      { label: "Home", href: "/", location: "header" as const, order: 0 },
      { label: "About", href: "/about", location: "header" as const, order: 10 },
      { label: "Academics", href: "/academics", location: "header" as const, order: 20 },
      { label: "Teachers", href: "/teachers", location: "header" as const, order: 30 },
      { label: "Admissions", href: "/admissions", location: "header" as const, order: 40 },
      { label: "News", href: "/news", location: "header" as const, order: 50 },
      { label: "Notices", href: "/notices", location: "header" as const, order: 60 },
      { label: "Events", href: "/events", location: "header" as const, order: 70 },
      { label: "Campus life", href: "/campus-life", location: "footer" as const, order: 10 },
      { label: "Downloads", href: "/downloads", location: "footer" as const, order: 20 },
      { label: "Contact", href: "/contact", location: "footer" as const, order: 30 },
      { label: "Privacy", href: "/privacy", location: "footer" as const, order: 40 },
      { label: "Accessibility", href: "/accessibility", location: "footer" as const, order: 50 },
      { label: "Staff sign in", href: "/sign-in", location: "utility" as const, order: 10 },
    ];
    const currentNavigation = await ctx.db.query("navigationItems").take(500);
    if (currentNavigation.length === 500) {
      throw new Error("Navigation seed stopped because the table exceeds the safe reconciliation limit.");
    }
    for (const item of navigation) {
      if (
        currentNavigation.some(
          (candidate) => candidate.location === item.location && candidate.href === item.href,
        )
      ) {
        markSkipped();
        continue;
      }
      await ctx.db.insert("navigationItems", {
        ...item,
        external: false,
        visible: true,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      markCreated();
    }

    const pages = [
      {
        slug: "about",
        title: "About Nepal Police School, Garuda",
        summary: "Our purpose, values, leadership, and shared responsibilities.",
        body: "Nepal Police School, Garuda serves students and families in Rautahat. Verified history, leadership details, policies, and milestones are maintained by authorised school staff.",
        order: 10,
      },
      {
        slug: "academics",
        title: "Academics",
        summary: "Academic pathways, curriculum, departments, and student support.",
        body: "Explore the school’s published academic programmes and department information. Families should use current notices and direct school communication for schedules and requirements.",
        order: 20,
      },
      {
        slug: "admissions",
        title: "Admissions",
        summary: "A clear starting point for prospective students and families.",
        body: "Admissions cycles, available grades, required documents, dates, and decisions are published by authorised staff. Check the current admissions status before submitting an enquiry.",
        order: 30,
      },
      {
        slug: "contact",
        title: "Contact the school",
        summary: "Use verified school channels or the secure website enquiry form.",
        body: "For accurate, time-sensitive information, contact the school office through the verified details on this website. Do not send sensitive documents through a general contact message.",
        order: 40,
      },
    ];
    for (const page of pages) {
      const existing = await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) => q.eq("slug", page.slug))
        .unique();
      if (existing) {
        markSkipped();
        continue;
      }
      await ctx.db.insert("pages", {
        ...page,
        featured: false,
        seo: { ...DEFAULT_SEO, title: page.title, description: page.summary },
        status: "published",
        publishAt: now,
        publishedAt: now,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:pages", "published");
      markCreated();
    }

    const programs = [
      {
        slug: "foundational-learning",
        name: "Foundational learning",
        shortDescription:
          "Age-appropriate foundations for communication, numeracy, curiosity, and positive learning habits.",
        description:
          "Programme details, grade coverage, curriculum, and entry points are maintained by the school and should be confirmed for the current academic year.",
        outcomes: [
          "Confident communication",
          "Foundational numeracy",
          "Curiosity and positive learning habits",
        ],
        order: 10,
      },
      {
        slug: "primary-education",
        name: "Primary education",
        shortDescription:
          "A broad academic foundation supported by participation, feedback, and responsible routines.",
        description:
          "The published programme record provides current curriculum and grade information after administrative verification.",
        outcomes: [
          "Strong core subject foundations",
          "Collaboration and participation",
          "Responsible study habits",
        ],
        order: 20,
      },
      {
        slug: "secondary-education",
        name: "Secondary education",
        shortDescription:
          "Progressive subject learning, assessment readiness, leadership, and preparation for future pathways.",
        description:
          "Subject combinations, assessment arrangements, and eligibility requirements are published for each applicable academic cycle.",
        outcomes: ["Deeper subject knowledge", "Assessment readiness", "Leadership and future planning"],
        order: 30,
      },
    ];
    for (const program of programs) {
      const existing = await ctx.db
        .query("programs")
        .withIndex("by_slug", (q) => q.eq("slug", program.slug))
        .unique();
      if (existing) {
        markSkipped();
        continue;
      }
      await ctx.db.insert("programs", {
        ...program,
        featured: true,
        seo: { ...DEFAULT_SEO, title: program.name, description: program.shortDescription },
        status: "published",
        publishAt: now,
        publishedAt: now,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:programs", "published");
      markCreated();
    }

    const faqs = [
      [
        "How do I know whether admissions are open?",
        "The admissions page displays the current status. Dates, grades, and requirements are published only after school approval.",
        "Admissions",
      ],
      [
        "Can I submit an application through this website?",
        "When online admission enquiries are enabled, use the secure admissions form. A submission is preliminary and does not guarantee admission.",
        "Admissions",
      ],
      [
        "Where can I find official notices?",
        "Use the Notices page for current, published school announcements. Time-sensitive details should be confirmed through the school office.",
        "Information",
      ],
      [
        "How can I contact a teacher?",
        "Teacher contact details are shown only when the school has approved their public display. Otherwise, contact the school office.",
        "Teachers",
      ],
      [
        "Are website event registrations confirmed immediately?",
        "The registration result indicates registered or waitlisted status. Follow the confirmation message and any later school communication.",
        "Events",
      ],
      [
        "How is information for the school assistant selected?",
        "The assistant uses only content currently published in the school content system and clearly states when an answer is not available.",
        "Website",
      ],
    ] as const;
    const existingFaqs = await ctx.db.query("faqs").take(500);
    if (existingFaqs.length === 500) {
      throw new Error("FAQ seed stopped because the table exceeds the safe reconciliation limit.");
    }
    for (let index = 0; index < faqs.length; index += 1) {
      const [question, answer, category] = faqs[index];
      if (existingFaqs.some((faq) => faq.question === question)) {
        markSkipped();
        continue;
      }
      await ctx.db.insert("faqs", {
        question,
        answer,
        category,
        order: index * 10,
        status: "published",
        publishAt: now,
        publishedAt: now,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:faqs", "published");
      markCreated();
    }

    await writeAudit(ctx, actor, {
      action: "seed.baseline",
      entityType: "system",
      summary: `Baseline seed completed (${created} created, ${skipped} already present).`,
    });
    return { created, skipped };
  },
});
