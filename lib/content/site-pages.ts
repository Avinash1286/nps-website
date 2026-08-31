export type StandardPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  image?: string;
  sections: { title: string; body: string; points?: string[] }[];
  related?: { label: string; href: string }[];
};

export const schoolLifePages: Record<string, StandardPageContent> = {
  activities: {
    eyebrow: "Beyond the classroom",
    title: "Activities, clubs, and student participation",
    description: "Opportunities to create, collaborate, serve, and discover new interests.",
    intro:
      "Activities are announced according to the school calendar and available supervision. Students and families should use current notices for confirmed schedules and participation requirements.",
    image: "/media/sports-day.png",
    sections: [
      {
        title: "A broader school experience",
        body: "Well-planned activities can help students practise leadership, teamwork, creativity, communication, and service.",
      },
      {
        title: "How opportunities are shared",
        body: "Confirmed programmes are published through official channels.",
        points: [
          "School notices",
          "Event pages",
          "Class or activity coordinators",
          "Direct communication with families when required",
        ],
      },
    ],
    related: [
      { label: "Events", href: "/events" },
      { label: "Photo gallery", href: "/campus-life/gallery" },
    ],
  },
};

export const admissionPages: Record<string, StandardPageContent> = {
  process: {
    eyebrow: "Admissions",
    title: "A clear admissions process",
    description:
      "Understand the usual stages, prepare accurate information, and follow the current official notice.",
    intro:
      "Admission dates, available grades, selection arrangements, and required documents can vary by intake. The active admissions notice always takes precedence over this general guide.",
    sections: [
      {
        title: "Typical stages",
        body: "The school confirms the exact sequence for each intake.",
        points: [
          "Review the current admissions notice",
          "Submit an enquiry or application as instructed",
          "Provide the required documents",
          "Attend any scheduled assessment or meeting",
          "Receive and follow the official decision instructions",
        ],
      },
      {
        title: "Accurate applications",
        body: "Use the student's legal name, current contact details, and truthful academic information. Incomplete or inconsistent submissions may require clarification.",
      },
    ],
    related: [
      { label: "Eligibility", href: "/admissions/eligibility" },
      { label: "Start an enquiry", href: "/admissions/apply" },
    ],
  },
  eligibility: {
    eyebrow: "Admissions",
    title: "Eligibility and required information",
    description: "Check the criteria published for the relevant grade, programme, and academic cycle.",
    intro:
      "Eligibility is determined by the school's current admissions policy and published intake notice. This page does not create an entitlement to admission or confirm a place.",
    sections: [
      {
        title: "What to check",
        body: "Requirements may differ by level and intake.",
        points: [
          "Eligible age or prior grade",
          "Previous academic records",
          "Identity and guardian documents",
          "Assessment or interview arrangements",
          "Deadlines and submission method",
        ],
      },
      {
        title: "Document verification",
        body: "The school may request original or certified records before final enrolment. Never send sensitive documents through unofficial contacts.",
      },
    ],
    related: [
      { label: "Admissions process", href: "/admissions/process" },
      { label: "Contact admissions", href: "/contact" },
    ],
  },
  "fees-scholarships": {
    eyebrow: "Admissions",
    title: "Fees, support, and scholarships",
    description: "Use only the current, officially issued fee schedule and award information.",
    intro:
      "Fees and financial support may change by academic cycle. Amounts are intentionally not reproduced in baseline website content; verified schedules and notices can be published by authorised staff.",
    sections: [
      {
        title: "Understanding costs",
        body: "Ask for a written schedule showing applicable charges, due dates, payment methods, and any conditions connected with refunds or withdrawals.",
      },
      {
        title: "Scholarship information",
        body: "Where support is available, the official notice should explain eligibility, evidence, deadlines, selection, and renewal conditions.",
      },
      {
        title: "Payment safety",
        body: "Use only payment channels confirmed by the school. Keep receipts and never share passwords or one-time codes.",
      },
    ],
    related: [
      { label: "Downloads", href: "/downloads" },
      { label: "Admissions enquiry", href: "/admissions/apply" },
    ],
  },
  faq: {
    eyebrow: "Admissions help",
    title: "Frequently asked questions",
    description: "Straightforward guidance for planning an application.",
    intro:
      "These answers explain the website and general process. Intake-specific notices and direct written communication from the school take precedence.",
    sections: [
      {
        title: "How do I know admissions are open?",
        body: "Check the notices page for an active, dated admissions notice. An enquiry form does not itself confirm that applications are open.",
      },
      {
        title: "Does submitting the online form reserve a place?",
        body: "No. It records an enquiry or preliminary application for school review. Admission is confirmed only through the school's authorised process.",
      },
      {
        title: "Where can I find current fees and documents?",
        body: "Use the downloads and notices sections, or request the current approved information from the school office.",
      },
      {
        title: "Can I visit the school?",
        body: "Contact the school in advance. Visitors must follow the school's reception and safeguarding procedures.",
      },
    ],
    related: [
      { label: "Start an enquiry", href: "/admissions/apply" },
      { label: "Contact the school", href: "/contact" },
    ],
  },
};
