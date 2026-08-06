"use client";

import { useQuery } from "convex/react";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  ContactRound,
  FileClock,
  Newspaper,
  School,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { ADMIN_ACCESS_ROLES, hasAdminAccess, type AdminRole } from "@/lib/admin/authorization";
import { AdminFeatureGate } from "./admin-gate";
import { adminApi, usersApi, type AdminRecord } from "./convex-api";
import { formatDate, itemLabel } from "./content-manager";
import { EmptyState, LoadingPanel } from "./ui";

const quickActions = [
  {
    title: "Write a news story",
    description: "Create a verified draft for editorial review.",
    href: "/admin/news",
    icon: Newspaper,
    roles: ADMIN_ACCESS_ROLES.content,
  },
  {
    title: "Review admissions",
    description: "Triage new applications and assign ownership.",
    href: "/admin/admissions",
    icon: School,
    roles: ADMIN_ACCESS_ROLES.admissions,
  },
  {
    title: "Manage events",
    description: "Update dates, capacity, and registration status.",
    href: "/admin/events",
    icon: CalendarDays,
    roles: ADMIN_ACCESS_ROLES.content,
  },
  {
    title: "Check background jobs",
    description: "Investigate retries and failed delivery work.",
    href: "/admin/jobs",
    icon: Activity,
    roles: ADMIN_ACCESS_ROLES.adminOnly,
  },
] as const;

export function dashboardQuickActionsForRoles(roles: readonly string[]) {
  return quickActions.filter((action) => hasAdminAccess(roles, action.roles));
}

export function dashboardCanReviewAudit(roles: readonly string[]) {
  return hasAdminAccess(roles, ADMIN_ACCESS_ROLES.adminOnly);
}

export function AdminDashboard() {
  return (
    <AdminFeatureGate requiredRoles={ADMIN_ACCESS_ROLES.activeStaff}>
      <DashboardData />
    </AdminFeatureGate>
  );
}

function DashboardData() {
  const data = useQuery(adminApi.dashboard, {});
  const viewer = useQuery(usersApi.current, {});
  if (data === undefined || viewer === undefined || viewer === null)
    return <LoadingPanel label="Loading workspace metrics" />;

  const roles = Array.isArray(viewer.roles)
    ? viewer.roles.filter((role): role is AdminRole =>
        ADMIN_ACCESS_ROLES.activeStaff.includes(role as AdminRole),
      )
    : [];
  const visibleQuickActions = dashboardQuickActionsForRoles(roles);
  const isAdmin = dashboardCanReviewAudit(roles);
  const canManageContent = hasAdminAccess(roles, ADMIN_ACCESS_ROLES.content);
  const canManageAdmissions = hasAdminAccess(roles, ADMIN_ACCESS_ROLES.admissions);

  const content = Object.values(data.content ?? {});
  const metrics = [
    ...(canManageContent
      ? ([
          ["Published content", content.reduce((total, item) => total + item.published, 0)],
          ["Drafts awaiting review", content.reduce((total, item) => total + item.draft, 0)],
        ] as const)
      : []),
    ...(isAdmin ? ([["Open enquiries", data.workflows?.contacts?.open ?? 0]] as const) : []),
    ...(canManageAdmissions
      ? ([["Active applications", data.workflows?.admissions?.active ?? 0]] as const)
      : []),
    ...(isAdmin
      ? ([
          ["Registered attendees", data.workflows?.eventRegistrations?.registered ?? 0],
          ["Active subscribers", data.workflows?.newsletter?.active ?? 0],
          ["Queued jobs", data.jobs?.queued ?? 0],
          ["Failed jobs", data.jobs?.failed ?? 0],
        ] as const)
      : []),
  ] as const;
  const recent = isAdmin ? (data.recent?.audit ?? []) : (data.recent?.admissions ?? []);

  return (
    <div className="space-y-7">
      {data.content || data.workflows || data.jobs ? (
        <section aria-label="Workspace metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([key, value], index) => {
            const Icon = [BookOpenCheck, ContactRound, School, FileClock][index % 4];
            return (
              <article
                key={key}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 capitalize">{humanize(key)}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                      {new Intl.NumberFormat("en-NP").format(value)}
                    </p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                    <Icon size={19} />
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          title="Metrics will appear after deployment"
          description="Convex returned no dashboard counters. Seed content or complete the deployment setup to begin monitoring activity."
        />
      )}

      <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold tracking-[.16em] text-sky-700 uppercase">
                Common workflows
              </p>
              <h2 className="mt-2 text-xl font-black">Continue working</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {visibleQuickActions.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-xl border border-slate-200 p-4 transition hover:border-sky-200 hover:bg-sky-50/60"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-sky-100 group-hover:text-sky-800">
                    <Icon size={17} />
                  </span>
                  <span>
                    <b className="block text-sm text-slate-900">{title}</b>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                  </span>
                </div>
                <span className="mt-3 flex items-center justify-end gap-1 text-xs font-bold text-sky-700">
                  Open <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#071c38] p-6 text-white shadow-xl shadow-slate-300/50">
          <ShieldCheck className="text-sky-300" />
          <h2 className="mt-5 text-xl font-black">Production safeguards</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <li>Clerk protects every administration route.</li>
            <li>Convex functions authorize every read and write.</li>
            <li>Publishing and operational changes are audited.</li>
            <li>
              {isAdmin
                ? "Failed delivery work can be inspected and retried."
                : "Navigation and actions are limited to your assigned staff role."}
            </li>
          </ul>
          {isAdmin && (
            <Link
              href="/admin/audit"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-sky-300 hover:text-white"
            >
              Review audit history <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-extrabold tracking-[.16em] text-sky-700 uppercase">
            Latest activity
          </p>
          <h2 className="mt-1 text-lg font-black">Recent records</h2>
        </div>
        {recent.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            No recent administrative records were returned.
          </p>
        ) : (
          recent.slice(0, 8).map((item: AdminRecord) => (
            <div
              key={item._id}
              className="flex flex-col items-start justify-between gap-2 border-b border-slate-100 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {String(item.summary ?? itemLabel(item))}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {String(item.entityType ?? item.type ?? item.status ?? "Administrative record")}
                </p>
              </div>
              {typeof item.createdAt === "number" || item._creationTime ? (
                <time className="shrink-0 text-xs text-slate-500 sm:text-right">
                  {formatDate(Number(item.createdAt ?? item._creationTime))}
                </time>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase();
}
