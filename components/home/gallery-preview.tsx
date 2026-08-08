import PublicImage from "@/components/site/public-image";
import Link from "next/link";
import { Images } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import type { GalleryAlbum, HomeSection } from "@/lib/data/public";

type Tile = {
  key: string;
  title: string;
  meta?: string;
  href: string;
  imageUrl: string;
};

// A(2x2) + four 1x1 tiles fill a 4-column grid exactly, at every breakpoint.
const spans = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
] as const;

export function GalleryPreview({
  albums,
  section,
}: {
  albums: readonly GalleryAlbum[];
  section?: HomeSection;
}) {
  const published = albums
    .filter((album) => album.coverUrl)
    .slice(0, 5)
    .map<Tile>((album) => ({
      key: album.id,
      title: album.title,
      meta: album.itemCount ? `${album.itemCount} photos` : undefined,
      href: `/campus-life/gallery/${album.slug}`,
      imageUrl: album.coverUrl as string,
    }));
  if (!section || !published.length) return null;
  const tiles = published;

  return (
    <section aria-labelledby="gallery-heading" className="bg-[#f4f5fd] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={section.eyebrow}
          title={section.heading}
          headingId="gallery-heading"
          description={section.body}
          action={
            section.ctaLabel && section.ctaHref
              ? { label: section.ctaLabel, href: section.ctaHref }
              : undefined
          }
        />

        <div className="mt-14 grid auto-rows-[150px] grid-cols-4 gap-3 sm:auto-rows-[190px] sm:gap-4 lg:auto-rows-[215px]">
          {tiles.map((tile, index) => (
            <Reveal
              key={tile.key}
              variant="scale"
              delay={index * 90}
              className={`${spans[index] ?? spans[1]} min-w-0`}
            >
              <Link
                href={tile.href}
                className="media-zoom group relative block h-full w-full overflow-hidden rounded-2xl bg-slate-200"
              >
                <PublicImage
                  src={tile.imageUrl}
                  alt={tile.title}
                  fill
                  sizes={index === 0 ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
                  className="object-cover"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-[#12123a]/85 via-[#12123a]/15 to-transparent opacity-80 transition duration-500 group-hover:opacity-100" />
                <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <span className="flex items-center gap-2 text-xs font-extrabold text-white sm:text-sm">
                    <Images size={15} className="shrink-0 text-[#f0bd3a]" />
                    <span className="line-clamp-2">{tile.title}</span>
                  </span>
                  {tile.meta && (
                    <span className="mt-1 block text-[11px] font-semibold text-slate-300">{tile.meta}</span>
                  )}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
