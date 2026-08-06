import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/content/policy-page";
export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How the Nepal Police School, Garuda website handles personal information.",
};
export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Website policy"
      title="Privacy notice"
      description="How information is collected, used, protected, and managed when you use this website."
      updated="6 August 2026"
      sections={[
        {
          title: "Information we collect",
          body: (
            <>
              <p>
                We collect information you choose to provide through contact, admissions, newsletter, and
                event forms. This may include names, contact details, student information, enquiry content,
                and consent records.
              </p>
              <p>
                Basic technical and security information may be processed to operate the website, prevent
                abuse, and diagnose errors.
              </p>
            </>
          ),
        },
        {
          title: "How we use information",
          body: (
            <ul>
              <li>Respond to school and admissions enquiries</li>
              <li>Manage event interest and newsletter subscriptions</li>
              <li>Protect forms and systems from spam or misuse</li>
              <li>Maintain records required for school administration</li>
            </ul>
          ),
        },
        {
          title: "Service providers",
          body: (
            <>
              <p>
                The website uses configured infrastructure providers, including Convex for application data
                and background processing. These providers process information under their own security and
                privacy controls.
              </p>
              <p>
                If you use the AI assistant, your message and the minimum relevant website context may be sent
                to Google&apos;s Gemini service to produce a response. Do not enter sensitive, confidential,
                financial, health, or identity information into the assistant.
              </p>
            </>
          ),
        },
        {
          title: "Retention and security",
          body: (
            <p>
              Information is retained only as long as reasonably needed for the stated purpose, legal
              obligations, security, or school administration. Access is restricted according to staff roles,
              but no online service can guarantee absolute security.
            </p>
          ),
        },
        {
          title: "Your choices",
          body: (
            <>
              <p>
                You may ask the school to correct or review personal information, subject to applicable
                requirements and identity verification. Newsletter messages include an unsubscribe option.
              </p>
              <p>
                For a privacy request, use the <Link href="/contact">official contact form</Link> and select
                the most relevant topic.
              </p>
            </>
          ),
        },
        {
          title: "Children and guardians",
          body: (
            <p>
              A parent or authorised guardian should submit admissions information for a child where required.
              The website does not ask children to send sensitive documents through public forms.
            </p>
          ),
        },
      ]}
    />
  );
}
