import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/content/policy-page";
export const metadata: Metadata = {
  title: "Accessibility",
  description: "Accessibility approach and support for the Nepal Police School, Garuda website.",
  alternates: { canonical: "/accessibility" },
};
export default function AccessibilityPage() {
  return (
    <PolicyPage
      eyebrow="Website accessibility"
      title="Access for every visitor"
      description="Our approach to readable, navigable, and usable school information."
      updated="6 August 2026"
      sections={[
        {
          title: "Our approach",
          body: (
            <p>
              The website is designed with semantic headings, keyboard-accessible navigation, visible focus
              states, descriptive links, form labels, status messages, responsive layouts, and sufficient
              colour contrast.
            </p>
          ),
        },
        {
          title: "Using the website",
          body: (
            <ul>
              <li>Use the “Skip to main content” link at the start of each page</li>
              <li>Navigate menus, links, and forms with a keyboard</li>
              <li>Zoom text and layouts using browser controls</li>
              <li>Use page headings and landmarks with assistive technology</li>
            </ul>
          ),
        },
        {
          title: "Documents and media",
          body: (
            <p>
              Some historic files or third-party documents may not yet meet the same accessibility standard.
              Contact the school if you need information in another practical format.
            </p>
          ),
        },
        {
          title: "Tell us about a barrier",
          body: (
            <>
              <p>
                If something is difficult to access, send the page address, describe what you were trying to
                do, and mention the browser or assistive technology if comfortable doing so.
              </p>
              <p>
                Use the <Link href="/contact">contact form</Link> and choose “Website support”.
              </p>
            </>
          ),
        },
        {
          title: "Ongoing improvement",
          body: (
            <p>
              Accessibility is reviewed as content and features change. Confirmed issues are prioritised
              according to impact and the availability of an effective correction.
            </p>
          ),
        },
      ]}
    />
  );
}
