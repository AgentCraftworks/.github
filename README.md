# .github
AgentCraftworks .github repo

## Enterprise PR Readiness

This repo now provides:

- Reusable workflow: `.github/workflows/acw-pr-readiness-reusable.yml`
- Workflow template: `.github/workflow-templates/acw-pr-readiness.yml`
- Operating model (release/compliance operations): `docs/operations/workflow-pack-operating-model.md`
- Incident runbook (workflow payload reliability/governance): `docs/operations/workflow-pack-incident-runbook.md`

To onboard a repository, add the template workflow (or call the reusable workflow directly) and then enforce it with branch/ruleset required checks on `staging` and `main`.
