import { studentAuthHandler } from "@/lib/auth/student-server";

export const dynamic = "force-dynamic";

export const GET = studentAuthHandler.GET;
export const POST = studentAuthHandler.POST;
