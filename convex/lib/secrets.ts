const PLACEHOLDER_SECRET = /replace|your[_-]|example/i;

export function isConfiguredSecret(value: string | undefined): value is string {
  return Boolean(value && value.length >= 32 && !PLACEHOLDER_SECRET.test(value));
}
