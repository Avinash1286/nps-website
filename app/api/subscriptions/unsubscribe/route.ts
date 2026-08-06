import { fetchMutation } from "convex/nextjs";
import { makeFunctionReference } from "convex/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const unsubscribeNewsletter = makeFunctionReference<"mutation", { token: string }, { ok: boolean }>(
  "forms:unsubscribeNewsletter",
);
const schema = z.object({ token: z.string().min(20).max(200) });

export async function POST(request: Request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return NextResponse.json({ error: "Subscriptions are not configured." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "This unsubscribe link is invalid." }, { status: 400 });
  try {
    const result = await fetchMutation(unsubscribeNewsletter, parsed.data, { url: convexUrl });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The request could not be completed." }, { status: 400 });
  }
}
