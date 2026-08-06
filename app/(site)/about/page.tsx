import type { Metadata } from "next";
import { contentMetadata } from "@/lib/content/public-metadata";
import { OverviewPage } from "@/components/content/overview-page";
import { pageParagraphs } from "@/lib/content/cms-page";
import { getCmsPage } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("about");
  return contentMetadata({
    title: page?.title ?? "About",
    description:
      page?.summary ??
      "Learn about Nepal Police School, Garuda, its purpose, leadership, and school community.",
    seo: page?.seo,
  });
}

export default async function AboutPage() {
  const page = await getCmsPage("about");
  const paragraphs = page ? pageParagraphs(page) : [];
  return (
    <OverviewPage
      eyebrow="About the school"
      title={page?.title ?? "A purposeful school community"}
      description={
        page?.summary ??
        "Learn about the values, leadership, and shared responsibilities that shape Nepal Police School, Garuda."
      }
      image={page?.heroImageUrl ?? "/media/campus-hero.png"}
      introEyebrow="Who we are"
      introTitle="A school committed to learning and responsible growth."
      intro={
        paragraphs[0] ??
        "Nepal Police School, Garuda serves students and families in Rautahat. This website provides a reliable public home for verified school information while giving the administration direct control over profiles, notices, documents, and updates."
      }
      additionalCopy={paragraphs.slice(1)}
      featureImage="/media/nps-staff-group.jpg"
      cardHeading="Understand our school"
      cards={[
        {
          title: "Our history",
          description: "The verified institutional record and important milestones.",
          href: "/about/history",
          meta: "Our story",
        },
        {
          title: "Mission and vision",
          description: "The educational direction and values behind daily school life.",
          href: "/about/mission-vision",
          meta: "Our purpose",
        },
        {
          title: "School leadership",
          description: "Profiles and messages maintained by the administration.",
          href: "/about/leadership",
          meta: "Our people",
        },
        {
          title: "Community voices",
          description: "Approved reflections from people connected with our school community.",
          href: "/about/testimonials",
          meta: "Shared experience",
        },
      ]}
      principles={[
        {
          title: "Accurate information",
          description: "Names, dates, policies, and announcements are published through authorised channels.",
        },
        {
          title: "Respectful community",
          description:
            "Students, families, staff, and visitors share responsibility for a safe and dignified environment.",
        },
        {
          title: "Purposeful learning",
          description:
            "Teaching, feedback, activities, and student support work toward clear educational goals.",
        },
        {
          title: "Responsible service",
          description: "Integrity and contribution are treated as practical habits, not only ideals.",
        },
      ]}
      cta={{
        title: "Find the right school information",
        description:
          "Explore academics, meet the teaching team, or contact the school with a specific question.",
        label: "Explore academics",
        href: "/academics",
        secondaryLabel: "Contact us",
        secondaryHref: "/contact",
      }}
    />
  );
}
