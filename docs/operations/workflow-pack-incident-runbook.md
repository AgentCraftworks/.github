# Workflow Pack Incident Response Runbook

This runbook defines the operational response workflow for workflow-pack incidents affecting payload reliability or governance correctness.

## Scope and objectives

Use this runbook for any incident where onboarding/release payload behavior is degraded, incorrect, or non-compliant with governance policy.

Primary objectives:

1. Restore reliable payload behavior quickly.
2. Prevent non-compliant workflow/policy payload propagation.
3. Preserve auditable decisions for release-manager/compliance review.

## Roles during an incident

| Role | Responsibility |
| --- | --- |
| Incident Commander (`on-call`) | Owns timeline, severity assignment, response coordination, and updates |
| `platform-owner` | Technical diagnosis and code/config mitigation |
| `release-manager` | Release freeze/unfreeze decisions, stakeholder communication |
| `compliance` | Governance impact assessment, exceptions, control sign-off |
| `repo-owner` | Consumer verification and repo-level remediation execution |

## Severity model

| Severity | Criteria | Initial response target |
| --- | --- | --- |
| **SEV-1** | Widespread payload failure or confirmed governance-violating payload in production-required path | 15 minutes |
| **SEV-2** | Partial payload degradation, elevated onboarding failures, or limited governance drift | 30 minutes |
| **SEV-3** | Localized or low-impact issue with workaround | 1 business day |

## Incident triggers

Open an incident when any of the following occurs:

1. Workflow payload reliability SLO breach or sustained rapid decline.
2. Governance correctness SLO breach (for example, immutable pinning missing in generated payload).
3. Duplicate/on-repeat onboarding payload behavior that causes repeated PR/file churn.
4. Compliance-flagged control failure in release payload.

## Response workflow

### 1) Detect and declare

1. Create incident record with timestamp, suspected scope, and affected versions/SHAs.
2. Assign severity using the model above.
3. Notify release-manager and compliance for SEV-1/SEV-2.

### 2) Triage and scope

1. Confirm impacted dimensions:
   - onboarding payload generation
   - idempotent re-run behavior
   - governance controls (pinning, permissions, policy files)
2. Identify first-bad release/version/SHA.
3. Determine blast radius (repos, environments, check paths).

### 3) Mitigate and contain

1. For reliability failures:
   - pause new rollout if needed
   - rollback to last known good SHA or apply hotfix
2. For governance correctness failures:
   - freeze affected releases immediately
   - block non-compliant payload propagation
   - apply compensating controls (temporary policy checks or manual gate)
3. Document every mitigation decision with owner and timestamp.

### 4) Recover and validate

1. Confirm SLI recovery trend (reliability and governance correctness).
2. Validate representative target repositories (clean + previously impacted repos).
3. Obtain release-manager approval to resume normal release cadence.
4. Obtain compliance acknowledgment for governance-impacting incidents.

### 5) Close and follow through

1. Publish incident summary with root cause, customer/repo impact, and resolution.
2. Record CAPA items with owners and due dates.
3. Track until CAPA completion in weekly operating review.

## Communication protocol

| Incident phase | Required update frequency | Required audience |
| --- | --- | --- |
| SEV-1 active | Every 30 minutes | on-call, platform-owner, release-manager, compliance |
| SEV-2 active | Every 60 minutes | on-call, platform-owner, release-manager, compliance |
| Recovery validation | At each major milestone | Same as above + affected repo-owners |
| Post-incident | Final report within 1 business day | release-manager, compliance, affected stakeholders |

## Decision checkpoints

1. **Release freeze required?** (release-manager accountable)
2. **Governance exception needed?** (compliance accountable)
3. **Rollback vs hotfix path?** (platform-owner responsible, release-manager accountable)
4. **Recovery sufficient to close?** (incident commander proposes, release-manager/compliance sign-off as applicable)

## Evidence checklist (required for closure)

- Incident timeline with key decisions and approvers
- Affected versions/SHAs and corrected versions/SHAs
- SLI/SLO impact summary (breach duration, recovery time)
- Validation evidence from representative target repositories
- CAPA list with owners and target completion dates

## Escalation rules

1. Escalate immediately to release-manager and compliance for all SEV-1 incidents.
2. Escalate any unresolved SEV-2 incident that exceeds 4 hours.
3. Escalate to governance leadership if non-compliant payloads reached production-required paths.

## References

- `docs/operations/workflow-pack-operating-model.md`
- `docs/standards/reusable-workflow-semver-governance.md`
- `docs/standards/reusable-workflow-releases.md`
