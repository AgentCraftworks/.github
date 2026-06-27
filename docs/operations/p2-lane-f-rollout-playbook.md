# P2 Lane F Rollout Playbook (Canary + Staged)

> **DRI** (Directly Responsible Individual): the single named person accountable for a phase decision, metric review, or rollout action. Each table row and reporting cadence entry identifies the DRI.

> **Traceability note:** This document is a Lane F deliverable tracked under Issue #20 ("P2 Lane G: Establish operating model for release cadence, ownership, and incident response"). Lane F (Rollout) and Lane G (Operating Model) are sibling work streams under P2; this playbook satisfies the Lane F rollout artifact scope within that issue.

## Purpose and Scope

This playbook defines how AgentCraftworks rolls out workflow-pack and GitHub App changes safely using canary and staged cohorts. It is written for the current state where workflow telemetry in `AgentCraftworks/.github` is authoritative, while app control-plane rollout controls in `AgentCraftworks/AgentCraftworks` are partially available and treated as conditional.

Terminology: **DRI** = Directly Responsible Individual.
This playbook covers:

- Cohort selection
- Stage thresholds and promotion criteria
- Rollback triggers
- Telemetry metrics and data sources
- Reporting cadence
- Go/no-go criteria

Use with:

- `docs/standards/reusable-workflow-semver-governance.md`
- `docs/standards/reusable-workflow-releases.md`
- `docs/operations/templates/p2-rollout-operational-checklist.md`

## Current Control Surfaces in This Repo

| Surface | Workflow | Primary Signals | Operational Use in Rollout |
| --- | --- | --- | --- |
| Feature branch pre-PR quality | `.github/workflows/acw-branch-quality.yml` | YAML lint status, secret scan findings, dependency review pre-check | Early quality and noise detection before PR-based gates |
| Draft PR quality loop | `.github/workflows/acw-rubber-duck-review.yml` | One-time review posted, token usage, model response behavior | Detect review quality drift and automation noise |
| Protected branch PR gate wrapper | `.github/workflows/acw-pr-readiness.yml` | Required check pass/fail on `staging`/`main` paths | Merge gating health and branch protection confidence |
| Reusable PR readiness gates | `.github/workflows/acw-pr-readiness-reusable.yml` | Required human approval gate, unresolved thread gate, GHAS gate, dependency gate, escalation label behavior | Core policy correctness, failure mode analysis, escalation fidelity |

## AgentCraftworks App Control-Plane Assumptions (Partial Readiness Baseline)

1. Workflow run outcomes and PR metadata are the source of truth for rollout decisions in this phase.
2. App control-plane feature flags/cohort routing are treated as planned controls; if unavailable, rollout is executed by workflow reference selection (SHA pin updates and controlled PR waves).
3. App telemetry may be incomplete for all intended SLIs; missing app-side metrics are explicitly marked as non-blocking informational until implemented.
4. Incident command, approvals, and rollback authority remain human-owned with automation assist.

## Cohort Selection Model

### Cohort Types

1. **Canary cohort**: smallest blast radius repositories, low external dependency risk, high maintainer responsiveness.
2. **Pilot cohort**: broader mix of repositories with representative workload diversity.
3. **General cohort**: remaining repositories after pilot criteria pass.

### Repository Eligibility Criteria

- Has required branch protection and required checks configured for `staging` and `main`.
- Uses immutable SHA-pinned reusable workflow references.
- Has at least one active maintainer and defined escalation contact.
- No open Sev1/Sev2 incidents related to workflow reliability at rollout start.

### Default Cohort Sizing Guidance

- Canary: 5-10% of targeted repositories, minimum 2.
- Pilot: expand to 25-40%.
- General: expand to 100% after pilot exit criteria are met.

Adjust cohort size down when incident load is elevated or when control-plane assumptions change.

## Staged Rollout Phases and Thresholds

| Phase | Entry Gate | Promotion Thresholds | Max Duration Without Decision | Exit Action |
| --- | --- | --- | --- | --- |
| Phase 0: Preflight | Checklist complete, release manifest updated with immutable SHA, owners assigned | N/A | 1 business day | Enter Canary or stop |
| Phase 1: Canary | Canary cohort enabled | Required-gate success rate >= 98%; false-positive gate failure rate <= 2%; no Sev1 incidents; <= 1 Sev2 attributable incident | 2 business days | Promote to Pilot or rollback |
| Phase 2: Pilot | Canary thresholds met and signed off | Required-gate success rate >= 99%; median time-to-escalation label <= 10 min; no unresolved critical regression > 4 hours | 3 business days | Promote to General or rollback |
| Phase 3: General | Pilot thresholds met and signed off | Stable metrics for one reporting cycle; no open Sev1/Sev2 attributable incidents | 1 reporting cycle | Declare rollout complete |

## Metric Notes

- **Required-gate success rate** excludes expected policy failures from intentionally non-compliant test PRs.
- **False-positive gate failure rate** counts failures reversed by human decision with no code/config change needed.
- **Time-to-escalation label** measures event-to-label latency for `needs-human-decision`.

## Rollback Triggers and Response

### Hard Rollback Triggers (Immediate)

- Any confirmed security policy bypass or GHAS gate regression on required paths.
- Repeated merge-blocking false negatives (policy violation merged without gate failure).
- Automation loop behavior that repeatedly re-requests/re-posts reviews and degrades repo operations.
- Sev1 incident attributable to rollout change.

### Soft Rollback Triggers (Decision Within 30 Minutes)

- False-positive rate exceeds threshold for a full observation window.
- Escalation label not applied when gate failures occur.
- Sustained drop in required-gate success below threshold without clear external cause.

### Rollback Actions

1. Freeze promotions to next phase.
2. Revert to last known-good reusable workflow SHA in consuming paths.
3. Remove or pause canary cohort targets (or disable app-side cohort routing if active).
4. Open incident record and route to on-call owners.
5. Publish rollback status update in rollout report channel.

## Telemetry Metrics and Data Sources

| Metric | Definition | Source | Owner | Blocking for Promotion |
| --- | --- | --- | --- | --- |
| Required gate pass rate | % passing runs for `acw-pr-readiness` required checks | GitHub Actions runs + check suite conclusions | Platform Operations | Yes |
| Human approval compliance | % enforced-branch PRs approved by required reviewer before merge | PR reviews + gate summary output | Release Manager | Yes |
| Unresolved thread gate effectiveness | Count of blocked merges with unresolved active threads | `review-feedback-gate` failures and PR timeline | Documentation/Process Owner | Yes |
| GHAS gate catch rate | Open code-scanning alerts detected per PR before merge | `ghas-gate` summary/failures | Security Owner | Yes |
| Dependency risk blocks | Vulnerability blocks from dependency review gate | `dependency-review-gate` outcomes | Security Owner | Yes |
| Escalation latency | Time from first failing gate to `needs-human-decision` label | PR events + issue labels | Platform Operations | Yes |
| Rubber duck signal quality | Actionable finding ratio and noise ratio in draft PR comments | PR review comments + human override notes | Developer Experience Owner | No (informational in P2) |
| App control-plane telemetry completeness | % required app-side metrics available and queryable | AgentCraftworks app telemetry pipeline | App Control Plane Owner | No (conditional for P2) |

## Reporting Cadence

| Cadence | Audience | Required Content | Owner |
| --- | --- | --- | --- |
| Daily (Canary/Pilot) | Platform Ops + Release + Security | Metric snapshot, incidents, open risks, go/no-go recommendation | Lane F DRI |
| Twice weekly (General rollout window) | Engineering leadership | Trendline, cohort progression, rollback events, readiness to complete | Release Manager |
| Incident-time (ad hoc) | Incident channel + stakeholders | Trigger, blast radius, mitigation, next decision checkpoint | Incident Commander |
| End-of-phase | Program stakeholders | Decision record, threshold evidence, next-phase plan | Lane F DRI |

## Go/No-Go Criteria

### Go

- All phase-specific blocking thresholds are met.
- No open Sev1/Sev2 incidents attributable to rollout change.
- Rollback path validated and documented for current phase.
- Required owners (Platform Ops, Release Manager, Security) sign off.

### No-Go

- Any hard rollback trigger present.
- Blocking metric threshold missed without approved exception.
- Missing evidence for required checks or telemetry integrity.
- Ownership handoff unclear for incident response in next phase.

## Operational Ownership and Escalation

| Function | Primary Role | Backup Role | Escalation Trigger |
| --- | --- | --- | --- |
| Rollout execution | Platform Operations | Release Manager | Threshold miss, promotion decision needed |
| Security gate triage | Security Owner | Compliance Auditor | GHAS/dependency gate regression |
| Policy and process correctness | Release Manager | Documentation Expert | Repeated false positives or ambiguous policy outcomes |
| App control-plane operations | App Control Plane Owner (AgentCraftworks repo) | Platform Operations | App telemetry/control-plane drift impacting rollout decisions |

Escalation label: `needs-human-decision` is the required decision queue marker.

## Artifact Usage

For each phase decision, instantiate:

- `docs/operations/templates/p2-rollout-operational-checklist.md`

Store completed checklist copy in the rollout PR or incident artifact location used by the active release cycle.
