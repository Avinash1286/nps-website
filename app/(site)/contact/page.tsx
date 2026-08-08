import type { Metadata } from "next";
import { contentMetadata } from "@/lib/content/public-metadata";
import Link from "next/link";
import { Clock3, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { PageHero } from "@/components/site/page-hero";
import { pageParagraphs } from "@/lib/content/cms-page";
import { getCmsPage, getSiteProfile } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsPage("contact");
  return contentMetadata({
    title: page?.title ?? "Contact",
    description:
      page?.summary ??
      "Contact Nepal Police School, Garuda through verified school channels or the secure website enquiry form.",
    seo: page?.seo,
  });
}

export default async function ContactPage() {
  const [site, page] = await Promise.all([getSiteProfile(), getCmsPage("contact")]);
  const paragraphs = page ? pageParagraphs(page) : [];
  return (
    <>
      <PageHero
        eyebrow="Contact the school"
        title={page?.title ?? "How can we help?"}
        description={
          page?.summary ??
          "Use verified contact details or send a secure message to the appropriate school team."
        }
        image={page?.heroImageUrl}
        crumbs={[{ label: "Contact" }]}
      />
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <aside className="min-w-0">
            <p className="text-xs font-extrabold tracking-[.18em] text-[#2e3192] uppercase">
              School information
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-.03em] text-[#1e1f5c]">
              Choose an official channel.
            </h2>
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-sm leading-7 text-slate-600">
                {paragraph}
              </p>
            ))}
            <div className="mt-7 space-y-3">
              {site.mapUrl ? (
                <a
                  href={site.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex gap-4 rounded-2xl border border-slate-200 p-5 transition hover:border-sky-300 hover:bg-sky-50/50"
                >
                  <MapPin className="mt-0.5 shrink-0 text-[#2e3192]" />
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-[#2f3169]">School location</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{site.location}</p>
                    <p className="mt-2 text-xs font-bold text-[#2e3192]">Open verified map</p>
                  </div>
                </a>
              ) : (
                <div className="flex gap-4 rounded-2xl border border-slate-200 p-5">
                  <MapPin className="mt-0.5 shrink-0 text-[#2e3192]" />
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-[#2f3169]">School location</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{site.location}</p>
                  </div>
                </div>
              )}
              {site.phone && (
                <a
                  href={`tel:${site.phone.replace(/\s/g, "")}`}
                  className="flex gap-4 rounded-2xl border border-slate-200 p-5"
                >
                  <Phone className="mt-0.5 shrink-0 text-[#2e3192]" />
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-[#2f3169]">Telephone</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{site.phone}</p>
                  </div>
                </a>
              )}
              {site.secondaryPhone && (
                <a
                  href={`tel:${site.secondaryPhone.replace(/\s/g, "")}`}
                  className="flex gap-4 rounded-2xl border border-slate-200 p-5"
                >
                  <Phone className="mt-0.5 shrink-0 text-[#2e3192]" />
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-[#2f3169]">Secondary telephone</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{site.secondaryPhone}</p>
                  </div>
                </a>
              )}
              {site.email && (
                <a
                  href={`mailto:${site.email}`}
                  className="flex gap-4 rounded-2xl border border-slate-200 p-5"
                >
                  <Mail className="mt-0.5 shrink-0 text-[#2e3192]" />
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-[#2f3169]">Email</h3>
                    <p className="mt-1 text-sm leading-6 break-all text-slate-600">{site.email}</p>
                  </div>
                </a>
              )}
              {site.officeHours && (
                <div className="flex gap-4 rounded-2xl border border-slate-200 p-5">
                  <Clock3 className="mt-0.5 shrink-0 text-[#2e3192]" />
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-[#2f3169]">Office hours</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{site.officeHours}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-3 rounded-2xl bg-sky-50 p-5 text-sm leading-6 text-[#262873]">
              <ShieldCheck size={19} className="mt-0.5 shrink-0" />
              <p>
                Contact details appear only when configured by the school. Do not trust unofficial numbers or
                payment instructions. Read our{" "}
                <Link href="/privacy" className="font-bold underline">
                  privacy notice
                </Link>
                .
              </p>
            </div>
          </aside>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
