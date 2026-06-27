# Workflow Pack Operating Model (Lane G / P2)

This operating model defines ownership, release rhythm, compatibility policy, and reliability/governance objectives for GitHub workflow-pack adoption.

## Scope

Applies to workflow-pack artifacts shipped from `AgentCraftworks/.github`, including reusable workflows, onboarding templates, and policy baselines consumed by downstream repositories.

## Role model

| Role | Primary accountability |
| --- | --- |
| `release-manager` | Release planning, release go/no-go, communications, rollback authorization |
| `compliance` | Governance policy definition, evidence review, exceptions, control sign-off |
| `platform-owner` | Implementation ownership, compatibility guarantees, telemetry accuracy |
| `on-call` | Incident command for reliability failures, mitigation execution, status updates |
| `repo-owner` | Consumer-side rollout, remediation in target repositories, escalation feedback |

## RACI

| Activity | release-manager | compliance | platform-owner | on-call | repo-owner |
| --- | --- | --- | --- | --- | --- |
| Define release scope and cutline | A/R | C | C | I | I |
| Publish release manifest and pinned SHA updates | A | I | R | I | C |
| Validate governance controls (pinning, permissions, required checks) | C | A/R | R | I | C |
| Approve compatibility/deprecation notices | A | R | C | I | I |
| Monitor SLI/SLO dashboards | A | C | R | R | I |
| Lead incident triage and mitigation | I | C | C | A/R | I |
| Execute consumer remediation rollout | I | C | C | I | A/R |
| Run post-incident review and CAPA tracking | A | R | R | C | I |

Legend: **R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed.

## Release cadence

1. **Standard cadence**: Weekly release train for `MINOR`/`PATCH` updates.
2. **Breaking changes** (`MAJOR`): Monthly window only, with migration notes and explicit approval from release-manager + compliance.
3. **Emergency hotfixes**: Out-of-band; require incident reference, release-manager approval, and post-release compliance review within one business day.

## Release gates (must pass before publish)

1. Workflow changes merged and validated in CI.
2. Immutable commit SHA captured and entered in `docs/standards/reusable-workflow-releases.md`.
3. Compatibility classification confirmed (`MAJOR`/`MINOR`/`PATCH`) with migration impact statement.
4. Governance checks validated (permissions least-privilege, immutable `uses:` references where required).
5. Release communication prepared (summary, consumer impact, rollout guidance).

## Compatibility policy

1. **Versioning**: Follows `docs/standards/reusable-workflow-semver-governance.md`.
2. **Consumer pinning**: Required paths must pin immutable SHAs; mutable refs are non-compliant for production-required checks.
3. **Support window**: Current release (`N`) and previous release (`N-1`) are supported; `N-2` and older require exception approval from compliance.
4. **Deprecation notice**: Minimum two release cycles before removal of non-emergency behavior.
5. **Exception path**: Repositories unable to adopt required compatibility updates must file a compliance exception with remediation ETA.

## SLI/SLO set

### 1) Workflow payload reliability

| Metric | SLI definition | SLO target | Measurement window | Alert trigger |
| --- | --- | --- | --- | --- |
| Onboarding payload success rate | % of onboarding runs that create/update the expected PR payload without manual patching | >= 99.5% | Rolling 30 days | < 99.0% in rolling 7 days |
| Idempotent re-run reliability | % of re-runs that avoid duplicate files/PR spam and converge to a single expected state | >= 99.9% | Rolling 30 days | < 99.5% in rolling 7 days |
| Time to payload recovery | Time from reliability incident open to restored successful onboarding payload behavior | <= 4 hours (P1/P2 incidents) | Per incident | > 4 hours without approved exception |

### 2) Governance correctness

| Metric | SLI definition | SLO target | Measurement window | Alert trigger |
| --- | --- | --- | --- | --- |
| Policy-conformant onboarding payloads | % of generated payloads that meet required governance controls (immutable pinning, required permissions, policy file completeness) | >= 99.8% | Rolling 30 days | < 99.5% in rolling 7 days |
| Non-compliant repo exposure | % of actively managed repos failing required governance checks after onboarding grace period | <= 1.0% | Weekly | > 2.0% in any weekly report |
| Exception closure timeliness | % of approved governance exceptions closed by committed remediation date | >= 95% | Monthly | < 90% monthly |

## Operating rhythm

1. **Daily**: On-call and platform-owner review reliability signal changes and open incidents.
2. **Weekly**: Release-manager reviews SLI trend + release readiness, then publishes release/no-release decision.
3. **Bi-weekly**: Compliance reviews governance correctness, exceptions, and remediation aging.
4. **Monthly**: Joint operating review (release-manager, compliance, platform-owner) confirms policy fit and backlog priorities.

## Required records

- Release decision log (version, SHA, compatibility classification, approvers)
- Weekly SLI report (reliability + governance correctness)
- Exception register (owner, risk, expiration, remediation date)
- Incident postmortems with corrective/preventive actions (CAPA)

## References

- `docs/standards/reusable-workflow-semver-governance.md`
- `docs/standards/reusable-workflow-releases.md`
- `docs/operations/workflow-pack-incident-runbook.md`
