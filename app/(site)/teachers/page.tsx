import { permanentRedirect } from "next/navigation";

export default function LegacyTeachersDirectoryPage() {
  permanentRedirect("/departments");
}
