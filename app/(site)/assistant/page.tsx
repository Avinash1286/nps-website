import type { Metadata } from "next";
import { BotOff } from "lucide-react";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { getSiteProfile } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Information Assistant",
  description: "Ask questions using verified information published by Nepal Police School Garuda.",
};

export default async function AssistantPage() {
  const site = await getSiteProfile();
  return (
    <section className="bg-[#f4f5fd] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-extrabold tracking-[0.2em] text-sky-700 uppercase">Digital support</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#1e1f5c] sm:text-5xl">
          Ask the NPS information assistant.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          The assistant searches approved public school content and links you to its sources. It does not make
          admissions decisions or access private records.
        </p>
        <div className="mt-10">
          {site.assistantEnabled ? (
            <AssistantPanel fullPage />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-700 shadow-sm">
              <BotOff className="text-sky-700" />
              <h2 className="mt-5 text-xl font-extrabold text-[#1e1f5c]">
                The information assistant is offline
              </h2>
              <p className="mt-3 text-sm leading-6">
                Use website search or the contact page while the school reviews and enables this service.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
