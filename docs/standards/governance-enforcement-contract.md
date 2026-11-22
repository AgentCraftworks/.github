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
  - `.github/workflows/acw-pr-readiness-reusable.yml` (gate evaluation + escalation messaging + marker)
  - `.github/workflows/acw-pr-readiness.yml` (read-only PR analysis path)
  - `.github/workflows/acw-pr-readiness-privileged.yml` (privileged PR mutation path)
- AgentCraftworks app repository enforcement must consume this contract as the source of truth.

## Privileged Execution Boundary (Normative)

- `pull_request` workflows must run required quality/security gates with read-only token scope and without GitHub App private key material.
- Reviewer assignment and escalation mutations (labels/comments/reviewer requests) must run in `pull_request_target` context.
- Privileged jobs must not execute PR head code (no PR-head checkout in privileged path).
- Reusable workflow interfaces may accept `GH_APP_ID` / `GH_APP_PRIVATE_KEY`, but callers should pass those secrets only to privileged invocation paths.

## Inputs (App Repo Contract)

The app validator should accept this minimum payload:

```json
{
  "policy_version": "1.0.0",
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
   - If any required gate result is `fail`, ensure:
     - escalation label matches policy label,
     - escalation comment includes policy marker (`<!-- acw-escalation:v1 -->`),
     - remediation bullets are included per failing gate.
   - If all gates pass, remove escalation label if present.

## Outputs (App Repo Contract)

The app should emit machine-readable output:

```json
{
  "policy_id": "acw-pr-readiness-governance",
  "policy_version": "1.0.0",
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
  - `ghas-gate`: no open code scanning alerts on PR head SHA.
  - `dependency-review-gate`: no moderate+ dependency findings.

## Edge Cases and Failure Modes

| Case | Expected Behavior |
| --- | --- |
| Draft PR | Do not escalate; defer comment/label until ready_for_review. |
| Privileged secret exposure risk | Keep PR analysis in read-only `pull_request`; restrict app-token write mutations to `pull_request_target` without PR-head checkout. |
| Fork PR with restricted issue write | Keep gate result; emit warning on comment failure, do not mask failing status. |
| GHAS unavailable (403/404) | Mark GHAS gate as skipped with explicit reason in summary, not silent pass. |
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

## Acceptance Test Reference

App-repo implementation should validate behavior against:
- `docs/standards/governance-enforcement-acceptance-tests.md`
