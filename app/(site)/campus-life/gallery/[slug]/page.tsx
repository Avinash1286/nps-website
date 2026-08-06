import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Images } from "lucide-react";
import { notFound } from "next/navigation";
import PublicImage from "@/components/site/public-image";
import { EmptyState } from "@/components/site/empty-state";
import { PageHero } from "@/components/site/page-hero";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getGalleryAlbum } from "@/lib/data/public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getGalleryAlbum(slug);
  return detail
    ? contentMetadata({
        title: detail.album.title,
        description: detail.album.description ?? `Approved media from ${detail.album.title}.`,
        seo: detail.album.seo,
      })
    : {};
}

export default async function GalleryAlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getGalleryAlbum(slug);
  if (!detail) notFound();
  const { album, items } = detail;
  return (
    <>
      <PageHero
        eyebrow="School gallery"
        title={album.title}
        description={album.description ?? "Approved photographs and media from the school community."}
        image={album.coverUrl ?? "/media/campus-hero.png"}
        crumbs={[
          { label: "Campus life", href: "/campus-life" },
          { label: "Gallery", href: "/campus-life/gallery" },
          { label: album.title },
        ]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {items.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <figure
                  key={item.id}
                  className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {item.mediaType === "video" ? (
                      <video
                        controls
                        preload="metadata"
                        poster={item.thumbnailUrl}
                        className="h-full w-full object-cover"
                        aria-label={item.alt}
                      >
                        <source src={item.url} />
                        Your browser does not support this video.
                      </video>
                    ) : (
                      <PublicImage
                        src={item.url}
                        alt={item.alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    )}
                  </div>
                  {(item.caption || item.credit) && (
                    <figcaption className="min-w-0 p-4 text-sm leading-6 text-slate-600">
                      {item.caption}
                      {item.credit && (
                        <span className="mt-1 block text-xs text-slate-500">Credit: {item.credit}</span>
                      )}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          ) : (
            <EmptyState
              title="This album has no published items"
              description="Approved photographs and media will appear here when they are available."
            />
          )}
          <Link
            href="/campus-life/gallery"
            className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]"
          >
            <ArrowLeft size={15} />
            Back to all albums
          </Link>
          <p className="mt-8 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
            <Images size={15} className="mt-0.5 shrink-0" />
            School media is published with administrative review. Contact the school before reproducing an
            image or video for publication.
          </p>
        </div>
      </section>
    </>
  );
}
