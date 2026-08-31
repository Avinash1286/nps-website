import { permanentRedirect } from "next/navigation";

export default function LegacyDepartmentsPage() {
  permanentRedirect("/departments");
}
