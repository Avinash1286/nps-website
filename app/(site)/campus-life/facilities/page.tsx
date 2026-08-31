import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = { robots: { index: false, follow: true } };

/** Compatibility route for bookmarks; facilities now have one canonical public page. */
export default function LegacySchoolLifeFacilitiesPage() {
  permanentRedirect("/facilities");
}
