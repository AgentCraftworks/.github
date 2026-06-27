# Reusable Workflow Release Manifest

This manifest tracks immutable release mappings for reusable workflows.

| Workflow | Version | Commit SHA | Published |
| --- | --- | --- | --- |
| `acw-pr-readiness-reusable` | `v1.0.0` | `c73707373b824d682aa5f538f82e722cd58437c9` | 2026-06-16 |
| `acw-pr-readiness-reusable` | `v1.0.1` | `d325d9e46b0d6d320c9c2ed9a43f6081f2429189` | 2026-06-26 |

## Release Candidate Finalization Checklist (`acw-pr-readiness-reusable v1.0.1`)

SemVer classification: **PATCH** (stabilization/reliability updates, no contract-breaking input/output or permission model changes).

1. Capture final immutable release commit SHA after Lane A merges.
2. Record the final immutable 40-character release commit SHA in this manifest row.
3. Create/move tag `v1.0.1` to that exact release commit SHA.
4. Update all in-repo consumer SHA pins to the same commit SHA:
   - `.github/workflow-templates/acw-pr-readiness.yml` (`jobs.pr-readiness.uses`)
   - No other in-repo `AgentCraftworks/.github/.github/workflows/acw-pr-readiness-reusable.yml@<sha>` pins currently exist.
5. Open/merge the rollout PR documenting:
   - SemVer bump: `v1.0.0` -> `v1.0.1`
   - Updated immutable SHA pin(s)
   - Migration notes (if any; expected none for patch release)

## Required In-Repo Consumer Edit (Ready-to-Apply Patch)

```diff
diff --git a/.github/workflow-templates/acw-pr-readiness.yml b/.github/workflow-templates/acw-pr-readiness.yml
@@
-    uses: AgentCraftworks/.github/.github/workflows/acw-pr-readiness-reusable.yml@c73707373b824d682aa5f538f82e722cd58437c9
+    uses: AgentCraftworks/.github/.github/workflows/acw-pr-readiness-reusable.yml@d325d9e46b0d6d320c9c2ed9a43f6081f2429189
```

## Command Checklist (Final SHA Substitution + Validation)

```powershell
# 1) Set final release SHA once known (must be 40 hex chars)
$NEW_SHA = 'd325d9e46b0d6d320c9c2ed9a43f6081f2429189'
$OLD_SHA = 'd325d9e46b0d6d320c9c2ed9a43f6081f2429189'

# 2) Update (or confirm) the release manifest entry for v1.0.1
(Get-Content docs/standards/reusable-workflow-releases.md -Raw).
  Replace($OLD_SHA, $NEW_SHA) |
  Set-Content docs/standards/reusable-workflow-releases.md -NoNewline

# 3) Update template consumer pin
(Get-Content .github/workflow-templates/acw-pr-readiness.yml -Raw).
  Replace('c73707373b824d682aa5f538f82e722cd58437c9', $NEW_SHA) |
  Set-Content .github/workflow-templates/acw-pr-readiness.yml -NoNewline

# 4) Confirm all in-repo pin sites are updated
rg "$NEW_SHA|$OLD_SHA|c73707373b824d682aa5f538f82e722cd58437c9" `
  docs/standards/reusable-workflow-releases.md .github/workflow-templates/acw-pr-readiness.yml

# 5) Verify tag ultimately resolves to the same commit SHA (handles annotated tags)
$ref = gh api repos/AgentCraftworks/.github/git/ref/tags/v1.0.1 | ConvertFrom-Json
if ($ref.object.type -eq 'tag') { gh api repos/AgentCraftworks/.github/git/tags/$($ref.object.sha) --jq '.object.sha' } else { $ref.object.sha }
```
