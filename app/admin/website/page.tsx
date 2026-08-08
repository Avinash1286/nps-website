import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeading } from "@/components/admin/page-heading";
import { WebsiteEditor } from "@/components/admin/website-editor";

export default function AdminWebsitePage() {
  return (
    <>
      <PageHeading
        eyebrow="Guided website editing"
        title="Edit the public website"
        description="Find the page or feature visitors see, then open the correct editing workspace without needing to know the content system."
        action={
          <Link
            href="/"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 sm:w-auto"
          >
            View public website <ExternalLink size={15} aria-hidden="true" />
          </Link>
        }
      />
      <WebsiteEditor />
    </>
  );
}
