# .github
AgentCraftworks .github repo

## Enterprise PR Readiness

This repo now provides:

- Reusable workflow: `.github/workflows/acw-pr-readiness-reusable.yml`
- Workflow template: `.github/workflow-templates/acw-pr-readiness.yml`
- Operating model (release/compliance operations): `docs/operations/workflow-pack-operating-model.md`
- Incident runbook (workflow payload reliability/governance): `docs/operations/workflow-pack-incident-runbook.md`

To onboard a repository, add the template workflow (or call the reusable workflow directly) and then enforce it with branch/ruleset required checks on `staging` and `main`.

### Reusable readiness invocation and decision lifecycle

Every invocation requires a positive integer `pull_number` identifying an existing PR
in the caller repository. Both security gates evaluate that explicit PR, regardless of
the caller event (`pull_request`, `pull_request_target`, review events, or non-PR
events such as `workflow_dispatch`). There is no non-PR/no-target success mode:
invalid or nonexistent PR inputs fail explicitly. GHAS permission/unavailability
errors fail rather than reporting an empty successful scan. A valid alert query with
zero results passes; it does not attest that all external scan producers have finished.
Dependency review checks out the trusted PR base SHA without persisting credentials;
the untrusted head SHA is used only as dependency-comparison data.

Readiness failures may add `needs-human-decision`, but passing readiness never clears
it. Only the product-side decision reconciler may clear that durable marker after
verifying resolution evidence. The separate `copilot-review/needs-human-decision`
required check enforces unresolved decisions; the shared escalation job is not a
replacement for that check. `enforced_base_branches` still controls routine human
approval and does not imply a routine approval requirement on integration branches.

Run the focused regression tests with `node --test tests/pr-readiness.test.mjs`.

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
