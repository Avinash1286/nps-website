import type { Metadata } from "next";
import { contentMetadata } from "@/lib/content/public-metadata";
import { OverviewPage } from "@/components/content/overview-page";
import { pageParagraphs } from "@/lib/content/cms-page";
import { getCmsPage, getSiteProfile } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("admissions");
  return contentMetadata({
    title: page?.title ?? "Admissions",
    description:
      page?.summary ??
      "Admissions process, eligibility, fees, scholarships, frequently asked questions, and secure enquiries for Nepal Police School, Garuda.",
    seo: page?.seo,
  });
}

export default async function AdmissionsPage() {
  const [page, site] = await Promise.all([getCmsPage("admissions"), getSiteProfile()]);
  const paragraphs = page ? pageParagraphs(page) : [];
  return (
    <OverviewPage
      eyebrow="Admissions"
      title={page?.title ?? "Plan your application with confidence"}
      description={
        page?.summary ??
        "Use clear, current guidance to understand the process, prepare information, and contact the school through official channels."
      }
      image={page?.heroImageUrl ?? "/media/nps-hero-gate.png"}
      introEyebrow="Before you begin"
      introTitle="The active admissions notice is your primary reference."
      intro={
        paragraphs[0] ??
        "Availability, deadlines, eligibility, required documents, assessments, and fees can vary by intake. This website separates general guidance from time-sensitive notices so families can make informed decisions."
      }
      additionalCopy={paragraphs.slice(1)}
      featureImage="/media/nps-hero-gate.png"
      cardHeading="Admissions information"
      cards={[
        {
          title: "Process",
          description: "The usual stages from reviewing a notice to receiving official instructions.",
          href: "/admissions/process",
          meta: "Step by step",
        },
        {
          title: "Eligibility",
          description: "What to check for the relevant grade, programme, and intake.",
          href: "/admissions/eligibility",
          meta: "Requirements",
        },
        {
          title: "Fees and scholarships",
          description: "How to find and verify current cost and support information.",
          href: "/admissions/fees-scholarships",
          meta: "Financial information",
        },
        {
          title: "Frequently asked questions",
          description: "Practical answers about applications, visits, and official confirmation.",
          href: "/admissions/faq",
          meta: "Help",
        },
        {
          title: "Admission enquiry",
          description: "Send accurate preliminary information through the secure online form.",
          href: "/admissions/apply",
          meta: "Online form",
        },
        {
          title: "Official notices",
          description: "Check for the latest intake announcement, dates, and instructions.",
          href: "/notices",
          meta: "Current updates",
        },
      ].filter((card) => site.admissionsOpen || card.href !== "/admissions/apply")}
      principles={[
        {
          title: "No automatic admission",
          description: "An online enquiry records interest; it does not reserve or confirm a place.",
        },
        {
          title: "Use accurate details",
          description:
            "Legal names, contact information, and academic records should be complete and truthful.",
        },
        {
          title: "Protect sensitive data",
          description:
            "Send identity and financial documents only through channels explicitly approved by the school.",
        },
        {
          title: "Keep written records",
          description: "Retain notices, receipts, reference numbers, and official correspondence.",
        },
      ]}
      cta={
        site.admissionsOpen
          ? {
              title: "Ready to ask about admission?",
              description: "Review the active notice first, then use the online form for a focused enquiry.",
              label: "Start an enquiry",
              href: "/admissions/apply",
              secondaryLabel: "View notices",
              secondaryHref: "/notices",
            }
          : {
              title: "Admissions enquiries are currently closed",
              description: "Use the latest official notice for confirmed intake dates and requirements.",
              label: "View notices",
              href: "/notices",
              secondaryLabel: "Contact the school",
              secondaryHref: "/contact",
            }
      }
    />
  );
}
