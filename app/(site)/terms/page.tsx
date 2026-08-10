import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/content/policy-page";
export const metadata: Metadata = {
  title: "Website terms",
  description: "Terms for using the Nepal Police School, Garuda website.",
};
export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Website policy"
      title="Terms of use"
      description="Conditions that apply when accessing school information, forms, downloads, and interactive services."
      updated="9 August 2026"
      sections={[
        {
          title: "General information",
          body: (
            <p>
              The website provides public school information and online enquiry tools. Content may be updated
              without notice. Time-sensitive admissions, fees, schedules, events, and examination information
              should be confirmed against the latest official notice.
            </p>
          ),
        },
        {
          title: "No automatic decision or entitlement",
          body: (
            <p>
              Submitting an admissions or event form does not reserve a place, guarantee eligibility, confirm
              registration, or create a contract. Official decisions are communicated through authorised
              school processes.
            </p>
          ),
        },
        {
          title: "Acceptable use",
          body: (
            <ul>
              <li>Provide accurate information and use forms only for legitimate purposes</li>
              <li>Do not attempt to disrupt, probe, automate abuse, or gain unauthorised access</li>
              <li>Do not impersonate another person or submit harmful or unlawful content</li>
              <li>Do not upload or share credentials, payment codes, or unnecessary sensitive records</li>
            </ul>
          ),
        },
        {
          title: "Student accounts and articles",
          body: (
            <>
              <p>
                Student accounts are personal. Keep login details confidential and notify the school if an
                account may have been misused. Do not include private student records, contact details, or
                third-party material without permission in an article.
              </p>
              <p>
                Submitting an article sends it for administrative review; it does not guarantee publication.
                The school may request changes, reject, archive, or remove a contribution. Published articles
                remain student contributions and are identified as reviewed rather than official school
                policy.
              </p>
            </>
          ),
        },
        {
          title: "Downloads and external links",
          body: (
            <p>
              Documents are provided for their stated purpose. Check publication dates and later notices
              before relying on them. External services may have separate terms and privacy practices.
            </p>
          ),
        },
        {
          title: "AI assistant",
          body: (
            <p>
              Assistant responses are generated and may be incomplete or incorrect. They are for navigation
              and general guidance only, not official decisions, professional advice, or emergency support.
              Verify important information through the relevant page or school office.
            </p>
          ),
        },
        {
          title: "Contact",
          body: (
            <p>
              Report a broken link, incorrect page, or website concern through the{" "}
              <Link href="/contact">contact page</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
