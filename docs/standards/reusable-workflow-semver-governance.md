# Reusable Workflow SemVer Governance

This standard defines how AgentCraftworks publishes and consumes reusable GitHub workflows.

## Scope

This policy applies to reusable workflows published from `AgentCraftworks/.github` and consumed by templates or repository workflows.

## Versioning Policy (SemVer)

Reusable workflows use semantic versioning:

- **MAJOR (`vX.0.0`)**: Breaking behavior, contract, required inputs, default permissions, or required runner/tooling changes.
- **MINOR (`vX.Y.0`)**: Backward-compatible enhancements (new optional inputs, checks, observability).
- **PATCH (`vX.Y.Z`)**: Backward-compatible fixes only (bugs, reliability, docs, typo/config fixes with no contract changes).

## Release Process

1. Merge release-ready workflow changes into the release branch.
2. Capture the immutable commit SHA for the released workflow definition.
3. Create/update a SemVer tag (`vX.Y.Z`) that points to that release commit.
4. Publish the release entry in `docs/standards/reusable-workflow-releases.md` with workflow name, version, SHA, and date.
5. Announce the release for consumer adoption.

## Consumer Policy

- **Required policy**: Consumers must pin reusable workflow `uses:` references to an immutable commit SHA.
- Consumers must not pin required production paths to mutable refs such as `@main`.
- Version bumps must be delivered through controlled PRs that update:
  - The pinned SHA in templates/workflows.
  - The referenced SemVer version in PR description/changelog.
  - Any required migration notes.

## Canary Strategy

Canary testing may use mutable refs only in explicitly non-required paths:

- Optional or informational checks.
- Non-blocking jobs (`continue-on-error: true`) or separate canary workflows.
- Canary paths must never gate merge protection or production-required policy checks.

## Enforcement

- Required workflow templates in this repository must always pin immutable SHAs.
- Release manifest entries must exist before rollout PRs merge.
- Any move to a new release SHA requires a reviewed PR.
- Policy constants and escalation conventions are source-controlled in:
  - `docs/standards/pr-readiness-policy-spec.json`
  - `docs/standards/governance-enforcement-contract.md`

## Draft-First PR Readiness Protocol

- PR intake should be Draft-first so non-human gates run before reviewer handoff.
- `acw-rubber-duck-review` executes in Draft state and is suppressed after first posted review marker.
- `ACW-pr-readiness` enforces technical/security gates during Draft and defers human-approval enforcement until `ready_for_review`.
- Repositories should transition to Ready only after Draft checks are green (Analyze, CodeQL, GHAS gate, dependency-review gate, unresolved-thread gate).
