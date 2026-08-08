import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireRole, requireServiceSecret } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { recordCreated } from "./lib/metrics";

const DEFAULT_SEO = { noIndex: false };

function missingFields<T extends object>(existing: T, baseline: Partial<T>): Partial<T> {
  return Object.fromEntries(
    (Object.keys(baseline) as Array<keyof T>).flatMap((key) => {
      const value = baseline[key];
      return existing[key] === undefined && value !== undefined ? [[key, value]] : [];
    }),
  ) as Partial<T>;
}

function hasFields(value: object): boolean {
  return Object.keys(value).length > 0;
}

export const baseline = mutation({
  args: { seedSecret: v.optional(v.string()) },
  returns: v.object({ created: v.number(), updated: v.number(), skipped: v.number() }),
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
    let updated = 0;
    let skipped = 0;
    const markCreated = () => {
      created += 1;
    };
    const markSkipped = () => {
      skipped += 1;
    };
    const markUpdated = () => {
      updated += 1;
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
        logoUrl: "/media/nps-logo.png",
        faviconUrl: "/media/nps-logo.png",
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
    } else {
      const settingsPatch: Partial<Doc<"siteSettings">> = {};
      if (settings.logoId === undefined && settings.logoUrl === undefined) {
        settingsPatch.logoUrl = "/media/nps-logo.png";
      }
      if (settings.faviconId === undefined && settings.faviconUrl === undefined) {
        settingsPatch.faviconUrl = "/media/nps-logo.png";
      }
      if (hasFields(settingsPatch)) {
        await ctx.db.patch("siteSettings", settings._id, {
          ...settingsPatch,
          updatedBy: actor._id,
          updatedAt: now,
        });
        markUpdated();
      } else {
        markSkipped();
      }
    }

    type NavigationLocation = "header" | "footer" | "utility";
    type SeedNavigation = {
      label: string;
      href: string;
      location: NavigationLocation;
      order: number;
      description?: string;
    };

    const currentNavigation = await ctx.db.query("navigationItems").take(500);
    if (currentNavigation.length === 500) {
      throw new Error("Navigation seed stopped because the table exceeds the safe reconciliation limit.");
    }

    const knownNavigation: Array<{
      id: Id<"navigationItems">;
      label: string;
      href: string;
      location: NavigationLocation;
      parentId?: Id<"navigationItems">;
      order: number;
    }> = currentNavigation.map((item) => ({
      id: item._id,
      label: item.label,
      href: item.href,
      location: item.location,
      parentId: item.parentId,
      order: item.order,
    }));

    const ensureNavigation = async (
      item: SeedNavigation,
      parentId?: Id<"navigationItems">,
      options: { adoptRootLabel?: string; renameRootLabel?: string } = {},
    ): Promise<Id<"navigationItems">> => {
      let existing = knownNavigation.find(
        (candidate) =>
          candidate.location === item.location &&
          candidate.href === item.href &&
          candidate.parentId === parentId,
      );
      if (!existing && parentId && (options.adoptRootLabel || options.renameRootLabel)) {
        existing = knownNavigation.find(
          (candidate) =>
            candidate.location === item.location &&
            candidate.href === item.href &&
            candidate.parentId === undefined &&
            (candidate.label === options.adoptRootLabel || candidate.label === options.renameRootLabel),
        );
        if (existing) {
          const shouldRename =
            options.renameRootLabel !== undefined && existing.label === options.renameRootLabel;
          await ctx.db.patch("navigationItems", existing.id, {
            parentId,
            order: item.order,
            ...(shouldRename ? { label: item.label } : {}),
            updatedBy: actor._id,
            updatedAt: now,
          });
          existing.parentId = parentId;
          existing.order = item.order;
          if (shouldRename) existing.label = item.label;
          markUpdated();
          return existing.id;
        }
      }

      if (existing) {
        if (options.renameRootLabel && existing.label === options.renameRootLabel) {
          await ctx.db.patch("navigationItems", existing.id, {
            label: item.label,
            order: item.order,
            updatedBy: actor._id,
            updatedAt: now,
          });
          existing.label = item.label;
          existing.order = item.order;
          markUpdated();
        } else {
          markSkipped();
        }
        return existing.id;
      }

      const id = await ctx.db.insert("navigationItems", {
        ...item,
        ...(parentId ? { parentId } : {}),
        external: false,
        visible: true,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      knownNavigation.push({ id, ...item, parentId });
      markCreated();
      return id;
    };

    await ensureNavigation({ label: "Home", href: "/", location: "header", order: 0 });
    const aboutNavigationId = await ensureNavigation({
      label: "About",
      href: "/about",
      location: "header",
      order: 10,
    });
    const academicsNavigationId = await ensureNavigation({
      label: "Academics",
      href: "/academics",
      location: "header",
      order: 20,
    });
    const schoolLifeNavigationId = await ensureNavigation(
      {
        label: "School life",
        href: "/campus-life",
        location: "header",
        order: 30,
      },
      undefined,
      { renameRootLabel: "Campus life" },
    );
    const admissionsNavigationId = await ensureNavigation({
      label: "Admissions",
      href: "/admissions",
      location: "header",
      order: 40,
    });
    const updatesNavigationId = await ensureNavigation(
      { label: "Updates", href: "/news", location: "header", order: 50 },
      undefined,
      { renameRootLabel: "News" },
    );

    const headerGroups: Array<{
      parentId: Id<"navigationItems">;
      items: Array<SeedNavigation & { adoptRootLabel?: string; renameRootLabel?: string }>;
    }> = [
      {
        parentId: aboutNavigationId,
        items: [
          { label: "Overview", href: "/about", location: "header", order: 0 },
          { label: "History", href: "/about/history", location: "header", order: 10 },
          {
            label: "Mission & vision",
            href: "/about/mission-vision",
            location: "header",
            order: 20,
          },
          { label: "Leadership", href: "/about/leadership", location: "header", order: 30 },
          {
            label: "Community voices",
            href: "/about/testimonials",
            location: "header",
            order: 40,
          },
        ],
      },
      {
        parentId: academicsNavigationId,
        items: [
          { label: "Overview", href: "/academics", location: "header", order: 0 },
          { label: "Primary", href: "/academics/primary", location: "header", order: 10 },
          { label: "Secondary", href: "/academics/secondary", location: "header", order: 20 },
          { label: "+2 programmes", href: "/academics/plus-2", location: "header", order: 30 },
          { label: "Curriculum", href: "/academics/curriculum", location: "header", order: 40 },
          { label: "Departments", href: "/academics/departments", location: "header", order: 50 },
          {
            label: "Teachers",
            href: "/teachers",
            location: "header",
            order: 60,
            adoptRootLabel: "Teachers",
          },
        ],
      },
      {
        parentId: schoolLifeNavigationId,
        items: [
          { label: "Overview", href: "/campus-life", location: "header", order: 0 },
          { label: "Facilities", href: "/campus-life/facilities", location: "header", order: 10 },
          { label: "Activities", href: "/campus-life/activities", location: "header", order: 20 },
          { label: "Gallery", href: "/campus-life/gallery", location: "header", order: 30 },
          {
            label: "Virtual tour",
            href: "/campus-life/virtual-tour",
            location: "header",
            order: 40,
          },
          { label: "Transport", href: "/campus-life/transport", location: "header", order: 50 },
        ],
      },
      {
        parentId: admissionsNavigationId,
        items: [
          { label: "Overview", href: "/admissions", location: "header", order: 0 },
          { label: "Process", href: "/admissions/process", location: "header", order: 10 },
          { label: "Eligibility", href: "/admissions/eligibility", location: "header", order: 20 },
          {
            label: "Fees & scholarships",
            href: "/admissions/fees-scholarships",
            location: "header",
            order: 30,
          },
          { label: "FAQ", href: "/admissions/faq", location: "header", order: 40 },
          { label: "Enquire online", href: "/admissions/apply", location: "header", order: 50 },
        ],
      },
      {
        parentId: updatesNavigationId,
        items: [
          { label: "News", href: "/news", location: "header", order: 0 },
          {
            label: "Notices",
            href: "/notices",
            location: "header",
            order: 10,
            adoptRootLabel: "Notices",
          },
          {
            label: "Events",
            href: "/events",
            location: "header",
            order: 20,
            adoptRootLabel: "Events",
          },
          { label: "Downloads", href: "/downloads", location: "header", order: 30 },
        ],
      },
    ];
    for (const group of headerGroups) {
      for (const { adoptRootLabel, ...item } of group.items) {
        await ensureNavigation(item, group.parentId, { adoptRootLabel });
      }
    }

    const schoolFooterId = await ensureNavigation({
      label: "School",
      href: "/about",
      location: "footer",
      order: 10,
    });
    const learningFooterId = await ensureNavigation({
      label: "Learning",
      href: "/academics",
      location: "footer",
      order: 20,
    });
    const informationFooterId = await ensureNavigation({
      label: "Information",
      href: "/notices",
      location: "footer",
      order: 30,
    });
    const footerGroups: Array<{
      parentId: Id<"navigationItems">;
      items: Array<SeedNavigation & { adoptRootLabel?: string; renameRootLabel?: string }>;
    }> = [
      {
        parentId: schoolFooterId,
        items: [
          { label: "About", href: "/about", location: "footer", order: 0 },
          { label: "Leadership", href: "/about/leadership", location: "footer", order: 10 },
          {
            label: "Community voices",
            href: "/about/testimonials",
            location: "footer",
            order: 20,
          },
          { label: "Teachers", href: "/teachers", location: "footer", order: 30 },
          {
            label: "School life",
            href: "/campus-life",
            location: "footer",
            order: 40,
            adoptRootLabel: "School life",
            renameRootLabel: "Campus life",
          },
        ],
      },
      {
        parentId: learningFooterId,
        items: [
          { label: "Academics", href: "/academics", location: "footer", order: 0 },
          { label: "Curriculum", href: "/academics/curriculum", location: "footer", order: 10 },
          { label: "Departments", href: "/academics/departments", location: "footer", order: 20 },
          { label: "Library", href: "/academics/library", location: "footer", order: 30 },
        ],
      },
      {
        parentId: informationFooterId,
        items: [
          { label: "Admissions", href: "/admissions", location: "footer", order: 0 },
          {
            label: "Frequently asked questions",
            href: "/admissions/faq",
            location: "footer",
            order: 10,
          },
          { label: "Notices", href: "/notices", location: "footer", order: 20 },
          { label: "Events", href: "/events", location: "footer", order: 30 },
          {
            label: "Downloads",
            href: "/downloads",
            location: "footer",
            order: 40,
            adoptRootLabel: "Downloads",
          },
        ],
      },
    ];
    for (const group of footerGroups) {
      for (const { adoptRootLabel, renameRootLabel, ...item } of group.items) {
        await ensureNavigation(item, group.parentId, { adoptRootLabel, renameRootLabel });
      }
    }
    for (const item of [
      { label: "Contact", href: "/contact", location: "footer" as const, order: 40 },
      { label: "Privacy", href: "/privacy", location: "footer" as const, order: 50 },
      { label: "Accessibility", href: "/accessibility", location: "footer" as const, order: 60 },
      { label: "Accessibility", href: "/accessibility", location: "utility" as const, order: 10 },
      { label: "Contact", href: "/contact", location: "utility" as const, order: 20 },
      { label: "Staff sign in", href: "/sign-in", location: "utility" as const, order: 30 },
    ]) {
      await ensureNavigation(item);
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
        order: 5,
      },
      {
        slug: "primary",
        name: "Primary years",
        shortDescription: "Strong foundations in language, numeracy, inquiry, and learning habits.",
        description:
          "The primary pathway supports confident communication, secure numeracy, curiosity, wellbeing, and the learning habits students use across every subject.",
        gradeRange: "Primary years",
        curriculum: "Current grades and approved curriculum details are maintained by the academic office.",
        outcomes: [
          "Communication and literacy",
          "Mathematical understanding",
          "Curiosity and positive learning habits",
        ],
        order: 20,
      },
      {
        slug: "secondary",
        name: "Secondary years",
        shortDescription: "Deeper subject learning, independent study, and progress guidance.",
        description:
          "The secondary pathway develops subject knowledge, responsible independent study, assessment readiness, and informed preparation for future education.",
        gradeRange: "Secondary years",
        curriculum: "Current subjects and assessment arrangements are maintained by the academic office.",
        outcomes: ["Deeper subject knowledge", "Independent study", "Progress and pathway planning"],
        order: 30,
      },
      {
        slug: "plus-2",
        name: "+2 programmes",
        shortDescription: "Current programme and subject information for higher-secondary applicants.",
        description:
          "Verified streams, subject choices, schedules, admission criteria, and seat information are published for each approved higher-secondary intake.",
        gradeRange: "Higher secondary",
        curriculum: "Programme availability and subject combinations may change by academic cycle.",
        outcomes: ["Focused higher-secondary study", "Academic guidance", "Preparation for further study"],
        order: 40,
      },
    ];
    for (const migration of [
      { legacySlug: "primary-education", currentSlug: "primary" },
      { legacySlug: "secondary-education", currentSlug: "secondary" },
    ] as const) {
      const current = await ctx.db
        .query("programs")
        .withIndex("by_slug", (q) => q.eq("slug", migration.currentSlug))
        .unique();
      if (current) continue;
      const legacy = await ctx.db
        .query("programs")
        .withIndex("by_slug", (q) => q.eq("slug", migration.legacySlug))
        .unique();
      if (!legacy) continue;
      await ctx.db.patch("programs", legacy._id, {
        slug: migration.currentSlug,
        updatedBy: actor._id,
        updatedAt: now,
      });
      markUpdated();
    }
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

    const leadership = [
      {
        slug: "principal",
        name: "Principal's Office",
        role: "Academic leadership",
        bio: "The principal's office coordinates academic direction, student support, and communication with families. A verified profile and message will be published by the school administration.",
        quote:
          "The principal's office coordinates academic direction, student support, and communication with families. A verified profile and message will be published by the school administration.",
        photoUrl: "/media/principal-placeholder.png",
        order: 10,
      },
      {
        slug: "vice-principal",
        name: "Vice Principal's Office",
        role: "Academic coordination",
        bio: "The vice principal's office supports teaching, learning, assessment, and the day-to-day academic programme. Verified office details will be maintained by the school administration.",
        quote:
          "The vice principal's office supports teaching, learning, assessment, and the day-to-day academic programme. Verified office details will be maintained by the school administration.",
        photoUrl: "/media/vice-principal-placeholder.png",
        order: 20,
      },
      {
        slug: "commandant",
        name: "Commandant's Office",
        role: "Institutional leadership",
        bio: "The commandant's office supports institutional governance, student welfare, and the disciplined operation of the school. Verified profile details will be published by the administration.",
        quote:
          "The commandant's office supports institutional governance, student welfare, and the disciplined operation of the school. Verified profile details will be published by the administration.",
        photoUrl: "/media/commandant-placeholder.png",
        order: 30,
      },
    ];
    for (const member of leadership) {
      const existing = await ctx.db
        .query("leadership")
        .withIndex("by_slug", (q) => q.eq("slug", member.slug))
        .unique();
      if (existing) {
        const patch = missingFields<Doc<"leadership">>(existing, {
          ...(existing.photoId === undefined ? member : { ...member, photoUrl: undefined }),
        });
        if (hasFields(patch)) {
          await ctx.db.patch("leadership", existing._id, {
            ...patch,
            updatedBy: actor._id,
            updatedAt: now,
          });
          markUpdated();
        } else {
          markSkipped();
        }
        continue;
      }
      await ctx.db.insert("leadership", {
        ...member,
        status: "published",
        publishAt: now,
        publishedAt: now,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:leadership", "published");
      markCreated();
    }

    const testimonials = [
      {
        name: "Alumni voices",
        role: "Former students",
        quote:
          "Verified reflections from former students of Nepal Police School, Garuda will be published here by the school administration.",
        order: 10,
      },
      {
        name: "Share your story",
        role: "Alumni network",
        quote:
          "If you studied here, the school welcomes your story. Contact the school office to have your experience reviewed and published.",
        order: 20,
      },
    ];
    const existingTestimonials = await ctx.db.query("testimonials").take(200);
    if (existingTestimonials.length === 200) {
      throw new Error("Testimonial seed stopped because the table exceeds the safe reconciliation limit.");
    }
    for (const testimonial of testimonials) {
      const existing = existingTestimonials.find((item) => item.name === testimonial.name);
      if (existing) {
        markSkipped();
        continue;
      }
      const id = await ctx.db.insert("testimonials", {
        ...testimonial,
        status: "published",
        publishAt: now,
        publishedAt: now,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      existingTestimonials.push((await ctx.db.get("testimonials", id))!);
      await recordCreated(ctx, "content:testimonials", "published");
      markCreated();
    }

    const gallery = [
      {
        slug: "campus-life",
        title: "School life",
        description: "Daily life and learning across Nepal Police School.",
        imageUrl: "/media/campus-hero.png",
        alt: "Students on the school grounds",
        featured: true,
        order: 10,
      },
      {
        slug: "sports-day",
        title: "Sports day",
        description: "Sport, teamwork, participation, and school events on the field.",
        imageUrl: "/media/sports-day.png",
        alt: "Students taking part in a school sports day",
        featured: true,
        order: 20,
      },
      {
        slug: "science-laboratory",
        title: "Science laboratory",
        description: "Practical investigation and science learning in the school laboratory.",
        imageUrl: "/media/science-lab.png",
        alt: "Students working in the school science laboratory",
        featured: false,
        order: 30,
      },
      {
        slug: "school-community",
        title: "School community",
        description: "The staff and community who support learning at Nepal Police School, Garuda.",
        imageUrl: "/media/nps-staff-group.jpg",
        alt: "Members of the Nepal Police School community",
        featured: false,
        order: 40,
      },
      {
        slug: "school-transport",
        title: "School transport",
        description: "Approved images and information related to the school transport service.",
        imageUrl: "/media/nps-transport.png",
        alt: "Nepal Police School transport",
        featured: false,
        order: 50,
      },
    ];
    for (const album of gallery) {
      let existing = await ctx.db
        .query("galleryAlbums")
        .withIndex("by_slug", (q) => q.eq("slug", album.slug))
        .unique();
      if (existing) {
        const patch = missingFields<Doc<"galleryAlbums">>(existing, {
          description: album.description,
          ...(existing.coverImageId === undefined ? { coverImageUrl: album.imageUrl } : {}),
        });
        if (hasFields(patch)) {
          await ctx.db.patch("galleryAlbums", existing._id, {
            ...patch,
            updatedBy: actor._id,
            updatedAt: now,
          });
          existing = (await ctx.db.get("galleryAlbums", existing._id))!;
          markUpdated();
        } else {
          markSkipped();
        }
      } else {
        const albumId = await ctx.db.insert("galleryAlbums", {
          slug: album.slug,
          title: album.title,
          description: album.description,
          coverImageUrl: album.imageUrl,
          featured: album.featured,
          order: album.order,
          seo: { ...DEFAULT_SEO, title: album.title, description: album.description },
          status: "published",
          publishAt: now,
          publishedAt: now,
          createdBy: actor._id,
          updatedBy: actor._id,
          createdAt: now,
          updatedAt: now,
        });
        existing = (await ctx.db.get("galleryAlbums", albumId))!;
        await recordCreated(ctx, "content:galleryAlbums", "published");
        markCreated();
      }

      const existingItems = await ctx.db
        .query("galleryItems")
        .withIndex("by_album_order", (q) => q.eq("albumId", existing._id))
        .take(100);
      if (existingItems.length === 100) {
        throw new Error(`Gallery seed stopped because album ${album.slug} exceeds the safe item limit.`);
      }
      if (existingItems.some((item) => item.url === album.imageUrl)) {
        markSkipped();
        continue;
      }
      await ctx.db.insert("galleryItems", {
        albumId: existing._id,
        url: album.imageUrl,
        thumbnailUrl: album.imageUrl,
        mediaType: "image",
        alt: album.alt,
        caption: album.description,
        order: existingItems.length * 10,
        visible: true,
        createdBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
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

    // Home-page copy. These records are the public source of truth and remain
    // editable by authorised staff after the initial baseline is installed.
    const homeSections = [
      {
        slug: "hero",
        eyebrow: "Garuda, Rautahat, Nepal",
        heading: "Learning with purpose. Growing with character.",
        body: "Welcome to Nepal Police School, Garuda. Explore academic pathways, school life, official updates, and practical information for students and families.",
        ctaLabel: "Explore admissions",
        ctaHref: "/admissions",
      },
      {
        slug: "about",
        eyebrow: "About the school",
        heading: "A disciplined, caring place to learn in Rautahat.",
        body: "The official information portal for Nepal Police School, Garuda, serving students, families, staff, and the wider school community.",
        secondaryBody:
          "Academic guidance, admissions information, staff profiles, notices, events, and school resources are published and maintained here by authorised school staff, so families always work from verified information.",
        imageUrl: "/media/nps-campus-building.png",
        imageAlt: "Nepal Police School building",
        secondaryImageUrl: "/media/nps-hero-gate.png",
        ctaLabel: "Discover our school",
        ctaHref: "/about",
      },
      {
        slug: "management",
        eyebrow: "Message from the management",
        heading: "Guidance from the school leadership.",
      },
      {
        slug: "news",
        eyebrow: "Latest from school",
        heading: "News and events",
        ctaLabel: "View all news",
        ctaHref: "/news",
      },
      {
        slug: "eca",
        eyebrow: "Beyond the classroom",
        heading: "ECA activities",
        body: "Sport, culture, service, and club programmes that build confidence, discipline, and teamwork alongside academic study.",
        ctaLabel: "Explore school life",
        ctaHref: "/campus-life/activities",
      },
      {
        slug: "gallery",
        eyebrow: "Photo gallery",
        heading: "Moments from our school",
        body: "A look at daily school life, ceremonies, activities, and the people who make up the school community.",
        ctaLabel: "Open full gallery",
        ctaHref: "/campus-life/gallery",
      },
      {
        slug: "alumni",
        eyebrow: "Alumni",
        heading: "What our alumni say.",
        body: "Former students carry the school’s values into further study, service, and work. These are their words, published by the school administration.",
        ctaLabel: "Read all community voices",
        ctaHref: "/about/testimonials",
      },
    ];
    for (const section of homeSections) {
      const existing = await ctx.db
        .query("homeSections")
        .withIndex("by_slug", (q) => q.eq("slug", section.slug))
        .unique();
      if (existing) {
        const baseline = { ...section } as Partial<Doc<"homeSections">>;
        if (existing.imageId !== undefined) baseline.imageUrl = undefined;
        if (existing.secondaryImageId !== undefined) baseline.secondaryImageUrl = undefined;
        const patch = missingFields(existing, baseline);
        if (hasFields(patch)) {
          await ctx.db.patch("homeSections", existing._id, {
            ...patch,
            updatedBy: actor._id,
            updatedAt: now,
          });
          markUpdated();
        } else {
          markSkipped();
        }
        continue;
      }
      await ctx.db.insert("homeSections", {
        ...section,
        status: "published",
        publishAt: now,
        publishedAt: now,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:homeSections", "published");
      markCreated();
    }

    const homeHighlights = [
      {
        section: "hero" as const,
        title: "School entrance",
        summary: "The school gate at Garuda, Rautahat - where every school day begins.",
        imageUrl: "/media/nps-hero-gate.png",
        imageAlt: "The main entrance of Nepal Police School, Garuda",
      },
      {
        section: "hero" as const,
        title: "School life",
        summary: "A school built around discipline, dignity, and decorum.",
        imageUrl: "/media/campus-hero.png",
        imageAlt: "Students on the school grounds",
        legacy: {
          title: "Campus life",
          summary: "A campus built around discipline, dignity, and decorum.",
          imageAlt: "Students on the school campus",
        },
      },
      {
        section: "hero" as const,
        title: "Science learning",
        summary: "Practical science and laboratory learning at every level.",
        imageUrl: "/media/science-lab.png",
        imageAlt: "Students working in the school science laboratory",
      },
      {
        section: "hero" as const,
        title: "Sport and participation",
        summary: "Sport, drill, and cultural activity alongside academic study.",
        imageUrl: "/media/sports-day.png",
        imageAlt: "Students competing on the school sports ground",
      },
      {
        section: "hero" as const,
        title: "Academic building",
        summary: "Classrooms, library, and facilities maintained for focused study.",
        imageUrl: "/media/nps-campus-building.png",
        imageAlt: "The main academic building of the school",
      },
      {
        section: "about" as const,
        icon: "shield",
        title: "Discipline",
        summary: "Consistent routines, punctuality, and responsible conduct in every part of school life.",
      },
      {
        section: "about" as const,
        icon: "sparkles",
        title: "Dignity",
        summary: "Respect for every student, teacher, and family in the school community.",
      },
      {
        section: "about" as const,
        icon: "book",
        title: "Learning",
        summary: "Structured teaching, curiosity, and steady academic progress at each level.",
      },
      {
        section: "about" as const,
        icon: "service",
        title: "Service",
        summary: "Contribution to the community with care, honesty, and integrity.",
      },
      {
        section: "eca" as const,
        icon: "trophy",
        title: "Sports & athletics",
        summary:
          "Inter-house athletics, football, volleyball, and track events that build fitness, teamwork, and fair play.",
        imageUrl: "/media/sports-day.png",
        imageAlt: "Students taking part in a school sports day",
        href: "/campus-life/activities",
      },
      {
        section: "eca" as const,
        icon: "shield",
        title: "Scouting & drill",
        summary:
          "Parade drill, scouting, and disciplinary training that reflect the values of the police school tradition.",
        imageUrl: "/media/nps-hero-gate.png",
        imageAlt: "The main gate of Nepal Police School, Garuda",
        href: "/campus-life/activities",
      },
      {
        section: "eca" as const,
        icon: "music",
        title: "Music, art & dance",
        summary:
          "Cultural programmes, national day performances, and creative practice across music, art, and dance.",
        imageUrl: "/media/campus-hero.png",
        imageAlt: "Students gathered on the school grounds",
        href: "/campus-life/activities",
      },
      {
        section: "eca" as const,
        icon: "debate",
        title: "Debate & literary club",
        summary:
          "Debate, quiz, essay, and public-speaking activities in Nepali and English that sharpen confident expression.",
        imageUrl: "/media/nps-campus-building.png",
        imageAlt: "Nepal Police School building",
        href: "/campus-life/activities",
      },
      {
        section: "eca" as const,
        icon: "science",
        title: "Science & technology",
        summary:
          "Laboratory practice, science exhibitions, and computer club sessions that connect theory with application.",
        imageUrl: "/media/science-lab.png",
        imageAlt: "The school science laboratory",
        href: "/campus-life/activities",
      },
      {
        section: "eca" as const,
        icon: "service",
        title: "Community service",
        summary:
          "Health, sanitation, and awareness campaigns carried out with staff support in the surrounding community.",
        imageUrl: "/media/nps-staff-group.jpg",
        imageAlt: "Members of the school community",
        href: "/campus-life/activities",
      },
    ];
    const existingHighlights = await ctx.db.query("homeHighlights").take(200);
    if (existingHighlights.length === 200) {
      throw new Error("Home-card seed stopped because the table exceeds the safe reconciliation limit.");
    }
    for (let index = 0; index < homeHighlights.length; index += 1) {
      const { legacy, ...highlight } = homeHighlights[index];
      const existing = existingHighlights.find(
        (row) =>
          row.section === highlight.section && (row.title === highlight.title || row.title === legacy?.title),
      );
      if (existing) {
        const baseline = { ...highlight } as Partial<Doc<"homeHighlights">>;
        if (existing.imageId !== undefined) baseline.imageUrl = undefined;
        const patch = missingFields(existing, baseline);
        if (legacy?.title && existing.title === legacy.title) patch.title = highlight.title;
        if (legacy?.summary && existing.summary === legacy.summary) {
          patch.summary = highlight.summary;
        }
        if (legacy?.imageAlt && existing.imageAlt === legacy.imageAlt) {
          patch.imageAlt = highlight.imageAlt;
        }
        if (hasFields(patch)) {
          await ctx.db.patch("homeHighlights", existing._id, {
            ...patch,
            updatedBy: actor._id,
            updatedAt: now,
          });
          markUpdated();
        } else {
          markSkipped();
        }
        continue;
      }
      await ctx.db.insert("homeHighlights", {
        ...highlight,
        order: index * 10,
        status: "published",
        publishAt: now,
        publishedAt: now,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:homeHighlights", "published");
      markCreated();
    }

    await writeAudit(ctx, actor, {
      action: "seed.baseline",
      entityType: "system",
      summary: `Baseline seed completed (${created} created, ${updated} updated, ${skipped} already present).`,
    });
    return { created, updated, skipped };
  },
});
