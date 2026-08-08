export type AssistantHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantSignatureInput = {
  requestTimestamp: number;
  fingerprint: string;
  sessionId: string;
  message: string;
  history?: AssistantHistoryEntry[];
};

const ASSISTANT_SIGNATURE_VERSION = "nps-assistant-v1";

export function normalizeAssistantServiceSecret(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function canonicalAssistantSignaturePayload(input: AssistantSignatureInput): string {
  return JSON.stringify([
    ASSISTANT_SIGNATURE_VERSION,
    input.requestTimestamp,
    input.fingerprint,
    input.sessionId,
    input.message,
    (input.history ?? []).map((entry) => [entry.role, entry.content]),
  ]);
}
