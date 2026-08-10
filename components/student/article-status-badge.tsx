import type { StudentArticleStatus } from "./types";

const presentations: Record<StudentArticleStatus, { label: string; description: string; classes: string }> = {
  draft: {
    label: "Draft",
    description: "Only you can see this draft.",
    classes: "border-slate-200 bg-slate-100 text-slate-700",
  },
  submitted: {
    label: "Awaiting review",
    description: "School staff are reviewing this article.",
    classes: "border-amber-200 bg-amber-50 text-amber-800",
  },
  published: {
    label: "Published",
    description: "This article is visible on the school website.",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  rejected: {
    label: "Revision requested",
    description: "Review the staff feedback, update the draft, and submit it again.",
    classes: "border-orange-200 bg-orange-50 text-orange-800",
  },
  archived: {
    label: "Archived",
    description: "This article is no longer displayed publicly.",
    classes: "border-slate-300 bg-slate-100 text-slate-600",
  },
};

export function articleStatusPresentation(status: StudentArticleStatus) {
  return presentations[status];
}

export function ArticleStatusBadge({ status }: { status: StudentArticleStatus }) {
  const presentation = articleStatusPresentation(status);
  return (
    <span
      title={presentation.description}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold tracking-[.08em] uppercase ${presentation.classes}`}
    >
      {presentation.label}
    </span>
  );
}
