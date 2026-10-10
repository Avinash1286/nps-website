import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AboutSection } from "@/components/home/about-section";
import { AlumniSection } from "@/components/home/alumni-section";
import { EcaActivities } from "@/components/home/eca-activities";
import { GalleryPreview } from "@/components/home/gallery-preview";
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { ManagementMessage } from "@/components/home/management-message";
import { NewsEvents } from "@/components/home/news-events";
import { schoolSearchName, schoolSearchShortName } from "@/lib/content/school-search";
import {
  getEvents,
  getGalleryAlbums,
  getHomeHighlights,
  getHomeSections,
  getLeadership,
  getNews,
  getNotices,
  getSiteProfile,
  getTestimonials,
} from "@/lib/data/public";

export async function HomePage() {
  const [
    site,
    sections,
    heroCards,
    aboutPillars,
    ecaCards,
    featuredNews,
    latestNews,
    notices,
    events,
    leaders,
    testimonials,
    albums,
  ] = await Promise.all([
    getSiteProfile(),
    getHomeSections(),
    getHomeHighlights("hero"),
    getHomeHighlights("about"),
    getHomeHighlights("eca"),
    getNews(3, true),
    getNews(6),
    getNotices(3),
    getEvents("upcoming", 3),
    getLeadership(),
    getTestimonials(8),
    getGalleryAlbums(),
  ]);

  const news = [
    ...featuredNews,
    ...latestNews.filter((item) => !featuredNews.some((featured) => featured.id === item.id)),
  ].slice(0, 3);

  const publishedSlides = heroCards.flatMap<HeroSlide>((card) =>
    card.imageUrl
      ? [{ src: card.imageUrl, alt: card.imageAlt ?? card.title, caption: card.summary ?? card.title }]
      : [],
  );
  const hero = sections.hero;

  return (
    <>
      <HeroCarousel slides={publishedSlides}>
        <div className="max-w-3xl">
          <p className="anim-fade-up flex items-center gap-3 text-[11px] font-extrabold tracking-[.26em] text-[#f0bd3a] uppercase">
            <span aria-hidden="true" className="h-px w-9 bg-[#f0bd3a]" />
            {hero?.eyebrow ?? site.location}
          </p>
          <h1
            className="anim-fade-up mt-6 text-[2.6rem] leading-[1.02] font-extrabold tracking-[-.045em] sm:text-6xl lg:text-[4.4rem]"
            style={{ animationDelay: "120ms" }}
          >
            {hero?.heading ?? site.schoolName}
          </h1>
          <p
            className="anim-fade-up mt-5 text-base font-semibold text-sky-200 sm:text-lg"
            style={{ animationDelay: "180ms" }}
          >
            {schoolSearchName} ({schoolSearchShortName}) · Garuda, Rautahat, Nepal
          </p>
          <p
            className="anim-fade-up mt-7 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg"
            style={{ animationDelay: "240ms" }}
          >
            {hero?.body ?? site.description}
          </p>
          {hero?.ctaLabel && hero.ctaHref && (
            <div className="anim-fade-up mt-9 flex flex-wrap gap-3" style={{ animationDelay: "340ms" }}>
              <Link
                href={hero.ctaHref}
                className="group inline-flex max-w-full items-center gap-2 rounded-xl bg-[#2e3192] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-black/20 transition hover:bg-[#3a3fa5]"
              >
                {hero.ctaLabel}
                <ArrowRight
                  size={17}
                  className="shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </div>
          )}
        </div>
      </HeroCarousel>

      <div className="home-deferred-section">
        <AboutSection site={site} section={sections.about} pillars={aboutPillars} />
      </div>
      <div className="home-deferred-section">
        <ManagementMessage leaders={leaders} section={sections.management} />
      </div>
      <div className="home-deferred-section">
        <NewsEvents news={news} events={events} notices={notices} section={sections.news} />
      </div>
      <div className="home-deferred-section">
        <EcaActivities section={sections.eca} cards={ecaCards} />
      </div>
      <div className="home-deferred-section">
        <GalleryPreview albums={albums} section={sections.gallery} />
      </div>
      <div className="home-deferred-section">
        <AlumniSection testimonials={testimonials} section={sections.alumni} />
      </div>
    </>
  );
}
