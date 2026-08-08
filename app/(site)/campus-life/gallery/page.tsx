import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Images } from "lucide-react";
import PublicImage from "@/components/site/public-image";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { FeaturedBadge } from "@/components/site/featured-badge";
import { getGalleryAlbums } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "School gallery",
  description: "Approved photographs and albums from Nepal Police School, Garuda.",
};

export default async function GalleryPage() {
  const albums = await getGalleryAlbums();
  return (
    <>
      <PageHero
        eyebrow="School gallery"
        title="Moments from our learning community"
        description="Approved photographs and albums from school programmes, activities, and school life."
        image="/media/campus-hero.png"
        crumbs={[{ label: "School life", href: "/campus-life" }, { label: "Gallery" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {albums.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => (
                <Link
                  href={`/campus-life/gallery/${album.slug}`}
                  key={album.id}
                  className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(30,31,92,.1)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    {album.coverUrl ? (
                      <PublicImage
                        src={album.coverUrl}
                        alt=""
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-slate-300">
                        <Images size={36} />
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    {album.featured && <FeaturedBadge className="mb-3" />}
                    <h2 className="text-xl font-extrabold text-[#1e1f5c]">{album.title}</h2>
                    {album.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                        {album.description}
                      </p>
                    )}
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#2e3192]">
                      Open album <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No published albums yet"
              description="Approved school albums will appear here after authorised staff publish them through the content system."
            />
          )}
        </div>
      </section>
    </>
  );
}
