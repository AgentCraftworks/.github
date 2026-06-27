# .github
AgentCraftworks .github repo

## Enterprise PR Readiness

This repo now provides:

- Reusable workflow: `.github/workflows/acw-pr-readiness-reusable.yml`
- Workflow template: `.github/workflow-templates/acw-pr-readiness.yml`

To onboard a repository, add the template workflow (or call the reusable workflow directly) and then enforce it with branch/ruleset required checks on `staging` and `main`.

Policy and contract artifacts for governance automation:

- `docs/standards/pr-readiness-policy-spec.json`
- `docs/standards/governance-enforcement-contract.md`
- `docs/standards/governance-enforcement-acceptance-tests.md`
