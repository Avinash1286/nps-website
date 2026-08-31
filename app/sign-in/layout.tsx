import { StaffSignInProvider } from "@/app/providers";

export const dynamic = "force-dynamic";

export default function StaffSignInLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StaffSignInProvider>{children}</StaffSignInProvider>;
}
