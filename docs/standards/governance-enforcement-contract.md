# Governance Enforcement Contract (Lane E / P1)

This contract defines policy inputs, validation rules, outputs, and escalation behavior for PR governance automation across:
1. immutable reusable-workflow pins,
2. required checks and ruleset alignment, and
3. escalation conventions.

Primary policy constants are encoded in `docs/standards/pr-readiness-policy-spec.json`.
Acceptance coverage is defined in `docs/standards/governance-enforcement-acceptance-tests.md`.

## Scope

- Source policy artifacts live in `AgentCraftworks/.github`.
- Direct enforcement in this repo is implemented in:
  - `.github/workflows/acw-branch-quality.yml` (`policy-contract-lint` job)
  - `.github/workflows/acw-pr-readiness-reusable.yml` (escalation messaging + marker)
- AgentCraftworks app repository enforcement must consume this contract as the source of truth.

## Inputs (App Repo Contract)

The app validator should accept this minimum payload:

```json
{
  "policy_version": "2.0.0",
  "repository": "owner/repo",
  "base_branch": "staging|main|other",
  "pull_request": {
    "number": 123,
    "head_sha": "40-char SHA",
    "draft": false
  },
  "workflow_references": [
    {
      "path": ".github/workflow-templates/acw-pr-readiness.yml",
      "uses": "AgentCraftworks/.github/.github/workflows/acw-pr-readiness-reusable.yml@<ref>"
    }
  ],
  "ruleset": {
    "required_check_contexts": ["..."],
    "protected_branches": ["staging", "main"]
  },
  "gate_results": {
    "required-human-approval": "pass|fail|error|skipped",
    "review-feedback-gate": "pass|fail|error|skipped",
    "ghas-gate": "pass|fail|error|skipped",
    "dependency-review-gate": "pass|fail|error|skipped"
  },
  "escalation": {
    "existing_labels": ["needs-human-decision"],
    "existing_comments": ["..."]
  }
}
```

## Validation Logic (Normative)

Validation order must be deterministic and short-circuit only on unrecoverable input errors:

1. **Policy load**
   - Load `pr-readiness-policy-spec.json`.
   - Fail `error` if missing or invalid JSON.
2. **Immutable pin check**
   - For each policy `enforced_paths`, validate `uses` matches `allowed_reusable_workflow_ref_pattern`.
   - Fail `fail` with violation code `IMMUTABLE_PIN_REQUIRED` on mutable refs (`@main`, `@staging`, semver tag, short SHA).
3. **Release manifest coherence**
   - Confirm pinned 40-char SHA exists in `docs/standards/reusable-workflow-releases.md`.
   - Fail `fail` with `PIN_NOT_IN_RELEASE_MANIFEST` if absent.
4. **Required-check alignment**
   - Validate required gate job IDs from policy exist in reusable workflow definition.
   - Validate protected branches and required reviewer/label values are consistent between policy, template, wrapper, and reusable defaults.
   - Fail `fail` with `RULESET_ALIGNMENT_MISMATCH`.
5. **Escalation convention**
   - If any required gate result is `fail`, `error`, `skipped`, cancelled, or missing, ensure:
     - escalation label matches policy label,
     - escalation comment includes policy marker (`<!-- acw-escalation:v1 -->`),
     - remediation bullets are included per failing gate.
   - If all gates pass, remove escalation label if present.

## Outputs (App Repo Contract)

The app should emit machine-readable output:

```json
{
  "policy_id": "acw-pr-readiness-governance",
  "policy_version": "2.0.0",
  "status": "pass|fail|error|skipped",
  "violations": [
    {
      "code": "IMMUTABLE_PIN_REQUIRED",
      "severity": "high",
      "path": ".github/workflow-templates/acw-pr-readiness.yml",
      "message": "Reusable workflow reference must be pinned to immutable 40-character SHA.",
      "remediation": "Pin to release manifest SHA in docs/standards/reusable-workflow-releases.md."
    }
  ],
  "escalation_actions": {
    "label_added": true,
    "comment_posted": true,
    "reviewer_requested": "jenperret"
  }
}
```

## Remediation Messaging (Normative)

When escalating, include:
- Marker: `<!-- acw-escalation:v1 -->`
- Failing gates list
- Required remediation bullets:
  - `required-human-approval`: required reviewer must have active `APPROVED`.
  - `review-feedback-gate`: no unresolved active review threads.
  - `ghas-gate`: inspect scan availability and findings for the current PR merge commit.
  - `dependency-review-gate`: inspect dependency graph availability and remediate moderate+ findings.

## Edge Cases and Failure Modes

| Case | Expected Behavior |
| --- | --- |
| Draft PR | Do not escalate; defer comment/label until ready_for_review. |
| Fork PR with restricted issue write | Keep gate result; emit warning on comment failure, do not mask failing status. |
| GHAS unavailable (403/404) | Fail the gate with an explicit reason; do not treat unavailable scanning as a pass. |
| Required gate skipped, cancelled, or missing | Fail the aggregate escalation check and do not remove the escalation label. |
| Missing/empty escalation label input | Continue gate evaluation; skip label write and emit warning. |
| Required checks renamed in workflow | Fail alignment validation with `RULESET_ALIGNMENT_MISMATCH`. |
| Pinned SHA not in release manifest | Fail immutable release coherence check. |
| GitHub API pagination needed | Must paginate reviews/threads/alerts to avoid false pass. |
| GitHub API transient 5xx or secondary rate limit | Return `error`, include correlation metadata, and require rerun. |
| Reviewer already requested/approved | Do not re-request; keep behavior idempotent. |
| Escalation already present | Do not duplicate escalation comment. |

## Versioning and Compatibility

- Policy artifact version is `policy_version` in `pr-readiness-policy-spec.json`.
- App validator must include supported policy versions and reject unknown major versions.
- Any breaking contract change requires:
  1. policy major version bump,
  2. corresponding reusable workflow release entry,
  3. migration note for app validator rollout.
- Version 2 changes unavailable scanning and incomplete required gates to fail-closed outcomes.
  Before rollout, the app validator must support version 2 and preserve these outcomes;
  maintainers and the app team must review the change, publish a reviewed immutable
  workflow release, and update consumer pins through separate protected-branch PRs.
  Verify real PR, review, fork, permission-denied, and vulnerability scenarios before adoption.
  The GHAS gate requires successful current merge analyses for every configured
  required scan category; absent categories fail closed. It also selects the
  newest analysis within each tool/category/analysis-key/environment configuration,
  so superseded reruns do not remain blocked by historical failures.
  Review scan coverage and sequencing before rollout; if readiness runs before
  scanning finishes, rerun it after the scan completes. Fork `pull_request`
  callers may not receive the app secrets; validate a trusted caller and its
  permissions without executing fork code before adopting this workflow.

## Acceptance Test Reference

App-repo implementation should validate behavior against:
- `docs/standards/governance-enforcement-acceptance-tests.md`
