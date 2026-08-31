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
        tagline: "Better Schooling for Ideal Citizenship",
        description:
          "Nepal Police School, Garuda, Rautahat is a residential and day school established in 2058 BS (2002 AD) under the Nepal Police welfare programme.",
        logoUrl: "/media/nps-logo.png",
        faviconUrl: "/media/nps-logo.png",
        contact: {
          address: "Basbitti Jingadiya, Garuda Municipality-8, Rautahat",
          city: "Garuda",
          country: "Nepal",
          phone: "9855021699",
          email: "mrpschool@nepalpolice.gov.np",
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
      if (settings.tagline === "Discipline, dignity, learning, and service.") {
        settingsPatch.tagline = "Better Schooling for Ideal Citizenship";
      }
      if (
        settings.description ===
        "The official information portal for Nepal Police School, Garuda, serving students, families, staff, and the wider school community."
      ) {
        settingsPatch.description =
          "Nepal Police School, Garuda, Rautahat is a residential and day school established in 2058 BS (2002 AD) under the Nepal Police welfare programme.";
      }
      const verifiedContact = { ...settings.contact };
      let contactChanged = false;
      if (verifiedContact.address === "Garuda Municipality, Ward No. 7, Rautahat") {
        verifiedContact.address = "Basbitti Jingadiya, Garuda Municipality-8, Rautahat";
        contactChanged = true;
      }
      if (!verifiedContact.phone.trim()) {
        verifiedContact.phone = "9855021699";
        contactChanged = true;
      }
      if (!verifiedContact.email.trim()) {
        verifiedContact.email = "mrpschool@nepalpolice.gov.np";
        contactChanged = true;
      }
      if (contactChanged) settingsPatch.contact = verifiedContact;
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

    const retireExactNavigation = async (
      items: Array<SeedNavigation & { parentId?: Id<"navigationItems"> }>,
    ) => {
      for (const item of items) {
        const matches = currentNavigation.filter(
          (candidate) =>
            candidate.label === item.label &&
            candidate.href === item.href &&
            candidate.location === item.location &&
            candidate.parentId === item.parentId &&
            candidate.order === item.order,
        );
        for (const match of matches) {
          if (!match.visible) {
            markSkipped();
            continue;
          }
          await ctx.db.patch("navigationItems", match._id, {
            visible: false,
            updatedBy: actor._id,
            updatedAt: now,
          });
          markUpdated();
        }
      }
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
    await ensureNavigation({
      label: "Departments",
      href: "/departments",
      location: "header",
      order: 30,
    });
    await ensureNavigation({
      label: "Facilities",
      href: "/facilities",
      location: "header",
      order: 35,
      description: "Learning spaces, residential support, wellbeing, and activity facilities.",
    });
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

    const legacySchoolLifeRoots = currentNavigation.filter(
      (item) =>
        item.location === "header" &&
        item.parentId === undefined &&
        item.href === "/campus-life" &&
        item.order === 30 &&
        (item.label === "School life" || item.label === "Campus life"),
    );

    // Retire only records whose complete seed tuple still matches. An
    // administrator-modified label, destination, position, or parent is left
    // untouched.
    await retireExactNavigation([
      { label: "School life", href: "/campus-life", location: "header", order: 30 },
      { label: "Campus life", href: "/campus-life", location: "header", order: 30 },
      { label: "Teachers", href: "/teachers", location: "header", order: 30 },
      { label: "Overview", href: "/about", location: "header", order: 0, parentId: aboutNavigationId },
      {
        label: "History",
        href: "/about/history",
        location: "header",
        order: 10,
        parentId: aboutNavigationId,
      },
      {
        label: "Mission & vision",
        href: "/about/mission-vision",
        location: "header",
        order: 20,
        parentId: aboutNavigationId,
      },
      {
        label: "Community voices",
        href: "/about/testimonials",
        location: "header",
        order: 40,
        parentId: aboutNavigationId,
      },
      {
        label: "Overview",
        href: "/academics",
        location: "header",
        order: 0,
        parentId: academicsNavigationId,
      },
      {
        label: "Primary",
        href: "/academics/primary",
        location: "header",
        order: 10,
        parentId: academicsNavigationId,
      },
      {
        label: "Secondary",
        href: "/academics/secondary",
        location: "header",
        order: 20,
        parentId: academicsNavigationId,
      },
      {
        label: "+2 programmes",
        href: "/academics/plus-2",
        location: "header",
        order: 30,
        parentId: academicsNavigationId,
      },
      {
        label: "Curriculum",
        href: "/academics/curriculum",
        location: "header",
        order: 40,
        parentId: academicsNavigationId,
      },
      {
        label: "Departments",
        href: "/academics/departments",
        location: "header",
        order: 50,
        parentId: academicsNavigationId,
      },
      {
        label: "Teachers",
        href: "/teachers",
        location: "header",
        order: 60,
        parentId: academicsNavigationId,
      },
      {
        label: "Overview",
        href: "/admissions",
        location: "header",
        order: 0,
        parentId: admissionsNavigationId,
      },
      {
        label: "News",
        href: "/news",
        location: "header",
        order: 0,
        parentId: updatesNavigationId,
      },
    ]);

    for (const schoolLifeRoot of legacySchoolLifeRoots) {
      await retireExactNavigation([
        {
          label: "Overview",
          href: "/campus-life",
          location: "header",
          order: 0,
          parentId: schoolLifeRoot._id,
        },
        {
          label: "Facilities",
          href: "/campus-life/facilities",
          location: "header",
          order: 10,
          parentId: schoolLifeRoot._id,
        },
        {
          label: "Facilities",
          href: "/facilities",
          location: "header",
          order: 10,
          parentId: schoolLifeRoot._id,
        },
        {
          label: "Activities",
          href: "/campus-life/activities",
          location: "header",
          order: 20,
          parentId: schoolLifeRoot._id,
        },
        {
          label: "Gallery",
          href: "/campus-life/gallery",
          location: "header",
          order: 30,
          parentId: schoolLifeRoot._id,
        },
        {
          label: "Virtual tour",
          href: "/campus-life/virtual-tour",
          location: "header",
          order: 40,
          parentId: schoolLifeRoot._id,
        },
        {
          label: "Transport",
          href: "/campus-life/transport",
          location: "header",
          order: 50,
          parentId: schoolLifeRoot._id,
        },
      ]);
    }

    const headerGroups: Array<{
      parentId: Id<"navigationItems">;
      items: Array<SeedNavigation & { adoptRootLabel?: string; renameRootLabel?: string }>;
    }> = [
      {
        parentId: aboutNavigationId,
        items: [
          { label: "History", href: "/about#history", location: "header", order: 10 },
          {
            label: "Mission & vision",
            href: "/about#mission",
            location: "header",
            order: 20,
          },
          { label: "Leadership", href: "/about/leadership", location: "header", order: 30 },
        ],
      },
      {
        parentId: academicsNavigationId,
        items: [
          { label: "Primary", href: "/academics#primary", location: "header", order: 10 },
          { label: "Secondary", href: "/academics#secondary", location: "header", order: 20 },
          { label: "+2 programmes", href: "/academics#plus-2", location: "header", order: 30 },
          { label: "Curriculum", href: "/academics#curriculum", location: "header", order: 40 },
        ],
      },
      {
        parentId: admissionsNavigationId,
        items: [
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
          { label: "Articles", href: "/articles", location: "header", order: 5 },
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
          { label: "Facilities", href: "/facilities", location: "footer", order: 35 },
          {
            label: "School life",
            href: "/campus-life",
            location: "footer",
            order: 40,
            adoptRootLabel: "School life",
            renameRootLabel: "Campus life",
          },
          { label: "Activities", href: "/campus-life/activities", location: "footer", order: 50 },
          { label: "Gallery", href: "/campus-life/gallery", location: "footer", order: 60 },
        ],
      },
      {
        parentId: learningFooterId,
        items: [
          { label: "Academics", href: "/academics", location: "footer", order: 0 },
          { label: "Curriculum", href: "/academics#curriculum", location: "footer", order: 10 },
          { label: "Departments", href: "/departments", location: "footer", order: 20 },
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
          { label: "Articles", href: "/articles", location: "footer", order: 25 },
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
    await retireExactNavigation([
      {
        label: "Community voices",
        href: "/about/testimonials",
        location: "footer",
        order: 20,
        parentId: schoolFooterId,
      },
      {
        label: "Teachers",
        href: "/teachers",
        location: "footer",
        order: 30,
        parentId: schoolFooterId,
      },
      {
        label: "Curriculum",
        href: "/academics/curriculum",
        location: "footer",
        order: 10,
        parentId: learningFooterId,
      },
      {
        label: "Departments",
        href: "/academics/departments",
        location: "footer",
        order: 20,
        parentId: learningFooterId,
      },
      {
        label: "Library",
        href: "/academics/library",
        location: "footer",
        order: 30,
        parentId: learningFooterId,
      },
    ]);
    for (const item of [
      { label: "Contact", href: "/contact", location: "footer" as const, order: 40 },
      { label: "Privacy", href: "/privacy", location: "footer" as const, order: 50 },
      { label: "Accessibility", href: "/accessibility", location: "footer" as const, order: 60 },
      { label: "Accessibility", href: "/accessibility", location: "utility" as const, order: 10 },
      { label: "Contact", href: "/contact", location: "utility" as const, order: 20 },
      { label: "Student login", href: "/student/login", location: "utility" as const, order: 25 },
      { label: "Staff sign in", href: "/sign-in", location: "utility" as const, order: 30 },
    ]) {
      await ensureNavigation(item);
    }

    const pages: Array<{
      slug: string;
      title: string;
      summary: string;
      body: string;
      order: number;
      template?: string;
      heroImageUrl?: string;
      legacy?: Partial<Pick<Doc<"pages">, "title" | "summary" | "body" | "heroImageUrl">>;
    }> = [
      {
        slug: "about",
        title: "About Nepal Police School, Garuda",
        summary:
          "Established in 2058 BS (2002 AD), the school provides residential and day education from Nursery through Grade 12 in Garuda, Rautahat.",
        body: "Nepal Police School, Garuda, Rautahat is a nonprofit residential and day school operating under the welfare programme of the Nepal Police Organization. Established on 25 March 2002 (2058 BS), it serves children of police personnel and civilians from Rautahat and surrounding communities.\n\nLocated in Garuda Municipality-8, the school provides education from Nursery through Grade 12. School-published materials describe an educational approach that combines academic learning with discipline, responsibility, creativity, co-curricular participation, and holistic student development.\n\nThe school motto published in SAMPADA 2082 is ‘Better Schooling for Ideal Citizenship.’ Institutional facts on this page were reviewed against the school annual magazine and government education records in August 2026. Current admissions, fees, staff appointments, and schedules must always be confirmed through current notices.",
        heroImageUrl: "/media/nps-campus-building.png",
        template: "landing",
        order: 10,
        legacy: {
          summary: "Our purpose, values, leadership, and shared responsibilities.",
          body: "Nepal Police School, Garuda serves students and families in Rautahat. Verified history, leadership details, policies, and milestones are maintained by authorised school staff.",
        },
      },
      {
        slug: "about/history",
        title: "Our history",
        summary: "The establishment and development of Nepal Police School, Garuda, Rautahat.",
        body: "Nepal Police School, Garuda was established on 25 March 2002 (2058 BS) under the welfare programme of the Nepal Police Organization. It was developed as a nonprofit residential and day-boarding school for children of police personnel and civilian families.\n\nA historical school-contributed profile records the support of local land donors and the school’s growth in Garuda, Rautahat. The school-published SAMPADA 2082 annual magazine marked its 24th anniversary in 2026, independently supporting the 2002 establishment year.\n\nToday the school’s published materials describe classes from Nursery through Grade 12. Historical land, donor, and milestone details should be updated only after documentary review by the school administration.",
        heroImageUrl: "/media/nps-hero-gate.png",
        template: "information",
        order: 11,
      },
      {
        slug: "about/mission-vision",
        title: "Mission and educational direction",
        summary:
          "An educational direction centred on disciplined learning, responsibility, creativity, and ideal citizenship.",
        body: "The school’s current public materials describe its purpose as preparing students for examinations and for responsible life beyond school. Academic learning is supported by discipline, moral values, creativity, participation, confidence, and service to the wider community.\n\nThe school motto, ‘Better Schooling for Ideal Citizenship,’ expresses this direction. SAMPADA 2082 also emphasises partnership among students, teachers, and families, along with respect for each learner’s individuality and potential.\n\nThis page summarises published institutional themes rather than inventing a formal policy statement. Any future official mission or vision document should replace this summary through the administration workspace.",
        heroImageUrl: "/media/nps-campus-building.png",
        template: "information",
        order: 12,
      },
      {
        slug: "academics",
        title: "Academics",
        summary: "Academic pathways, curriculum, departments, and student support.",
        body: "Explore the school’s published academic programmes and department information. Families should use current notices and direct school communication for schedules and requirements.",
        order: 20,
      },
      {
        slug: "academics/curriculum",
        title: "Curriculum and assessment",
        summary:
          "An editable overview of teaching, learning, assessment, and official academic guidance across programme levels.",
        body: "Curriculum planning connects classroom teaching with reading, practical work, projects, co-curricular learning, and periodic assessment. Level-specific subjects, grade coverage, learning priorities, and outcomes are maintained in the programme records shown on the Academics page.\n\nAuthorised school staff can update this section when curriculum or assessment guidance changes. Current syllabi, examination routines, academic calendars, subject combinations, and formal requirements should be confirmed through official school notices and documents for the relevant academic year.",
        template: "information",
        order: 21,
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
      {
        slug: "facilities",
        title: "Our facilities",
        summary:
          "Explore learning spaces and student-support facilities, with clear labels wherever current availability still needs school confirmation.",
        body: "School-published SAMPADA 2082 identifies a library, computer laboratory, medical hall, hostel, and canteen. It also describes a large school area, classrooms, house competitions, and organised sports activity.\n\nThis page separates facilities supported by school publications from items that are included for direct confirmation. Access rules, equipment, schedules, residential availability, meal arrangements, and transport services can change. Contact the school office or use current official notices before making plans that depend on a particular facility.",
        heroImageUrl: "/media/nps-hero-gate.png",
        template: "landing",
        order: 35,
      },
    ];
    for (const seededPage of pages) {
      const { legacy, ...page } = seededPage;
      const existing = await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) => q.eq("slug", page.slug))
        .unique();
      if (existing) {
        const baseline = { ...page } as Partial<Doc<"pages">>;
        if (existing.heroImageId !== undefined) baseline.heroImageUrl = undefined;
        const patch = missingFields(existing, baseline);
        for (const key of ["title", "summary", "body", "heroImageUrl"] as const) {
          if (legacy?.[key] !== undefined && existing[key] === legacy[key] && baseline[key] !== undefined) {
            patch[key] = baseline[key] as never;
          }
        }
        if (hasFields(patch)) {
          await ctx.db.patch("pages", existing._id, {
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

    // Focused knowledge records supplement the CMS content that is already
    // included in the assistant grounding snapshot. Keeping each record well
    // below the per-source prompt limit makes retrieval more reliable than one
    // oversized school profile. Existing matching records are never republished
    // or overwritten, so an administrator remains in control after seeding.
    const assistantContexts = [
      {
        seedKey: "school-profile",
        title: "School identity, history, and educational direction",
        category: "School profile",
        content:
          "Nepal Police School, Garuda, Rautahat (Nepali: नेपाल पुलिस स्कुल, गरुडा, रौतहट) is located at Basbitti Jingadiya, Garuda Municipality-8, Rautahat District, Madhesh Province, Nepal. Government education records identify the school with IEMIS code 320120002.\n\nThe school was established in 2058 BS (25 March 2002 AD) under the Nepal Police welfare programme. Institutional publications describe it as a nonprofit residential and day school serving children of police personnel and civilian families. Current school and government records support education from Nursery through Grade 12.\n\nThe motto published in the SAMPADA 2082 annual magazine is “Better Schooling for Ideal Citizenship.” School publications describe an educational direction that combines academic learning with discipline, responsibility, moral values, creativity, co-curricular participation, confidence, and service.\n\nDo not state a current student-enrolment total because available figures are from different reporting periods and conflict. Do not infer current Grade 11–12 streams unless the school publishes them.\n\nResearch reviewed 9 August 2026. Main references: SAMPADA 2082 (https://anyflip.com/uhkfx/qzov/basic), Government of Nepal MoEST Grades 11–12 school list (https://cgs.moest.gov.np/Uploads/Resource/10plus2schools.pdf), and the historical school-contributed IASL profile (https://iasl-online.org/GiggleIT-ParticipantsNepal-Police-School-Nepal).",
        keywords: [
          "nepal police school garuda",
          "नेपाल पुलिस स्कुल",
          "school history",
          "established",
          "2058 bs",
          "2002 ad",
          "iemis 320120002",
          "basbitti jingadiya",
          "garuda municipality 8",
          "madhesh province",
          "nursery to grade 12",
          "school motto",
          "ideal citizenship",
          "residential school",
          "day school",
          "nepal police welfare",
        ],
        publicPath: "/about",
        priority: 95,
        status: "published" as const,
      },
      {
        seedKey: "facilities-and-support",
        title: "Facilities and student support",
        category: "Facilities",
        content:
          "School-published SAMPADA 2082 supports the presence of classrooms, a library, a computer laboratory, a hostel or residential arrangement, a canteen or meal service, a medical or first-aid room, school grounds, and organised outdoor sports and co-curricular activity at Nepal Police School, Garuda. Describe these facilities in neutral language and avoid unsupported claims such as ‘world-class,’ exact equipment inventories, capacity, opening hours, or guaranteed availability.\n\nThe following items are listed on the website for school confirmation and must not be presented as currently verified: a specific science-laboratory setup, dedicated indoor-sports facilities, current school transport routes or service availability, and an auditorium or multipurpose hall. A photograph or an older mention does not prove a service is currently operating.\n\nHostel places, meal arrangements, access rules, equipment, schedules, transport routes, charges, and availability can change. If a visitor needs to make a decision based on a facility, direct them to the current Facilities page, current official notices, or the school office.\n\nResearch reviewed 9 August 2026. Main reference: SAMPADA 2082, Nepal Police School Rautahat annual magazine (https://anyflip.com/uhkfx/qzov/basic).",
        keywords: [
          "school facilities",
          "classrooms",
          "library",
          "computer laboratory",
          "computer lab",
          "hostel",
          "residential facilities",
          "canteen",
          "meal service",
          "medical hall",
          "first aid",
          "school grounds",
          "sports",
          "science laboratory",
          "indoor sports",
          "transportation",
          "school bus",
          "auditorium",
          "multipurpose hall",
          "facility availability",
        ],
        publicPath: "/facilities",
        priority: 92,
        status: "published" as const,
      },
      {
        seedKey: "official-contact-guidance",
        title: "Official contact and time-sensitive information",
        category: "Visitor guidance",
        content:
          "The preferred general contact for Nepal Police School, Garuda, Rautahat is telephone 9855021699. The preferred official-domain email is mrpschool@nepalpolice.gov.np. The school is located at Basbitti Jingadiya, Garuda Municipality-8, Rautahat, Madhesh Province, Nepal.\n\nTreat admissions openings, application dates, entrance tests, fees, required documents, available seats, results, scholarships, vacancies, office hours, hostel places, transport routes, uniforms, and event schedules as time-sensitive. Answer these only from a current admin-published page, notice, document, or event. Never reuse an expired date, fee, or eligibility rule from an older notice and never guess. If current information is absent, say that it is not confirmed and direct the visitor to the Notices or Admissions pages or to the school office at 9855021699.\n\nDo not request, collect, repeat, or expose private student information in chat. The assistant provides general public information; official notices and direct school communication remain authoritative.\n\nContact details reviewed 9 August 2026 against the Madhesh Province Police contact directory (https://madhesh.nepalpolice.gov.np/about-us/contacts/) and Nepal Police school admissions material (https://www.nepalpolice.gov.np/notices/1320/).",
        keywords: [
          "contact school",
          "phone number",
          "9855021699",
          "school email",
          "mrpschool",
          "school address",
          "admissions",
          "application date",
          "entrance test",
          "fees",
          "required documents",
          "available seats",
          "results",
          "scholarships",
          "vacancies",
          "office hours",
          "hostel availability",
          "transport routes",
          "official notices",
          "student privacy",
        ],
        publicPath: "/contact",
        priority: 100,
        status: "published" as const,
      },
      {
        seedKey: "leadership-verification",
        title: "Leadership information and verification",
        category: "Leadership",
        content:
          "Use the currently published profiles on the school Leadership page as the primary source for leadership names and roles. Those admin-maintained records supersede historical publications whenever they differ.\n\nThe SAMPADA 2082 annual magazine, uploaded 23 March 2026, is a dated historical reference only. Do not present a name from that magazine as a guaranteed current appointment. If no current published profile answers the visitor’s question, say the current appointment is not confirmed and direct the visitor to the Leadership page or school office. Never invent a staff member, title, personal contact detail, biography, or availability.\n\nHistorical reference: SAMPADA 2082, Nepal Police School Rautahat annual magazine (https://anyflip.com/uhkfx/qzov/basic).",
        keywords: [
          "school leadership",
          "principal",
          "academic vice principal",
          "commandant",
          "pastoral vice principal",
          "school administration",
          "current leadership",
          "leadership verification",
          "march 2026",
          "sampada 2082",
        ],
        publicPath: "/about/leadership",
        priority: 5,
        status: "published" as const,
      },
    ];
    const existingAssistantContexts = await ctx.db
      .query("assistantContexts")
      .withIndex("by_updated_at")
      .take(101);
    if (existingAssistantContexts.length > 100) {
      throw new Error("Assistant context seed stopped because the catalog already exceeds 100 records.");
    }
    const missingAssistantContextCount = assistantContexts.filter(
      (context) =>
        !existingAssistantContexts.some(
          (existing) =>
            existing.seedKey === context.seedKey ||
            existing.title === context.title ||
            (existing.category === context.category && existing.publicPath === context.publicPath),
        ),
    ).length;
    if (existingAssistantContexts.length + missingAssistantContextCount > 100) {
      throw new Error(
        "Assistant context seed stopped because the 100-record catalog limit would be exceeded.",
      );
    }

    for (const context of assistantContexts) {
      const existing = existingAssistantContexts.find(
        (item) =>
          item.seedKey === context.seedKey ||
          item.title === context.title ||
          (item.category === context.category && item.publicPath === context.publicPath),
      );
      if (existing) {
        const patch = missingFields<Doc<"assistantContexts">>(existing, {
          seedKey: context.seedKey,
          publicPath: context.publicPath,
          ...(existing.status === "published" ? { publishedAt: now } : {}),
        });
        const untouchedDatedLeadershipSeed =
          context.seedKey === "leadership-verification" &&
          existing.seedKey === undefined &&
          existing.title === "Leadership reference dated March 2026" &&
          existing.priority === 84 &&
          existing.content.startsWith(
            "The school-published SAMPADA 2082 annual magazine, uploaded 23 March 2026, identifies the following leadership team",
          );
        if (untouchedDatedLeadershipSeed) {
          patch.title = context.title;
          patch.content = context.content;
          patch.keywords = context.keywords;
          patch.priority = context.priority;
        }
        if (hasFields(patch)) {
          await ctx.db.patch("assistantContexts", existing._id, {
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
      await ctx.db.insert("assistantContexts", {
        ...context,
        publishedAt: now,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:assistantContexts", "published");
      markCreated();
    }

    const facilitySource = {
      sourceLabel: "SAMPADA 2082, Nepal Police School Rautahat annual magazine",
      sourceUrl: "https://anyflip.com/uhkfx/qzov/basic",
    };
    const facilities = [
      {
        slug: "classrooms",
        name: "Classrooms",
        summary: "Classroom learning spaces support the school programme from Nursery through Grade 12.",
        details:
          "The annual school publication describes classroom learning across the full grade range. Room allocation, access, and equipment are managed by the school.",
        iconKey: "classroom" as const,
        verificationStatus: "confirmed" as const,
        ...facilitySource,
        imageUrl: "/media/facility-classrooms.webp",
        imageAlt: "Illustrative view of an orderly secondary-school classroom",
        featured: true,
        order: 10,
      },
      {
        slug: "science-laboratory",
        name: "Science laboratory",
        summary:
          "Laboratory and practical-learning provision is listed for confirmation by the school administration.",
        details:
          "Separate Physics, Chemistry, or Biology laboratories and their current equipment have not been confirmed by the reviewed sources.",
        iconKey: "science" as const,
        verificationStatus: "school_confirmation_required" as const,
        imageUrl: "/media/facility-science-lab.webp",
        imageAlt: "Illustrative view of a secondary-school science laboratory",
        featured: false,
        order: 20,
      },
      {
        slug: "computer-laboratory",
        name: "Computer laboratory",
        summary: "A computer learning facility supports digital skills and computer-based learning.",
        details:
          "The school annual magazine identifies a computer lab, and the school’s official channel documented a computer-lab inauguration in July 2025.",
        iconKey: "computer" as const,
        verificationStatus: "confirmed" as const,
        sourceLabel: "Nepal Police School computer-lab inauguration, 31 July 2025",
        sourceUrl: "https://www.youtube.com/watch?v=16jUkpL8jtk",
        imageUrl: "/media/facility-computer-lab.webp",
        imageAlt: "Illustrative view of a secondary-school computer laboratory",
        featured: true,
        order: 30,
      },
      {
        slug: "library",
        name: "Library",
        summary: "The school library supports reading, reference work, and independent learning.",
        details:
          "Current opening times, borrowing arrangements, and available collections are maintained by the school.",
        iconKey: "library" as const,
        verificationStatus: "confirmed" as const,
        ...facilitySource,
        imageUrl: "/media/facility-library.webp",
        imageAlt: "Illustrative view of a school library and reading room",
        featured: true,
        order: 40,
      },
      {
        slug: "outdoor-sports",
        name: "Outdoor sports and activities",
        summary: "Outdoor activity spaces support Sports Week, house competitions, teamwork, and fitness.",
        details:
          "The school annual publication and official school channel document organised sports activity. Specific sports and schedules vary by programme and academic calendar.",
        iconKey: "sports" as const,
        verificationStatus: "confirmed" as const,
        sourceLabel: "Nepal Police School Sports Week 2082",
        sourceUrl: "https://www.youtube.com/watch?v=F6VqOD_qYtc",
        imageUrl: "/media/facility-outdoor-sports.webp",
        imageAlt: "Illustrative view of students taking part in an outdoor school sports event",
        featured: true,
        order: 50,
      },
      {
        slug: "indoor-sports",
        name: "Indoor sports",
        summary: "A dedicated indoor-sports facility is included for direct confirmation by the school.",
        details:
          "Do not assume that a separate indoor-sports hall or particular indoor activities are currently available.",
        iconKey: "indoor-sports" as const,
        verificationStatus: "school_confirmation_required" as const,
        imageUrl: "/media/facility-indoor-sports.webp",
        imageAlt: "Illustrative view of a multipurpose indoor school sports room",
        featured: false,
        order: 60,
      },
      {
        slug: "hostel",
        name: "Hostel and residential facilities",
        summary: "Residential hostel facilities support enrolled boarders alongside day scholars.",
        details:
          "Hostel availability, eligibility, supervision, charges, and residential rules must be confirmed for the current academic year.",
        iconKey: "hostel" as const,
        verificationStatus: "confirmed" as const,
        sourceLabel: "SAMPADA 2082 and school inspection published 5 August 2026",
        sourceUrl: "https://www.youtube.com/watch?v=nFhl1qrErJw",
        imageUrl: "/media/facility-hostel.webp",
        imageAlt: "Illustrative view of a clean residential school hostel room",
        featured: true,
        order: 70,
      },
      {
        slug: "canteen-meal-service",
        name: "Canteen and meal service",
        summary: "The school provides canteen or mess support for students’ daily meal arrangements.",
        details:
          "Menus, meal times, eligibility, and charges are operational details that families should confirm directly with the school.",
        iconKey: "dining" as const,
        verificationStatus: "confirmed" as const,
        sourceLabel: "SAMPADA 2082 and school inspection published 5 August 2026",
        sourceUrl: "https://www.youtube.com/watch?v=nFhl1qrErJw",
        imageUrl: "/media/facility-canteen.webp",
        imageAlt: "Illustrative view of a school canteen and meal-service area",
        featured: true,
        order: 80,
      },
      {
        slug: "medical-first-aid",
        name: "Medical and first-aid room",
        summary: "A medical hall supports basic student health and first-aid needs at school.",
        details:
          "This is not a substitute for emergency or specialist medical care. Families should follow the school’s current health and emergency procedures.",
        iconKey: "medical" as const,
        verificationStatus: "confirmed" as const,
        sourceLabel: "SAMPADA 2082 and school First Aid Awareness programme, 19 March 2026",
        sourceUrl: "https://www.youtube.com/watch?v=98fI9JyCWo0",
        imageUrl: "/media/facility-medical-room.webp",
        imageAlt: "Illustrative view of a clean school medical and first-aid room",
        featured: true,
        order: 90,
      },
      {
        slug: "transportation",
        name: "Transportation",
        summary: "Current school transport availability and routes require direct confirmation.",
        details:
          "A school-specific bus photograph is retained as historical visual evidence only. It does not confirm current routes, seats, stops, charges, or service availability.",
        iconKey: "transport" as const,
        verificationStatus: "school_confirmation_required" as const,
        imageUrl: "/media/nps-transport.png",
        imageAlt: "School buses photographed at Nepal Police School, Garuda",
        featured: false,
        order: 100,
      },
      {
        slug: "auditorium-multipurpose-hall",
        name: "Auditorium or multipurpose hall",
        summary: "A dedicated auditorium or multipurpose hall is included for school confirmation.",
        details:
          "The reviewed sources do not establish a separate hall or its current capacity, equipment, or availability.",
        iconKey: "auditorium" as const,
        verificationStatus: "school_confirmation_required" as const,
        imageUrl: "/media/facility-auditorium.webp",
        imageAlt: "Illustrative view of a modest school multipurpose hall",
        featured: false,
        order: 110,
      },
      {
        slug: "school-grounds",
        name: "School grounds",
        summary: "The school grounds provide space for learning, assembly, movement, and outdoor activity.",
        details:
          "School publications describe a large, peaceful environment, and the school has documented planting and environmental-awareness activities.",
        iconKey: "grounds" as const,
        verificationStatus: "confirmed" as const,
        sourceLabel: "SAMPADA 2082 and school environmental programme, 9 June 2026",
        sourceUrl: "https://www.youtube.com/watch?v=n8Mc1LyABs0",
        imageUrl: "/media/nps-campus-building.png",
        imageAlt: "Nepal Police School building and grounds at Garuda",
        featured: true,
        order: 120,
      },
    ];
    for (const facility of facilities) {
      const existing = await ctx.db
        .query("facilities")
        .withIndex("by_slug", (q) => q.eq("slug", facility.slug))
        .unique();
      if (existing) {
        const baseline = { ...facility } as Partial<Doc<"facilities">>;
        if (existing.imageId !== undefined) baseline.imageUrl = undefined;
        const patch = missingFields(existing, baseline);
        if (hasFields(patch)) {
          await ctx.db.patch("facilities", existing._id, {
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
      await ctx.db.insert("facilities", {
        ...facility,
        seo: {
          ...DEFAULT_SEO,
          title: facility.name,
          description: facility.summary,
        },
        status: "published",
        publishAt: now,
        publishedAt: now,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:facilities", "published");
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

    const newsStories = [
      {
        slug: "class-xi-welcome-programme-2083",
        title: "Class XI students welcomed to the school community",
        excerpt:
          "Nepal Police School, Garuda held a welcome programme for Class XI students on 7 August 2026.",
        body: "Nepal Police School, Garuda published coverage of its Class XI Welcome Programme on 7 August 2026. The programme welcomed higher-secondary students and marked the beginning of their new stage of school life.\n\nThis story records a completed school activity; it is not an admissions announcement. Source: the school’s official video, https://www.youtube.com/watch?v=LhfvQmGDSKY",
        category: "School community",
        tags: ["Class XI", "welcome programme", "student life"],
        authorName: "Nepal Police School, Garuda",
        featured: true,
        sourcePublishedAt: Date.UTC(2026, 7, 7, 6, 15),
      },
      {
        slug: "class-8-public-speaking-programme",
        title: "Class 8 students build confidence through public speaking",
        excerpt:
          "A school public-speaking programme gave Class 8 students a platform to practise confidence and creative expression.",
        body: "On 6 August 2026, Nepal Police School, Garuda published a Class 8 public-speaking programme highlighting student confidence, communication, and creativity.\n\nThe activity reflects the school’s emphasis on participation and learning beyond examinations. Source: the school’s official video, https://www.youtube.com/watch?v=OCEEIRgYE1k",
        category: "Student learning",
        tags: ["Class 8", "public speaking", "confidence"],
        authorName: "Nepal Police School, Garuda",
        featured: true,
        sourcePublishedAt: Date.UTC(2026, 7, 6, 6, 15),
      },
      {
        slug: "madhesh-police-chief-school-inspection-2083",
        title: "Madhesh Province Police Chief inspects the school",
        excerpt:
          "A 5 August 2026 inspection reviewed the school’s academic, administrative, residential, and physical arrangements.",
        body: "On 5 August 2026 (2083-04-20 BS), Madhesh Province Police Chief DIG Om Prasad Adhikari inspected Nepal Police School, Garuda. School-published coverage records a review of the academic and administrative condition as well as the building, hostel, mess, and administration.\n\nSource: the school’s official video, https://www.youtube.com/watch?v=nFhl1qrErJw",
        category: "School update",
        tags: ["inspection", "school facilities", "administration"],
        authorName: "Nepal Police School, Garuda",
        featuredImageUrl: "/media/nps-campus-building.png",
        featured: true,
        sourcePublishedAt: Date.UTC(2026, 7, 5, 6, 15),
      },
    ];
    for (const story of newsStories) {
      const { sourcePublishedAt, ...news } = story;
      const existing = await ctx.db
        .query("news")
        .withIndex("by_slug", (q) => q.eq("slug", news.slug))
        .unique();
      if (existing) {
        const baseline = { ...news } as Partial<Doc<"news">>;
        if (existing.featuredImageId !== undefined) baseline.featuredImageUrl = undefined;
        const patch = missingFields(existing, baseline);
        if (hasFields(patch)) {
          await ctx.db.patch("news", existing._id, {
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
      await ctx.db.insert("news", {
        ...news,
        seo: { ...DEFAULT_SEO, title: news.title, description: news.excerpt },
        status: "published",
        publishAt: sourcePublishedAt,
        publishedAt: sourcePublishedAt,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:news", "published");
      markCreated();
    }

    const notices = [
      {
        slug: "official-school-contact-channels",
        title: "Official school contact channels",
        summary:
          "Use the verified school telephone and Nepal Police email for current, time-sensitive information.",
        body: "The school contact details reviewed in August 2026 are telephone 9855021699 and email mrpschool@nepalpolice.gov.np. The school is located at Garuda Municipality-8, Rautahat, Madhesh Province.\n\nIf a contact channel changes or does not respond, consult the current Madhesh Province Police directory or a current school notice. Never send passwords, payment-card data, or unnecessary student identity documents through a general enquiry.",
        priority: "important" as const,
        audiences: ["students", "families", "visitors"],
        status: "published" as const,
        seo: {
          ...DEFAULT_SEO,
          title: "Official contact channels | Nepal Police School, Garuda",
          description: "Verified contact guidance for Nepal Police School, Garuda, Rautahat.",
        },
      },
      {
        slug: "first-terminal-examination-result-2083-historical",
        title: "First Terminal Examination result notice 2083 (historical)",
        summary: "Archived record of the result-collection notice published on 31 July 2026.",
        body: "This notice is retained as an archived example and is no longer actionable. The original result collection window was 1 August 2026 from 11:00 AM to 1:00 PM.\n\nSource: the school’s official video, https://www.youtube.com/watch?v=mofFLsbUvqU. Use only a current notice for examination results or collection arrangements.",
        priority: "normal" as const,
        audiences: ["students", "families"],
        status: "archived" as const,
        seo: { ...DEFAULT_SEO, noIndex: true },
      },
      {
        slug: "class-xi-admissions-2083-84-historical",
        title: "Class XI admissions 2083/84 (historical)",
        summary: "Archived record of the Class XI Management admissions campaign published in May 2026.",
        body: "This admissions campaign is historical and must not be treated as a current opening. It advertised Class XI Management admissions for academic session 2083/84.\n\nSource: the school’s official video, https://www.youtube.com/watch?v=r5psB8Ts-1k. Confirm all current streams, seats, fees, documents, and deadlines through a new official notice or the school office.",
        priority: "normal" as const,
        audiences: ["prospective students", "families"],
        status: "archived" as const,
        seo: { ...DEFAULT_SEO, noIndex: true },
      },
      {
        slug: "sample-parent-orientation-reminder",
        title: "[Sample draft] Parent orientation reminder",
        summary: "Training content for administrators; replace every placeholder before publication.",
        body: "SAMPLE ONLY — This draft demonstrates how to prepare a parent notice. Replace the title, confirmed date, time, venue, audience, contact details, and instructions with approved school information before publishing.",
        priority: "normal" as const,
        audiences: ["families"],
        status: "draft" as const,
        seo: { ...DEFAULT_SEO, noIndex: true },
      },
    ];
    for (const notice of notices) {
      const existing = await ctx.db
        .query("notices")
        .withIndex("by_slug", (q) => q.eq("slug", notice.slug))
        .unique();
      if (existing) {
        const patch = missingFields(existing, notice);
        if (hasFields(patch)) {
          await ctx.db.patch("notices", existing._id, {
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
      await ctx.db.insert("notices", {
        ...notice,
        ...(notice.status === "published" ? { publishAt: now, publishedAt: now } : {}),
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:notices", notice.status);
      markCreated();
    }

    const sampleEvents = [
      {
        slug: "sample-school-event-template",
        title: "[Sample draft] School event template",
        summary: "A safe editing example for preparing a future school event.",
        description:
          "SAMPLE ONLY — Replace the title, confirmed date, start and end times, venue, audience guidance, registration settings, and contact details with approved school information before publishing.",
        startAt: Date.UTC(2027, 0, 15, 4, 15),
        endAt: Date.UTC(2027, 0, 15, 6, 15),
        timezone: "Asia/Kathmandu",
        venue: "Replace with the confirmed venue",
        isOnline: false,
        registrationEnabled: false,
        featured: false,
        seo: { ...DEFAULT_SEO, noIndex: true },
        status: "draft" as const,
      },
    ];
    for (const event of sampleEvents) {
      const existing = await ctx.db
        .query("events")
        .withIndex("by_slug", (q) => q.eq("slug", event.slug))
        .unique();
      if (existing) {
        const patch = missingFields(existing, event);
        if (hasFields(patch)) {
          await ctx.db.patch("events", existing._id, {
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
      await ctx.db.insert("events", {
        ...event,
        createdBy: actor._id,
        updatedBy: actor._id,
        createdAt: now,
        updatedAt: now,
      });
      await recordCreated(ctx, "content:events", "draft");
      markCreated();
    }

    const leadership: Array<{
      slug: string;
      name: string;
      role: string;
      bio: string;
      order: number;
      legacy?: Partial<Pick<Doc<"leadership">, "name" | "role" | "bio" | "quote" | "photoUrl">>;
    }> = [
      {
        slug: "principal",
        name: "Ramsharan Rijal",
        role: "Principal",
        bio: "Ramsharan Rijal is identified as Principal of Nepal Police School, Garuda, Rautahat in the school-published SAMPADA 2082 annual magazine dated 23 March 2026. Leadership appointments can change, so current office holders should be reconfirmed through the school administration.",
        order: 10,
        legacy: {
          name: "Principal's Office",
          role: "Academic leadership",
          bio: "The principal's office coordinates academic direction, student support, and communication with families. A verified profile and message will be published by the school administration.",
          quote:
            "The principal's office coordinates academic direction, student support, and communication with families. A verified profile and message will be published by the school administration.",
          photoUrl: "/media/principal-placeholder.png",
        },
      },
      {
        slug: "vice-principal",
        name: "Hari Bahadur G.C.",
        role: "Academic Vice Principal",
        bio: "Hari Bahadur G.C. is identified as Academic Vice Principal in the school-published SAMPADA 2082 annual magazine dated 23 March 2026. Leadership appointments can change, so current office holders should be reconfirmed through the school administration.",
        order: 20,
        legacy: {
          name: "Vice Principal's Office",
          role: "Academic coordination",
          bio: "The vice principal's office supports teaching, learning, assessment, and the day-to-day academic programme. Verified office details will be maintained by the school administration.",
          quote:
            "The vice principal's office supports teaching, learning, assessment, and the day-to-day academic programme. Verified office details will be maintained by the school administration.",
          photoUrl: "/media/vice-principal-placeholder.png",
        },
      },
      {
        slug: "commandant",
        name: "Subas Timilsina",
        role: "School Commandant",
        bio: "Inspector Subas Timilsina is identified as Commandant of Nepal Police School, Rautahat in the school-published SAMPADA 2082 annual magazine dated 23 March 2026. Leadership appointments can change, so current office holders should be reconfirmed through the school administration.",
        order: 30,
        legacy: {
          name: "Commandant's Office",
          role: "Institutional leadership",
          bio: "The commandant's office supports institutional governance, student welfare, and the disciplined operation of the school. Verified profile details will be published by the administration.",
          quote:
            "The commandant's office supports institutional governance, student welfare, and the disciplined operation of the school. Verified profile details will be published by the administration.",
          photoUrl: "/media/commandant-placeholder.png",
        },
      },
      {
        slug: "pastoral-vice-principal",
        name: "Ashok Kumar Yadav",
        role: "Pastoral Vice Principal",
        bio: "Ashok Kumar Yadav is identified as Pastoral Vice Principal in the school-published SAMPADA 2082 annual magazine dated 23 March 2026. Leadership appointments can change, so current office holders should be reconfirmed through the school administration.",
        order: 40,
      },
    ];
    for (const seededMember of leadership) {
      const { legacy, ...member } = seededMember;
      const existing = await ctx.db
        .query("leadership")
        .withIndex("by_slug", (q) => q.eq("slug", member.slug))
        .unique();
      if (existing) {
        const baseline = {
          ...(existing.photoId === undefined ? member : { ...member, photoUrl: undefined }),
        } as Partial<Doc<"leadership">>;
        const patch = missingFields<Doc<"leadership">>(existing, baseline);
        for (const key of ["name", "role", "bio"] as const) {
          if (legacy?.[key] !== undefined && existing[key] === legacy[key]) patch[key] = member[key];
        }
        if (legacy?.quote !== undefined && existing.quote === legacy.quote) patch.quote = undefined;
        if (
          existing.photoId === undefined &&
          legacy?.photoUrl !== undefined &&
          existing.photoUrl === legacy.photoUrl
        ) {
          patch.photoUrl = undefined;
        }
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

    const placeholderTestimonials = [
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
    for (const placeholder of placeholderTestimonials) {
      const exactSeedRecords = existingTestimonials.filter(
        (item) =>
          item.name === placeholder.name &&
          item.role === placeholder.role &&
          item.quote === placeholder.quote &&
          item.order === placeholder.order,
      );
      for (const record of exactSeedRecords) {
        if (record.status !== "published") {
          markSkipped();
          continue;
        }
        await ctx.db.patch("testimonials", record._id, {
          status: "archived",
          updatedBy: actor._id,
          updatedAt: now,
        });
        markUpdated();
      }
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
      {
        slug: "facilities",
        title: "Facilities",
        description:
          "Documentary views of the school building, entrance, grounds, and historically photographed transport.",
        imageUrl: "/media/nps-campus-building.png",
        alt: "Nepal Police School building and grounds at Garuda",
        featured: true,
        order: 60,
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
      const facilityImages =
        album.slug === "facilities"
          ? [
              {
                url: "/media/nps-campus-building.png",
                alt: "Nepal Police School building and grounds at Garuda",
                caption: "The school building and grounds at Nepal Police School, Garuda.",
              },
              {
                url: "/media/nps-hero-gate.png",
                alt: "Entrance gate of Nepal Police School, Garuda",
                caption: "The main entrance of Nepal Police School, Garuda, Rautahat.",
              },
              {
                url: "/media/nps-transport.png",
                alt: "School buses photographed at Nepal Police School, Garuda",
                caption:
                  "Historical photograph of school buses. Current routes, seats, charges, and service availability require confirmation.",
              },
            ]
          : [{ url: album.imageUrl, alt: album.alt, caption: album.description }];
      for (const [index, galleryItem] of facilityImages.entries()) {
        if (existingItems.some((item) => item.url === galleryItem.url)) {
          markSkipped();
          continue;
        }
        const id = await ctx.db.insert("galleryItems", {
          albumId: existing._id,
          url: galleryItem.url,
          thumbnailUrl: galleryItem.url,
          mediaType: "image",
          alt: galleryItem.alt,
          caption: galleryItem.caption,
          order: (existingItems.length + index) * 10,
          visible: true,
          createdBy: actor._id,
          createdAt: now,
          updatedAt: now,
        });
        existingItems.push((await ctx.db.get("galleryItems", id))!);
        markCreated();
      }
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
