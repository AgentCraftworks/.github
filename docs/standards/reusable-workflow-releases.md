# Reusable Workflow Release Manifest

This manifest tracks immutable release mappings for reusable workflows.

| Workflow | Version | Commit SHA | Published |
| --- | --- | --- | --- |
| `acw-pr-readiness-reusable` | `v1.0.0` | `c73707373b824d682aa5f538f82e722cd58437c9` | 2026-06-16 |
| `acw-pr-readiness-reusable` | `v1.0.1` | `REPLACE_WITH_FINAL_RELEASE_SHA_40_HEX` | TBD |

## Release Candidate Finalization Checklist (`acw-pr-readiness-reusable v1.0.1`)

SemVer classification: **PATCH** (stabilization/reliability updates, no contract-breaking input/output or permission model changes).

1. Capture final immutable release commit SHA after Lane A merges.
2. Replace `REPLACE_WITH_FINAL_RELEASE_SHA_40_HEX` in this manifest row with the 40-character commit SHA.
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
+    uses: AgentCraftworks/.github/.github/workflows/acw-pr-readiness-reusable.yml@REPLACE_WITH_FINAL_RELEASE_SHA_40_HEX
```

## Command Checklist (Final SHA Substitution + Validation)

```powershell
# 1) Set final release SHA once known (must be 40 hex chars)
$NEW_SHA = 'REPLACE_WITH_FINAL_RELEASE_SHA_40_HEX'

# 2) Update release manifest placeholder
(Get-Content docs/standards/reusable-workflow-releases.md -Raw).
  Replace('REPLACE_WITH_FINAL_RELEASE_SHA_40_HEX', $NEW_SHA) |
  Set-Content docs/standards/reusable-workflow-releases.md -NoNewline

# 3) Update template consumer pin
(Get-Content .github/workflow-templates/acw-pr-readiness.yml -Raw).
  Replace('c73707373b824d682aa5f538f82e722cd58437c9', $NEW_SHA) |
  Set-Content .github/workflow-templates/acw-pr-readiness.yml -NoNewline

# 4) Confirm all in-repo pin sites are updated
rg "$NEW_SHA|c73707373b824d682aa5f538f82e722cd58437c9|REPLACE_WITH_FINAL_RELEASE_SHA_40_HEX" `
  docs/standards/reusable-workflow-releases.md .github/workflow-templates/acw-pr-readiness.yml

# 5) Verify tag ultimately resolves to the same commit SHA (handles annotated tags)
$ref = gh api repos/AgentCraftworks/.github/git/ref/tags/v1.0.1 | ConvertFrom-Json
if ($ref.object.type -eq 'tag') { gh api repos/AgentCraftworks/.github/git/tags/$($ref.object.sha) --jq '.object.sha' } else { $ref.object.sha }
```
