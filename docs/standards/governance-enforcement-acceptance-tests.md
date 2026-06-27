# Governance Enforcement Acceptance Tests (Lane E / P1)

This suite defines handoff-ready acceptance tests for AgentCraftworks app-repo enforcement against:
- `docs/standards/pr-readiness-policy-spec.json`
- `docs/standards/governance-enforcement-contract.md`

## Test Output Contract

Each test must assert:
- `status` (`pass|fail|error|skipped`)
- `violations[]` (code, severity, message, remediation)
- `escalation_actions` (label/comment/reviewer actions when applicable)

## Acceptance Scenarios

| ID | Scenario | Input Setup | Expected Result |
| --- | --- | --- | --- |
| AC-001 | Immutable SHA pin accepted | Template uses `AgentCraftworks/.github/.github/workflows/acw-pr-readiness-reusable.yml@<40-char-sha>` and SHA exists in release manifest | `status=pass`, no immutable-pin violations |
| AC-002 | Mutable ref rejected | Template uses `@main` or semver tag | `status=fail`, `IMMUTABLE_PIN_REQUIRED`, remediation to pin 40-char SHA |
| AC-003 | Unknown SHA rejected | Template uses 40-char SHA not present in release manifest | `status=fail`, `PIN_NOT_IN_RELEASE_MANIFEST` |
| AC-004 | Required-check alignment pass | Required gate job IDs exist in reusable workflow and policy constants match template/wrapper/reusable defaults | `status=pass` |
| AC-005 | Required-check mismatch fails | A required gate job ID is renamed/removed | `status=fail`, `RULESET_ALIGNMENT_MISMATCH` |
| AC-006 | Escalation on failing gates | At least one required gate returns `fail`, PR not draft | `status=fail`, escalation label set, escalation comment includes marker and remediation bullets |
| AC-007 | No escalation on draft PR | Required gate fails but PR is draft | `status=fail` gate outcome preserved, escalation comment/label deferred |
| AC-008 | Escalation idempotency | Failing state persists across rerun and escalation marker already exists | no duplicate escalation comment, no duplicate reviewer request |
| AC-009 | Empty escalation label | `escalation_label` empty | gate failures still surfaced, label write skipped with warning |
| AC-010 | GHAS unavailable handling | GitHub API for code scanning returns 403/404 | GHAS gate `skipped` with explicit reason, no silent pass |
| AC-011 | Fork permission constraint | Comment/label write fails due to fork restrictions | failing status preserved, warning emitted for write failure |
| AC-012 | Reviewer already approved | Required reviewer has latest `APPROVED` | no re-request of reviewer, approval gate passes |
| AC-013 | Review threads unresolved | Active unresolved review threads exist | `status=fail`, unresolved thread violation and remediation guidance |
| AC-014 | Dependency review failure | Moderate+ dependency finding detected | `status=fail`, dependency remediation guidance included |
| AC-015 | Invalid policy document | Policy JSON missing/invalid | `status=error`, validation halted with policy parse/load error |
| AC-016 | API transient failure | GitHub API returns transient 5xx or secondary rate limit | `status=error`, retry required and error context captured |

## Minimal Validation Sequence for App Repo

1. Load policy JSON and verify schema/version compatibility.
2. Resolve workflow references in enforced paths.
3. Evaluate immutable pin + release manifest coherence.
4. Evaluate required check/ruleset alignment.
5. Evaluate gate outcomes and escalation actions.
6. Emit standardized output payload with violations/remediation.

## Exit Criteria for Lane E Handoff

- All scenarios above are traceable to validator behavior in app repo implementation.
- Failure scenarios produce deterministic violation codes and remediation messages.
- Escalation behavior is idempotent and marker-based.
