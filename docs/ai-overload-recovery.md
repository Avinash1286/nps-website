# AI response overload recovery

The production admin panel recorded one Gemini response failing after four background attempts with “This model is currently experiencing high demand.” Eight other AI jobs had succeeded. This is evidence of a temporary provider failure, not evidence that the database is unavailable or the API key is invalid.

Google recommends bounded exponential backoff and jitter for transient API failures: https://ai.google.dev/gemini-api/docs/troubleshooting . Application code cannot prevent a provider outage.

## Backend change

Recognized temporary AI failures receive six background attempts instead of four. The initial wait is 60–75 seconds. Subsequent waits increase exponentially with stable per-job jitter; the six attempts span approximately 32–40 minutes, excluding request execution time. A per-wait cap prevents unbounded delays. The existing brief SDK retry inside each generation call remains unchanged.

Known invalid-credential, permission, payment and daily-quota failures stop retrying when the worker records the failure. Unknown failures retain the previous retry policy. Notification jobs retain their existing retry timing and attempt limits. A late failure cannot reopen succeeded, cancelled or dead jobs. Errors remain visible when the retry budget is exhausted.

This does not switch providers/models, change credentials, add a billing plan, or automatically revive old failed jobs. Longer recovery may complete a response later than the visitor's original session; the current public interface does not automatically stream a background completion back into an already-failed request.

## Production activation

This change runs in Convex. A successful Vercel build alone does not activate it. Deploy the reviewed commit to the existing production deployment `usable-basilisk-27` using an authorized owner/deploy session; do not create a replacement backend or select a similarly named development deployment. No schema migration or new environment variable is needed.

After that deployment succeeds, inspect the existing dead AI-response row in `/admin/jobs` and retry it once. The error classifier extends legacy four-attempt AI jobs when they encounter another recognized temporary failure. Confirm the final status and result summary, not just the requeue confirmation. If generation still fails, preserve the actual error and investigate the provider's current status/configuration. Do not promise that retries eliminate provider overloads.

## Verification

The regression suite exercises the actual Convex queue/failure mutations, delayed scheduling, legacy attempt budgets, terminal-state preservation, retained error/message state, permanent-error handling, notification isolation, and duplicate enqueue protection. Tests use synthetic records and make no live model requests or external notifications.
