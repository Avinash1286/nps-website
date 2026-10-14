import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SearchPage from "@/app/(site)/search/page";
import FaqPage from "@/app/(site)/admissions/faq/page";

vi.mock("@/lib/data/public", () => ({
  getCmsPages: async () => [
    { slug: "admissions", title: "Admissions process", body: "How to apply" },
    { slug: "fees", title: "Fees", body: "School fees" },
  ],
  getFaqs: async () => [
    { id: "apply", question: "How do I apply?", answer: "Apply online", category: "Admissions" },
    { id: "fees", question: "What are the fees?", answer: "Contact the school", category: "General" },
  ],
  getDepartments: async () => [],
  getEvents: async () => [],
  getFacilities: async () => [],
  getNavigation: async () => [],
  getNews: async () => [],
  getNotices: async () => [],
  getPrograms: async () => [],
  getStudentArticles: async () => [],
  getTeachers: async () => [],
}));

vi.mock("@/components/site/page-hero", () => ({ PageHero: () => null }));

afterEach(cleanup);

it("searches using the first repeated q value and displays it in the form", async () => {
  render(await SearchPage({ searchParams: Promise.resolve({ q: ["admissions", "fees"] }) }));
  expect(screen.getByRole("textbox", { name: "Search this website" })).toHaveValue("admissions");
  expect(screen.getByRole("link", { name: /Admissions process/ })).toHaveAttribute("href", "/admissions");
  expect(screen.queryByRole("link", { name: /School fees/ })).not.toBeInTheDocument();
});

it("filters FAQs using the first repeated q and category values", async () => {
  render(
    await FaqPage({
      searchParams: Promise.resolve({ q: ["apply", "fees"], category: ["Admissions", "General"] }),
    }),
  );
  expect(screen.getByRole("textbox")).toHaveValue("apply");
  expect(screen.getByRole("combobox")).toHaveValue("Admissions");
  expect(screen.getByText("How do I apply?")).toBeInTheDocument();
  expect(screen.queryByText("What are the fees?")).not.toBeInTheDocument();
});

it("renders search tips when no query is provided", async () => {
  render(await SearchPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText("Search tips")).toBeInTheDocument();
});

it("continues to filter FAQs with single string parameters", async () => {
  render(await FaqPage({ searchParams: Promise.resolve({ q: " FEES ", category: " General " }) }));
  expect(screen.getByText("What are the fees?")).toBeInTheDocument();
  expect(screen.queryByText("How do I apply?")).not.toBeInTheDocument();
});
