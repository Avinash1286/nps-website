import type { Metadata } from "next";
import { FacilitiesPage } from "@/components/site/facilities-page";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getCmsPage, getFacilities } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("facilities");
  return contentMetadata({
    title: page?.title ?? "Our facilities",
    description:
      page?.summary ??
      "Explore school-confirmed learning, residential, wellbeing, and activity facilities at Nepal Police School, Garuda.",
    seo: page?.seo,
  });
}

export default async function PublicFacilitiesPage() {
  const [page, facilities] = await Promise.all([getCmsPage("facilities"), getFacilities()]);
  return <FacilitiesPage page={page} facilities={facilities} />;
}
