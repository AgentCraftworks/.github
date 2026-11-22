# .github
AgentCraftworks .github repo

## Enterprise PR Readiness

This repo now provides:

- Reusable workflow: `.github/workflows/acw-pr-readiness-reusable.yml`
- Workflow template: `.github/workflow-templates/acw-pr-readiness.yml`
- Operating model (release/compliance operations): `docs/operations/workflow-pack-operating-model.md`
- Incident runbook (workflow payload reliability/governance): `docs/operations/workflow-pack-incident-runbook.md`

To onboard a repository, add the template workflow (or call the reusable workflow directly) and then enforce it with branch/ruleset required checks on `staging` and `main`.

Policy and contract artifacts for governance automation:

- `docs/standards/pr-readiness-policy-spec.json`
- `docs/standards/governance-enforcement-contract.md`
- `docs/standards/governance-enforcement-acceptance-tests.md`

### Draft-first PR hardening flow

AgentCraftworks PR hardening is now draft-first by default:

1. Open PRs as **Draft** (or they are auto-converted to Draft on open).
2. Resolve pre-human checks in Draft (`Analyze`, `CodeQL`, GHAS=0, dependency review, unresolved thread gate, rubber duck review feedback).
3. Mark **Ready for review** only after draft checks are green.
4. Human approver + final review policy gates apply on ready PRs targeting enforced branches (`staging`, `main`).

### Privilege-domain split for PR readiness

PR readiness now runs in two domains:

1. **Read-only analysis path (`pull_request`)** via `ACW-pr-readiness` for required gates (`required-human-approval`, `ghas-gate`, `dependency-review-gate`, unresolved thread gate) using read-only `GITHUB_TOKEN`.
2. **Privileged mutation path (`pull_request_target`)** via `ACW-pr-readiness-privileged` for reviewer requests and escalation label/comment reconciliation using GitHub App credentials.

This split prevents privileged secrets from being required in PR-head execution contexts and keeps write operations in a no-checkout privileged path.
