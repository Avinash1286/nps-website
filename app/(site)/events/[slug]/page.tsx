import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventRegistrationForm } from "@/components/forms/event-registration-form";
import { FormUnavailable } from "@/components/forms/form-unavailable";
import { hasPublicFormConfiguration } from "@/lib/server/form-configuration";
import { DetailPage } from "@/components/site/detail-page";
import { contentMetadata } from "@/lib/content/public-metadata";
import { getEvent } from "@/lib/data/public";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getEvent(slug);
  return item
    ? contentMetadata({
        title: item.title,
        description: item.summary,
        seo: item.seo,
        path: `/events/${slug}`,
      })
    : {};
}
export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getEvent(slug);
  if (!item) notFound();
  return (
    <DetailPage item={item} type="Event">
      {item.registrationOpen &&
        (hasPublicFormConfiguration() ? (
          <EventRegistrationForm eventSlug={item.slug} eventTitle={item.title} />
        ) : (
          <FormUnavailable
            title="Contact the school to register"
            description="Online event registration is temporarily unavailable. Contact the school to confirm availability and registration arrangements."
          />
        ))}
    </DetailPage>
  );
}
