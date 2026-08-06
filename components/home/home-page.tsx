import Image from "@/components/site/public-image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Download,
  GraduationCap,
  Images,
  MapPinned,
  Users,
} from "lucide-react";
import { ContentCard } from "@/components/site/content-card";
import { EmptyState } from "@/components/site/empty-state";
import { FeaturedBadge } from "@/components/site/featured-badge";
import {
  formatEventDateTimeRange,
  formatPublicDate,
  getEvents,
  getLeadership,
  getCmsPages,
  getNews,
  getNotices,
  getPrograms,
} from "@/lib/data/public";

const quickLinks = [
  {
    title: "Admissions",
    copy: "Process, eligibility, fees, and enquiries",
    href: "/admissions",
    icon: GraduationCap,
  },
  { title: "Notices", copy: "Official announcements and updates", href: "/notices", icon: Bell },
  {
    title: "Academic pathways",
    copy: "Primary, secondary, and +2 information",
    href: "/academics",
    icon: BookOpen,
  },
  { title: "Downloads", copy: "Approved forms and school documents", href: "/downloads", icon: Download },
] as const;

const baselinePathways = [
  {
    label: "Primary",
    title: "A strong learning foundation",
    copy: "Language, numeracy, inquiry, wellbeing, and positive learning habits.",
    href: "/academics/primary",
    number: "01",
  },
  {
    label: "Secondary",
    title: "Knowledge, guidance, and direction",
    copy: "Deeper subject learning, independent study, and clear progress support.",
    href: "/academics/secondary",
    number: "02",
  },
  {
    label: "+2",
    title: "Focused higher-secondary pathways",
    copy: "Verified programme and subject information for the current intake.",
    href: "/academics/plus-2",
    number: "03",
  },
] as const;

export async function HomePage() {
  const [featuredNews, latestNews, notices, events, leaders, configuredPrograms, featuredPages] =
    await Promise.all([
      getNews(3, true),
      getNews(6),
      getNotices(4),
      getEvents("upcoming", 3),
      getLeadership(),
      getPrograms(),
      getCmsPages({ featured: true }),
    ]);
  const news = [
    ...featuredNews,
    ...latestNews.filter((item) => !featuredNews.some((featured) => featured.id === item.id)),
  ].slice(0, 3);
  const pathways = configuredPrograms.length
    ? configuredPrograms.slice(0, 3).map((program, index) => ({
        label: program.featured ? "Featured programme" : (program.gradeRange ?? "Programme"),
        title: program.name,
        copy: program.shortDescription,
        href: `/academics/${program.slug}`,
        number: String(index + 1).padStart(2, "0"),
      }))
    : baselinePathways;
  const featuredNotice = notices[0];

  return (
    <>
      {featuredNotice && (
        <div className="border-b border-sky-200 bg-sky-50 px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="flex min-w-0 items-center gap-2 font-semibold text-[#173f61]">
              <Bell size={16} className="shrink-0 text-[#0a65a8]" />
              <span className="line-clamp-2 min-w-0 sm:line-clamp-1">
                <strong className="mr-2 text-[#075b99]">Latest notice</strong>
                {featuredNotice.title}
              </span>
            </p>
            <Link
              href={`/notices/${featuredNotice.slug}`}
              className="max-w-full shrink-0 font-bold text-[#075b99]"
            >
              View notice →
            </Link>
          </div>
        </div>
      )}

      <section className="relative isolate min-h-[690px] overflow-hidden bg-[#082946] text-white sm:min-h-[720px]">
        <Image
          src="/media/nps-hero-gate.png"
          alt="Entrance to Nepal Police School, Garuda"
          fill
          priority
          className="-z-30 object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(3,23,44,.96)_0%,rgba(4,31,56,.87)_47%,rgba(4,32,57,.4)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-52 bg-gradient-to-t from-[#061d38]/75 to-transparent" />
        <div className="mx-auto flex min-h-[690px] max-w-7xl items-center px-4 py-20 sm:min-h-[720px] sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-[2.5rem] leading-[1.02] font-extrabold tracking-[-.045em] sm:text-6xl lg:text-7xl">
              Learning with purpose.
              <br />
              <span className="text-sky-300">Growing with character.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Welcome to Nepal Police School, Garuda. Explore academic pathways, school life, official
              updates, and practical information for students and families.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/admissions"
                className="inline-flex max-w-full items-center gap-2 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-black/10 transition hover:bg-sky-400"
              >
                Explore admissions <ArrowRight size={17} className="shrink-0" />
              </Link>
              <Link
                href="/campus-life/virtual-tour"
                className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3.5 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15"
              >
                <MapPinned size={17} className="shrink-0" />
                Tour the campus
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 hidden border-t border-white/15 bg-[#061d38]/75 backdrop-blur-md md:block">
          <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-white/15 px-4 sm:px-6 lg:px-8">
            {[
              ["Academic pathways", "Primary · Secondary · +2"],
              ["School information", "Notices · Events · Downloads"],
              ["Family support", "Admissions · Transport · Contact"],
            ].map(([label, value]) => (
              <div key={label} className="px-6 py-5 first:pl-0">
                <p className="text-[10px] font-bold tracking-[.16em] text-sky-300 uppercase">{label}</p>
                <p className="mt-1.5 text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Quick links" className="relative z-10 -mt-1 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-b-3xl border-x border-b border-slate-200 bg-slate-200 shadow-[0_18px_55px_rgba(18,54,87,.08)] sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(({ title, copy, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-36 items-start gap-4 bg-white p-6 transition hover:bg-sky-50"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-[#0a65a8] transition group-hover:bg-[#0a65a8] group-hover:text-white">
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <strong className="block text-base text-[#092f59]">{title}</strong>
                <span className="mt-2 block text-sm leading-6 text-slate-600">{copy}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {featuredPages.length > 0 && (
        <section
          aria-labelledby="featured-information-heading"
          className="px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-extrabold tracking-[.2em] text-[#0a65a8] uppercase">
                  Featured information
                </p>
                <h2
                  id="featured-information-heading"
                  className="mt-3 text-3xl font-extrabold tracking-[-.03em] text-[#092f59]"
                >
                  Useful pages selected by the school
                </h2>
              </div>
              <Link href="/search" className="text-sm font-extrabold text-[#0a65a8]">
                Find more information →
              </Link>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {featuredPages.slice(0, 3).map((page) => (
                <Link
                  key={page.id}
                  href={`/${page.slug}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_40px_rgba(16,53,84,.08)]"
                >
                  <FeaturedBadge />
                  <h3 className="mt-4 text-xl font-extrabold text-[#092f59]">{page.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">
                    {page.summary ?? page.body}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]">
                    Open page <ArrowRight size={15} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
          <div className="relative min-h-[460px] overflow-hidden rounded-3xl bg-slate-100 sm:min-h-[560px]">
            <Image
              src="/media/nps-campus-building.png"
              alt="Nepal Police School campus building"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 48vw"
            />
          </div>
          <div className="lg:pl-10">
            <p className="text-xs font-extrabold tracking-[.2em] text-[#0a65a8] uppercase">
              About NPS Garuda
            </p>
            <h2 className="mt-4 text-4xl leading-tight font-extrabold tracking-[-.035em] text-[#092f59] sm:text-5xl">
              A clear, caring, and purposeful learning environment.
            </h2>
            <p className="mt-6 text-base leading-8 text-slate-600">
              The school website brings together academic guidance, admissions information, staff profiles,
              notices, events, and practical resources. Verified information is maintained by authorised staff
              through the school content system.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["Discipline", "Consistent habits and responsible conduct."],
                ["Dignity", "Respect for every member of the community."],
                ["Learning", "Knowledge, curiosity, and thoughtful practice."],
                ["Service", "Contributing with care and integrity."],
              ].map(([title, copy]) => (
                <div key={title} className="border-l-2 border-sky-500 pl-4">
                  <h3 className="font-extrabold text-[#173f61]">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{copy}</p>
                </div>
              ))}
            </div>
            <Link
              href="/about"
              className="mt-9 inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]"
            >
              Discover our school <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f0f6fa] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold tracking-[.2em] text-[#0a65a8] uppercase">
              Academic pathways
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.035em] text-[#092f59] sm:text-4xl">
              Progress with confidence at every stage.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Explore the learning pathway that applies to your family. Current grade, programme, and subject
              availability is confirmed during admissions.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {pathways.map((pathway) => (
              <Link
                href={pathway.href}
                key={pathway.href}
                className="group rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_18px_45px_rgba(15,54,85,.09)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold tracking-[.17em] text-[#0a65a8] uppercase">
                    {pathway.label}
                  </span>
                  <span className="text-3xl font-extrabold text-slate-100 transition group-hover:text-sky-100">
                    {pathway.number}
                  </span>
                </div>
                <h3 className="mt-6 text-2xl font-extrabold tracking-[-.025em] text-[#092f59]">
                  {pathway.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{pathway.copy}</p>
                <span className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]">
                  Explore pathway <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold tracking-[.2em] text-[#0a65a8] uppercase">
                Latest information
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-.035em] text-[#092f59] sm:text-4xl">
                News from the school
              </h2>
            </div>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]"
            >
              View all news <ArrowRight size={16} />
            </Link>
          </div>
          {news.length ? (
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {news.map((item) => (
                <ContentCard key={item.id} item={item} basePath="/news" />
              ))}
            </div>
          ) : (
            <div className="mt-9">
              <EmptyState
                title="No published news yet"
                description="Verified news stories will appear here after they are published by authorised school staff."
                actionLabel="View official notices"
                actionHref="/notices"
              />
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#082946] px-4 py-20 text-white sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_.85fr]">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold tracking-[.2em] text-sky-300 uppercase">
                  Official notices
                </p>
                <h2 className="mt-4 text-3xl font-extrabold tracking-[-.03em]">Important information</h2>
              </div>
              <Link href="/notices" className="hidden text-sm font-bold text-sky-300 sm:inline">
                All notices →
              </Link>
            </div>
            <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {notices.length ? (
                notices.slice(0, 4).map((notice) => (
                  <Link
                    key={notice.id}
                    href={`/notices/${notice.slug}`}
                    className="group grid min-w-0 gap-3 py-5 sm:grid-cols-[130px_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="text-xs font-semibold text-slate-400">
                      {formatPublicDate(notice.publishedAt)}
                    </span>
                    <span className="leading-6 font-bold text-white group-hover:text-sky-300">
                      {notice.title}
                    </span>
                    <ArrowRight size={16} className="hidden shrink-0 text-sky-300 sm:block" />
                  </Link>
                ))
              ) : (
                <p className="py-8 text-sm leading-6 text-slate-300">
                  No notices have been published in the content system. Check again later or contact the
                  school for time-sensitive information.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-7 text-[#092f59] sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-50 text-[#0a65a8]">
                <CalendarDays size={21} />
              </span>
              <div>
                <p className="text-xs font-extrabold tracking-[.14em] text-[#0a65a8] uppercase">Calendar</p>
                <h2 className="mt-1 text-xl font-extrabold">Upcoming events</h2>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {events.length ? (
                events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="block rounded-xl border border-slate-200 p-4 transition hover:border-sky-200 hover:bg-sky-50"
                  >
                    {event.featured && <FeaturedBadge className="mb-2" />}
                    <p className="text-xs leading-5 font-bold text-[#0a65a8]">
                      {formatEventDateTimeRange(event.startsAt, event.endsAt, event.timezone)}
                    </p>
                    <p className="mt-2 leading-6 font-extrabold">{event.title}</p>
                    {event.venue && <p className="mt-1 text-xs text-slate-500">{event.venue}</p>}
                  </Link>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  No upcoming events are published at the moment.
                </p>
              )}
            </div>
            <Link
              href="/events"
              className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]"
            >
              Full event calendar <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold tracking-[.2em] text-[#0a65a8] uppercase">Leadership</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.035em] text-[#092f59] sm:text-4xl">
              Guidance for a focused school community.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Leadership profiles and messages are published and maintained by the school administration. Use
              the directory to find the latest verified information.
            </p>
            <Link
              href="/about/leadership"
              className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[#0a65a8]"
            >
              Meet school leadership <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {leaders.slice(0, 3).map((leader) => (
              <Link
                href={`/about/leadership/${leader.slug}`}
                key={leader.id}
                className="group min-w-0 overflow-hidden rounded-2xl bg-slate-100"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={leader.photoUrl ?? "/media/principal-placeholder.png"}
                    alt={leader.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, 25vw"
                  />
                </div>
                <div className="bg-white p-4">
                  <h3 className="leading-5 font-extrabold text-[#092f59]">{leader.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{leader.designation}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#0a65a8] text-white">
          <div className="grid lg:grid-cols-[1fr_.45fr]">
            <div className="p-8 sm:p-12">
              <p className="text-xs font-extrabold tracking-[.2em] text-sky-200 uppercase">
                Plan the next step
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-[-.035em] sm:text-4xl">
                Get clear information before you apply.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-100">
                Review the current process and eligibility guidance, then send a secure enquiry to the
                admissions team.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/admissions/apply"
                  className="inline-flex max-w-full items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#075b99]"
                >
                  Start an enquiry <ArrowRight size={16} className="shrink-0" />
                </Link>
                <Link
                  href="/admissions/faq"
                  className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-extrabold"
                >
                  Admissions FAQ
                </Link>
              </div>
            </div>
            <div className="relative hidden min-h-72 lg:block">
              <Image
                src="/media/nps-staff-group.jpg"
                alt="Nepal Police School community"
                fill
                className="object-cover"
                sizes="35vw"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
