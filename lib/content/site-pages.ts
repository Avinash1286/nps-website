export type StandardPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  image?: string;
  sections: { title: string; body: string; points?: string[] }[];
  related?: { label: string; href: string }[];
};

export const aboutPages: Record<string, StandardPageContent> = {
  history: {
    eyebrow: "About the school",
    title: "Our story and institutional journey",
    description:
      "An official account of the school should be accurate, traceable, and maintained by the administration.",
    intro:
      "Nepal Police School, Garuda serves its community from Garuda, Rautahat. The verified institutional timeline is maintained through the school content system so that dates, milestones, and names are published only after administrative review.",
    image: "/media/nps-campus-building.png",
    sections: [
      {
        title: "A living record",
        body: "This page is designed to hold the school's approved history, including its establishment, important developments, and the people who helped shape it. Content managers can update the record without changing the website code.",
      },
      {
        title: "What guides publication",
        body: "Historical information is reviewed for accuracy and context before it appears here.",
        points: [
          "Official names and dates",
          "Major academic and campus milestones",
          "Archived photographs and source notes",
          "Corrections when better records become available",
        ],
      },
    ],
    related: [
      { label: "Mission and vision", href: "/about/mission-vision" },
      { label: "School leadership", href: "/about/leadership" },
    ],
  },
  "mission-vision": {
    eyebrow: "Purpose and values",
    title: "Learning with discipline, dignity, and purpose",
    description: "A clear educational direction helps students, families, and staff move forward together.",
    intro:
      "The school's public-facing purpose is to support meaningful learning, responsible conduct, personal growth, and service to the community. Final mission and vision statements remain under the authority of the school administration.",
    image: "/media/campus-hero.png",
    sections: [
      {
        title: "Our educational direction",
        body: "We aim to create a safe and purposeful environment in which learners can build knowledge, confidence, curiosity, and respect for others.",
      },
      {
        title: "Values in daily practice",
        body: "Values matter most when they shape everyday decisions.",
        points: [
          "Integrity in learning and conduct",
          "Respect for every member of the community",
          "Consistency, responsibility, and self-discipline",
          "Curiosity, collaboration, and service",
        ],
      },
      {
        title: "A shared commitment",
        body: "Students, families, educators, and school leaders each have a role in sustaining a healthy learning culture. The school website supports that commitment through clear, accessible information.",
      },
    ],
    related: [
      { label: "Read our story", href: "/about/history" },
      { label: "Meet the leadership team", href: "/about/leadership" },
    ],
  },
};

export const academicPages: Record<string, StandardPageContent> = {
  primary: {
    eyebrow: "Academic pathway",
    title: "Primary years",
    description: "A supportive foundation for confident, curious, and responsible learners.",
    intro:
      "The primary pathway is designed around strong foundations in language, numeracy, inquiry, wellbeing, and learning habits. Families should contact the admissions office for the currently offered grades and approved curriculum details.",
    image: "/media/science-lab.png",
    sections: [
      {
        title: "Learning approach",
        body: "Teachers combine clear instruction with discussion, practice, reading, creative work, and age-appropriate exploration.",
      },
      {
        title: "Priorities",
        body: "The programme gives careful attention to the skills children use across subjects.",
        points: [
          "Communication and literacy",
          "Mathematical understanding",
          "Curiosity and observation",
          "Healthy routines and respectful conduct",
        ],
      },
      {
        title: "Working with families",
        body: "Regular school communication helps families understand learning expectations, progress, and the support available to each child.",
      },
    ],
    related: [
      { label: "Admissions process", href: "/admissions/process" },
      { label: "Explore the curriculum", href: "/academics/curriculum" },
    ],
  },
  secondary: {
    eyebrow: "Academic pathway",
    title: "Secondary years",
    description: "Subject knowledge, independent study, and thoughtful preparation for what comes next.",
    intro:
      "The secondary pathway supports deeper subject learning, consistent assessment, responsible study habits, and informed decisions about future education. Current grade and subject offerings are confirmed during admissions.",
    image: "/media/campus-hero.png",
    sections: [
      {
        title: "Academic focus",
        body: "Learners work toward secure subject understanding while strengthening analysis, communication, practical application, and independent study.",
      },
      {
        title: "Student support",
        body: "Academic guidance is most effective when it is timely and specific.",
        points: [
          "Clear learning expectations",
          "Feedback and progress review",
          "Study planning and mentoring",
          "Family-school communication",
        ],
      },
      {
        title: "Assessment",
        body: "Assessment should help learners and teachers identify strengths, address gaps, and plan the next stage of learning. Official examination arrangements are communicated through notices.",
      },
    ],
    related: [
      { label: "View official notices", href: "/notices" },
      { label: "Meet our teachers", href: "/teachers" },
    ],
  },
  "plus-2": {
    eyebrow: "Academic pathway",
    title: "+2 programmes",
    description: "Focused higher-secondary study supported by guidance, structure, and clear expectations.",
    intro:
      "Programme availability, subject combinations, entry requirements, and seat information can change by academic cycle. This website publishes only options confirmed by the school administration.",
    image: "/media/nps-campus-building.png",
    sections: [
      {
        title: "Programme information",
        body: "Verified streams, subject choices, schedules, and admission criteria will appear here as they are approved for each intake.",
      },
      {
        title: "Preparing to apply",
        body: "Applicants should review the current notice and keep required documents ready.",
        points: [
          "Check the active admissions notice",
          "Review published eligibility criteria",
          "Prepare accurate student and guardian information",
          "Submit only through official school channels",
        ],
      },
      {
        title: "Academic guidance",
        body: "Students are encouraged to consider their interests, prior learning, and future plans when choosing a pathway. The school can explain its available options; it does not replace independent career advice.",
      },
    ],
    related: [
      { label: "Eligibility", href: "/admissions/eligibility" },
      { label: "Start an enquiry", href: "/admissions/apply" },
    ],
  },
  curriculum: {
    eyebrow: "Teaching and learning",
    title: "Curriculum and assessment",
    description: "A coherent learning programme, clear expectations, and feedback that supports progress.",
    intro:
      "The curriculum page gives families a practical overview of teaching, learning, and assessment. Official subjects, grade structures, calendars, and examination requirements are maintained by the academic office.",
    image: "/media/science-lab.png",
    sections: [
      {
        title: "Curriculum planning",
        body: "Teaching is organised around defined learning goals, appropriate content, regular practice, and opportunities to apply understanding.",
      },
      {
        title: "Assessment principles",
        body: "Assessment information should be useful to learners and families.",
        points: [
          "Aligned with stated learning goals",
          "A balance of classwork and formal review",
          "Specific feedback for improvement",
          "Clear communication of schedules and requirements",
        ],
      },
      {
        title: "Official documents",
        body: "Approved calendars, syllabi, examination routines, and related documents are published in the downloads and notices sections when available.",
      },
    ],
    related: [
      { label: "Downloads", href: "/downloads" },
      { label: "Departments", href: "/academics/departments" },
    ],
  },
  library: {
    eyebrow: "Learning resources",
    title: "Library and independent learning",
    description: "A calm place to read, research, ask questions, and build lasting study habits.",
    intro:
      "Library services support classroom learning and independent exploration. Current opening arrangements, borrowing rules, and available resources are confirmed by the school.",
    image: "/media/science-lab.png",
    sections: [
      {
        title: "Using the library well",
        body: "Students are encouraged to choose appropriate materials, care for shared resources, and make reading part of their regular learning routine.",
      },
      {
        title: "Responsible research",
        body: "Independent learning includes knowing how to locate, assess, and acknowledge information.",
        points: [
          "Ask focused questions",
          "Compare reliable sources",
          "Take clear notes",
          "Credit ideas and quotations appropriately",
        ],
      },
    ],
    related: [
      { label: "Curriculum", href: "/academics/curriculum" },
      { label: "Contact the school", href: "/contact" },
    ],
  },
  sports: {
    eyebrow: "Student development",
    title: "Sports and physical wellbeing",
    description: "Movement, teamwork, resilience, and fair play are valuable parts of school life.",
    intro:
      "Sports provision depends on the school calendar, facilities, staffing, and student age groups. Current activities and participation guidance are communicated by the school.",
    image: "/media/sports-day.png",
    sections: [
      {
        title: "Purposeful participation",
        body: "Physical activity can build confidence, coordination, teamwork, and healthy routines when it is safe, inclusive, and well supervised.",
      },
      {
        title: "Participation expectations",
        body: "Students should follow staff guidance and the published requirements for each activity.",
        points: [
          "Appropriate clothing and equipment",
          "Respect for teammates and opponents",
          "Attention to safety instructions",
          "Consistent attendance where selected",
        ],
      },
    ],
    related: [
      { label: "Student activities", href: "/campus-life/activities" },
      { label: "Upcoming events", href: "/events" },
    ],
  },
};

export const campusPages: Record<string, StandardPageContent> = {
  facilities: {
    eyebrow: "Campus life",
    title: "Facilities for learning and wellbeing",
    description: "Purposeful spaces help students learn, collaborate, move, and feel supported.",
    intro:
      "The campus includes spaces used for teaching, practical work, reading, administration, and student activities. Availability and access are managed by the school and may vary by programme or timetable.",
    image: "/media/nps-campus-building.png",
    sections: [
      {
        title: "Learning spaces",
        body: "Classrooms and specialist areas are organised to support appropriate teaching, supervision, and student participation.",
      },
      {
        title: "Using shared spaces",
        body: "A safe campus depends on consistent care and responsible use.",
        points: [
          "Follow staff instructions",
          "Keep learning areas orderly",
          "Use equipment only as authorised",
          "Report damage or safety concerns promptly",
        ],
      },
    ],
    related: [
      { label: "Virtual tour", href: "/campus-life/virtual-tour" },
      { label: "Contact the school", href: "/contact" },
    ],
  },
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
  gallery: {
    eyebrow: "School gallery",
    title: "Moments from our learning community",
    description: "Approved photographs and albums from school programmes, activities, and campus life.",
    intro:
      "Gallery content is published by authorised staff with attention to student privacy and appropriate consent. Albums appear when verified media is available in the content system.",
    image: "/media/campus-hero.png",
    sections: [
      {
        title: "Responsible publishing",
        body: "The school reviews images before publication and may remove or update media when required.",
      },
      {
        title: "Using school media",
        body: "Images on this website should not be reused in a misleading or harmful context. Contact the school before reproducing media for publication.",
      },
    ],
    related: [
      { label: "Privacy", href: "/privacy" },
      { label: "School events", href: "/events" },
    ],
  },
  "virtual-tour": {
    eyebrow: "Explore the campus",
    title: "A guided digital campus tour",
    description: "See key areas and understand how the campus supports the school day.",
    intro:
      "This digital tour uses approved school images to introduce the campus. It is an orientation resource, not a live representation of access, room allocation, or current construction.",
    image: "/media/nps-hero-gate.png",
    sections: [
      {
        title: "Start at the school entrance",
        body: "The main entrance establishes a clear arrival point for students, families, staff, and authorised visitors.",
      },
      {
        title: "Learning and activity areas",
        body: "Campus spaces support lessons, practical learning, administration, gatherings, and supervised student activities.",
      },
      {
        title: "Planning a visit",
        body: "For safeguarding and smooth operations, visitors should contact the school before arriving and follow reception procedures.",
      },
    ],
    related: [
      { label: "Facilities", href: "/campus-life/facilities" },
      { label: "Contact and directions", href: "/contact" },
    ],
  },
  transport: {
    eyebrow: "Student services",
    title: "School transport information",
    description: "Clear route, safety, and communication guidance for families using school transport.",
    intro:
      "Routes, stops, capacity, charges, and schedules may change. Families must obtain the current confirmed information directly from the school before relying on a transport arrangement.",
    image: "/media/nps-transport.png",
    sections: [
      {
        title: "Before using transport",
        body: "Confirm that the requested route is active, a seat is available, and the school has recorded the correct guardian contact details.",
      },
      {
        title: "Safety expectations",
        body: "Students and families share responsibility for a safe and reliable service.",
        points: [
          "Arrive at the confirmed stop on time",
          "Follow driver and attendant instructions",
          "Use the assigned stop unless the school approves a change",
          "Report concerns through the school office",
        ],
      },
    ],
    related: [
      { label: "Ask about transport", href: "/contact" },
      { label: "Admissions FAQ", href: "/admissions/faq" },
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
        title: "Can I visit the campus?",
        body: "Contact the school in advance. Visitors must follow the school's reception and safeguarding procedures.",
      },
    ],
    related: [
      { label: "Start an enquiry", href: "/admissions/apply" },
      { label: "Contact the school", href: "/contact" },
    ],
  },
};

export const departments: Record<string, StandardPageContent> = {
  languages: {
    eyebrow: "Academic department",
    title: "Languages",
    description:
      "Reading, writing, listening, speaking, and thoughtful engagement with language and literature.",
    intro:
      "Language learning supports communication across the curriculum. Current subjects, course levels, and staffing are maintained by the academic office.",
    sections: [
      {
        title: "Learning priorities",
        body: "Students develop accuracy, fluency, interpretation, vocabulary, and confidence through purposeful reading, writing, discussion, and presentation.",
      },
    ],
  },
  mathematics: {
    eyebrow: "Academic department",
    title: "Mathematics",
    description: "Reasoning, fluency, problem-solving, and the confident use of mathematical ideas.",
    intro:
      "Mathematics teaching develops understanding through explanation, practice, representation, and application. Current courses are confirmed by grade and programme.",
    sections: [
      {
        title: "Learning priorities",
        body: "Students are encouraged to explain their reasoning, choose suitable methods, check results, and apply mathematics in unfamiliar situations.",
      },
    ],
  },
  science: {
    eyebrow: "Academic department",
    title: "Science",
    description: "Careful observation, evidence, practical enquiry, and scientific explanation.",
    intro:
      "Science learning connects core ideas with safe practical work and critical thinking. Laboratory use follows school safety procedures and staff supervision.",
    image: "/media/science-lab.png",
    sections: [
      {
        title: "Learning priorities",
        body: "Students learn to ask testable questions, handle evidence carefully, communicate findings, and connect scientific ideas to the world around them.",
      },
    ],
  },
  "social-studies": {
    eyebrow: "Academic department",
    title: "Social studies",
    description: "People, places, institutions, evidence, and responsible participation in society.",
    intro:
      "Social studies supports informed citizenship through the careful study of communities, history, geography, culture, and public life.",
    sections: [
      {
        title: "Learning priorities",
        body: "Students consider multiple perspectives, use evidence, discuss respectfully, and connect classroom learning with local and wider contexts.",
      },
    ],
  },
  "computer-studies": {
    eyebrow: "Academic department",
    title: "Computer studies",
    description: "Practical digital skills, computational thinking, responsible use, and online safety.",
    intro:
      "Technology learning should help students create, solve problems, evaluate information, and use digital systems responsibly.",
    sections: [
      {
        title: "Learning priorities",
        body: "Students develop practical confidence while learning about privacy, security, respectful communication, source evaluation, and healthy technology habits.",
      },
    ],
  },
};
