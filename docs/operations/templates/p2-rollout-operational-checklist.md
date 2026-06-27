# P2 Rollout Operational Checklist Template

> **DRI** (Directly Responsible Individual): the single named person accountable for completing this checklist and signing off on the phase decision.

> Copy this template per phase decision (Preflight, Canary, Pilot, General).
>
> Terminology: **DRI** = Directly Responsible Individual.
## Rollout Context

- Rollout ID:
- Phase:
- Date:
- Change set (workflow SHA / PR / release tag):
- Cohort repositories:
- Rollout DRI:
- Incident Commander (if activated):

## Control-Plane Assumption Mode

- [ ] Partial readiness (workflow telemetry authoritative; app controls conditional)
- [ ] Full readiness (app control-plane telemetry and gating active)
- App control-plane notes:

## Pre-Phase Entry Checklist

- [ ] Release manifest updated (`docs/standards/reusable-workflow-releases.md`) with immutable SHA.
- [ ] Reusable workflow refs remain immutable SHA pinned (no mutable refs in required paths).
- [ ] Required checks configured on `staging`/`main` for target repos.
- [ ] Rollback commit/PR path prepared and validated.
- [ ] Owners and escalation contacts confirmed.
- [ ] Reporting channel and cadence scheduled.

## Cohort Validation

- [ ] Cohort meets eligibility criteria (branch protection, maintainer coverage, risk profile).
- [ ] Cohort size matches phase policy.
- [ ] High-risk repositories explicitly excluded or approved with mitigation.
- Notes:

## Telemetry Snapshot (Entry)

| Metric | Threshold | Current | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Required gate pass rate |  |  |  |  |
| False-positive gate failure rate |  |  |  |  |
| Escalation latency (`needs-human-decision`) |  |  |  |  |
| GHAS gate catch rate |  |  |  |  |
| Dependency risk blocks |  |  |  |  |
| App telemetry completeness (informational in partial mode) |  |  |  |  |

## In-Phase Monitoring Checklist

- [ ] Daily metric refresh completed.
- [ ] New failing-gate patterns triaged within SLA.
- [ ] Escalation labels applied for unresolved human decisions.
- [ ] Incident log updated for any Sev1/Sev2 event.
- [ ] Security/compliance review engaged for policy regressions.
- Observations:

## Rollback Decision Check

### Hard Trigger Check

- [ ] Security policy bypass detected
- [ ] Merge-blocking false negative detected
- [ ] Automation loop behavior degrading operations
- [ ] Sev1 attributable incident active

### Soft Trigger Check

- [ ] False-positive rate above threshold window
- [ ] Escalation labeling failed on gate failures
- [ ] Required-gate success below threshold without external cause

Decision:

- [ ] Continue current phase
- [ ] Promote to next phase
- [ ] Roll back to last known-good SHA

Rollback actions executed (if applicable):

1.
2.
3.

## Go/No-Go Sign-Off

| Role | Name | Decision (Go/No-Go) | Timestamp | Notes |
| --- | --- | --- | --- | --- |
| Platform Operations |  |  |  |  |
| Release Manager |  |  |  |  |
| Security Owner |  |  |  |  |
| App Control Plane Owner (if applicable) |  |  |  |  |

## Phase Exit Summary

- Outcome:
- Key metrics at exit:
- Incidents during phase:
- Open risks carried forward:
- Next checkpoint date:
