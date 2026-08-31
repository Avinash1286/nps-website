import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { StaffProviders } from "@/app/providers";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("replace") &&
    process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes("replace"),
  );
  if (authConfigured) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");
  }
  return (
    <StaffProviders>
      <AdminShell authConfigured={authConfigured}>{children}</AdminShell>
    </StaffProviders>
  );
}
