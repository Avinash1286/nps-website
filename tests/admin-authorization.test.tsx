import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

const gateCalls = vi.hoisted(
  () => [] as Array<{ requiredRoles?: readonly string[]; allowPending?: boolean }>,
);

vi.mock("@/components/admin/admin-gate", () => ({
  AdminFeatureGate: ({
    requiredRoles,
    allowPending,
  }: {
    children: ReactNode;
    requiredRoles?: readonly string[];
    allowPending?: boolean;
  }) => {
    gateCalls.push({ requiredRoles, allowPending });
    return null;
  },
  clerkConfigured: true,
  convexConfigured: true,
}));

import { ADMIN_ACCESS_ROLES, hasAdminAccess, submissionRequiredRoles } from "@/lib/admin/authorization";
import { AiManager } from "@/components/admin/ai-manager";
import { ArticleReviewManager } from "@/components/admin/article-review-manager";
import { AuditManager } from "@/components/admin/audit-manager";
import { BootstrapAdmin } from "@/components/admin/bootstrap-admin";
import { AdminCollectionScreen, getCollectionDefinition } from "@/components/admin/content-manager";
import {
  AdminDashboard,
  dashboardCanReviewAudit,
  dashboardQuickActionsForRoles,
} from "@/components/admin/dashboard";
import { GalleryItemsManager } from "@/components/admin/gallery-items-manager";
import { JobsManager } from "@/components/admin/jobs-manager";
import { MediaManager } from "@/components/admin/media-manager";
import { NavigationManager } from "@/components/admin/navigation-manager";
import { NewsletterManager } from "@/components/admin/newsletter-manager";
import { SettingsManager } from "@/components/admin/settings-manager";
import { AdmissionDetail, SubmissionManager } from "@/components/admin/submission-manager";
import { UsersManager } from "@/components/admin/users-manager";

function expectGate(
  element: ReactElement,
  requiredRoles: readonly string[] | undefined,
  allowPending?: boolean,
) {
  gateCalls.length = 0;
  render(element);
  expect(gateCalls).toEqual([{ requiredRoles, allowPending }]);
  cleanup();
}

describe("admin UI authorization", () => {
  afterEach(() => {
    gateCalls.length = 0;
    cleanup();
  });

  it("keeps frontend access groups aligned with backend role contracts", () => {
    expect(ADMIN_ACCESS_ROLES).toEqual({
      activeStaff: ["admin", "publisher", "editor", "admissions"],
      adminOnly: ["admin"],
      content: ["admin", "publisher", "editor"],
      navigation: ["admin", "publisher"],
      admissions: ["admin", "admissions"],
    });
    expect(submissionRequiredRoles("admissions")).toBe(ADMIN_ACCESS_ROLES.admissions);
    expect(submissionRequiredRoles("contacts")).toBe(ADMIN_ACCESS_ROLES.adminOnly);
    expect(submissionRequiredRoles("eventRegistrations")).toBe(ADMIN_ACCESS_ROLES.adminOnly);
    expect(hasAdminAccess(["editor"], ADMIN_ACCESS_ROLES.content)).toBe(true);
    expect(hasAdminAccess(["admissions"], ADMIN_ACCESS_ROLES.content)).toBe(false);
  });

  it("applies explicit gates to admin-only, navigation, content, and bootstrap surfaces", () => {
    expectGate(<UsersManager />, ADMIN_ACCESS_ROLES.adminOnly);
    expectGate(<AuditManager />, ADMIN_ACCESS_ROLES.adminOnly);
    expectGate(<NewsletterManager />, ADMIN_ACCESS_ROLES.adminOnly);
    expectGate(<SettingsManager />, ADMIN_ACCESS_ROLES.adminOnly);
    expectGate(<JobsManager />, ADMIN_ACCESS_ROLES.adminOnly);
    expectGate(<AiManager />, ADMIN_ACCESS_ROLES.adminOnly);
    expectGate(<ArticleReviewManager />, ADMIN_ACCESS_ROLES.adminOnly);
    expectGate(<NavigationManager />, ADMIN_ACCESS_ROLES.navigation);
    expectGate(<MediaManager />, ADMIN_ACCESS_ROLES.content);
    expectGate(<GalleryItemsManager />, ADMIN_ACCESS_ROLES.content);
    expectGate(
      <AdminCollectionScreen definition={getCollectionDefinition("news")} />,
      ADMIN_ACCESS_ROLES.content,
    );
    expectGate(<AdminDashboard />, ADMIN_ACCESS_ROLES.activeStaff);
    expectGate(<BootstrapAdmin />, undefined, true);
  });

  it("gates each submission surface with its backend submission roles", () => {
    expectGate(<SubmissionManager type="admissions" />, ADMIN_ACCESS_ROLES.admissions);
    expectGate(<AdmissionDetail id="admission-1" />, ADMIN_ACCESS_ROLES.admissions);
    expectGate(<SubmissionManager type="contacts" />, ADMIN_ACCESS_ROLES.adminOnly);
    expectGate(<SubmissionManager type="eventRegistrations" />, ADMIN_ACCESS_ROLES.adminOnly);
  });

  it("only returns dashboard links the viewer can open", () => {
    expect(dashboardQuickActionsForRoles(["admin"]).map((action) => action.href)).toEqual([
      "/admin/website",
      "/admin/news",
      "/admin/admissions",
      "/admin/events",
      "/admin/jobs",
    ]);
    expect(dashboardQuickActionsForRoles(["publisher"]).map((action) => action.href)).toEqual([
      "/admin/website",
      "/admin/news",
      "/admin/events",
    ]);
    expect(dashboardQuickActionsForRoles(["editor"]).map((action) => action.href)).toEqual([
      "/admin/website",
      "/admin/news",
      "/admin/events",
    ]);
    expect(dashboardQuickActionsForRoles(["admissions"]).map((action) => action.href)).toEqual([
      "/admin/admissions",
    ]);
    expect(dashboardQuickActionsForRoles([])).toEqual([]);
    expect(dashboardCanReviewAudit(["admin"])).toBe(true);
    expect(dashboardCanReviewAudit(["publisher"])).toBe(false);
    expect(dashboardCanReviewAudit(["editor"])).toBe(false);
    expect(dashboardCanReviewAudit(["admissions"])).toBe(false);
  });
});
