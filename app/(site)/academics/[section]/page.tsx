import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getProgram } from "@/lib/data/public";

const consolidatedDestinations: Record<string, string> = {
  primary: "/academics#primary",
  secondary: "/academics#secondary",
  "plus-2": "/academics#plus-2",
  curriculum: "/academics#curriculum",
  library: "/facilities#library",
  sports: "/campus-life/activities",
};

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function AcademicSectionPage({ params }: PageProps<"/academics/[section]">) {
  const { section } = await params;
  const fixedDestination = consolidatedDestinations[section];
  if (fixedDestination) permanentRedirect(fixedDestination);

  const programme = await getProgram(section);
  if (!programme) notFound();
  permanentRedirect(`/academics#${programme.slug}`);
}
