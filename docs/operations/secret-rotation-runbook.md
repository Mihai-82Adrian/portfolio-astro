# Secret rotation runbook

This is a procedure, not evidence that any secret exists. No value may be read, created, copied, or
changed without owner authorization. Never place values in source, logs, tickets, screenshots,
commits, reports, shell history, or chat.

## Governed configuration

| Name or class | Purpose and consumer | Possible environments | State |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Server-side AI Functions under `functions/api/` | ignored local `.dev.vars`; authorized preview; authorized production | Supported; presence is environment-specific and not asserted here |
| `RESEND_API_KEY` | `functions/api/sample-review.ts` email provider authorization | ignored local `.dev.vars`; future preview/production | Inactive future Sample Review configuration |
| `SAMPLE_REVIEW_EMAIL_FROM`, `SAMPLE_REVIEW_EMAIL_TO` | Sender/recipient configuration for Sample Review | ignored local `.dev.vars`; future preview/production | Inactive future configuration; handle as sensitive operational values |
| Future safety-identifier pepper | Planned HMAC input for a future abuse-control design | Future authorized environments only | Roadmap dependency, not a current variable or secret |

Local `.dev.vars`, preview, and production are separate stores. Never copy a production value into
local or preview merely for convenience. A variable supported by code is not proof that a value is
configured.

## Planned rotation

For each active environment:

1. Obtain explicit owner authorization and confirm the exact secret, environment, maintenance
   window, provider access, verification owner, and rollback window.
2. Prepare a new provider credential with the minimum required scope without revoking the old value.
3. Record only non-secret identifiers needed to distinguish old and new credentials.
4. Update one environment at a time: local test when authorized, then preview, then production only
   after preview evidence and separate production authorization.
5. Verify the narrow consumer with a controlled request and inspect only status/error metadata.
   `/api/health` cannot verify provider credentials.
6. If verification fails, restore the previous environment reference while it is still valid,
   diagnose without printing either value, and stop promotion.
7. After successful verification and the agreed overlap, revoke the old provider credential and
   confirm that the new credential remains functional.

For Resend activation, rotate the API key and validate sender/recipient configuration as one
controlled feature gate. Do not activate Sample Review through this runbook alone; activation also
requires its roadmap controls and explicit authorization.

## Incident-triggered rotation

Suspected exposure, unexpected provider activity, an unauthorized configuration change, or a
provider notice triggers immediate owner escalation. Revoke or disable the suspected credential
first when containment risk outweighs availability, issue a replacement with minimum scope, update
each authorized environment, verify, and review logs that do not contain sensitive inputs. Preserve
an incident timeline containing identifiers and actions only, never secret values.

If a provider is unavailable, keep the affected feature failed closed. Do not introduce a fallback
provider or temporary shared credential.

## Verification and closure

Closure requires owner confirmation of the environments changed, successful narrow behavior checks,
old-credential revocation, failure behavior with absent configuration, and absence of values from
the repository and evidence package. Rollback means restoring a still-valid prior credential or
disabling the feature; it never means recovering a revoked value.
