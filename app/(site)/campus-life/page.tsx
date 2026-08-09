import type { Metadata } from "next";
import { OverviewPage } from "@/components/content/overview-page";
export const metadata: Metadata = {
  title: "School life",
  description:
    "Explore facilities, activities, gallery, transport, and the digital tour of Nepal Police School, Garuda.",
};
export default function SchoolLifePage() {
  return (
    <OverviewPage
      eyebrow="School life"
      title="A fuller school experience"
      description="Learning spaces, student activities, shared responsibilities, and practical services all contribute to the school day."
      image="/media/sports-day.png"
      introEyebrow="Beyond lessons"
      introTitle="A school where learning, participation, and wellbeing meet."
      intro="School life information helps families understand facilities, activities, transport, events, and visitor arrangements. Confirmed schedules and participation details are published through notices and direct school communication."
      featureImage="/media/sports-day.png"
      cardHeading="Explore life at NPS Garuda"
      cards={[
        {
          title: "Facilities",
          description:
            "Spaces used for teaching, practical learning, reading, administration, and activities.",
          href: "/facilities",
          meta: "The school",
        },
        {
          title: "Activities",
          description: "Opportunities for teamwork, creativity, leadership, and service.",
          href: "/campus-life/activities",
          meta: "Student participation",
        },
        {
          title: "Gallery",
          description: "Approved photographs and albums from school life.",
          href: "/campus-life/gallery",
          meta: "School moments",
        },
        {
          title: "Virtual tour",
          description: "A digital introduction to key areas of the school.",
          href: "/campus-life/virtual-tour",
          meta: "Explore online",
        },
        {
          title: "Transport",
          description: "Route, safety, capacity, and communication guidance.",
          href: "/campus-life/transport",
          meta: "Student services",
        },
        {
          title: "Events",
          description: "Published school programmes, dates, and registration information.",
          href: "/events",
          meta: "Calendar",
        },
      ]}
      principles={[
        {
          title: "Safety first",
          description: "Facilities, equipment, movement, and visits are managed through school procedures.",
        },
        {
          title: "Inclusive participation",
          description:
            "Activities should offer meaningful, age-appropriate opportunities within available resources.",
        },
        {
          title: "Care for shared spaces",
          description: "Every member of the community helps keep the school orderly and welcoming.",
        },
        {
          title: "Clear communication",
          description:
            "Families should use current official channels for schedules, transport, and event details.",
        },
      ]}
      cta={{
        title: "Take a closer look at the school",
        description:
          "Start with the digital tour, then contact the school in advance if you need to plan an in-person visit.",
        label: "Open virtual tour",
        href: "/campus-life/virtual-tour",
        secondaryLabel: "Contact the school",
        secondaryHref: "/contact",
      }}
    />
  );
}
