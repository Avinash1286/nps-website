import { AssistantLauncher } from "./assistant-launcher";

export function AssistantAvailability({ initialEnabled }: { initialEnabled: boolean }) {
  return initialEnabled ? <AssistantLauncher /> : null;
}
