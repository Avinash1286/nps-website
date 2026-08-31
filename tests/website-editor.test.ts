import { describe, expect, it } from "vitest";
import {
  filterWebsiteEditorSections,
  websiteEditorSectionsForRoles,
} from "@/components/admin/website-editor";

function destinationsFor(role: "admin" | "publisher" | "editor" | "admissions") {
  return websiteEditorSectionsForRoles([role]).flatMap((section) => section.destinations);
}

describe("website editor section map", () => {
  it("mirrors the public website order", () => {
    expect(websiteEditorSectionsForRoles(["admin"]).map((section) => section.title)).toEqual([
      "Home",
      "About",
      "Academics",
      "Departments",
      "Facilities & school life",
      "Admissions",
      "Updates",
      "Sitewide",
    ]);
  });

  it("shows administrators every website-management destination", () => {
    const hrefs = destinationsFor("admin").map((destination) => destination.href);
    expect(hrefs).toContain("/admin/pages?section=about");
    expect(hrefs).toContain("/admin/pages?section=academics");
    expect(hrefs).toContain("/admin/pages?section=campus-life");
    expect(hrefs).toContain("/admin/facilities");
    expect(hrefs).toContain("/admin/pages?section=admissions");
    expect(hrefs).toContain("/admin/navigation");
    expect(hrefs).toContain("/admin/media");
    expect(hrefs).toContain("/admin/settings");
  });

  it("limits sitewide tools according to the current staff role", () => {
    const publisherHrefs = destinationsFor("publisher").map((destination) => destination.href);
    const editorHrefs = destinationsFor("editor").map((destination) => destination.href);

    expect(publisherHrefs).toContain("/admin/navigation");
    expect(publisherHrefs).not.toContain("/admin/settings");
    expect(editorHrefs).toContain("/admin/media");
    expect(editorHrefs).not.toContain("/admin/navigation");
    expect(editorHrefs).not.toContain("/admin/settings");
  });

  it("does not expose publishing destinations to admissions-only staff", () => {
    expect(websiteEditorSectionsForRoles(["admissions"])).toEqual([]);
  });

  it("finds deep editing destinations using visitor-friendly words", () => {
    const sections = websiteEditorSectionsForRoles(["admin"]);
    const teacherResults = filterWebsiteEditorSections(sections, "teacher");
    expect(teacherResults).toMatchObject([{ title: "Departments" }]);
    expect(teacherResults[0]?.destinations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Manage teacher profiles", href: "/admin/teachers" }),
      ]),
    );
    expect(filterWebsiteEditorSections(sections, "priority")).toMatchObject([
      {
        title: "Updates",
        destinations: [{ label: "Publish notices", href: "/admin/notices" }],
      },
    ]);
    expect(filterWebsiteEditorSections(sections, "not a real section")).toEqual([]);
  });
});
