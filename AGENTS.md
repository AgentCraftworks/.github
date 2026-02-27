# AGENTS.md — AgentCraftworks Organization

> This file follows the [AGENTS.md](https://agents.md/) open standard (Linux Foundation / Agentic AI Foundation).
> It is read by 25+ coding agent tools including Claude Code, GitHub Copilot, Gemini CLI, Cursor, Windsurf, Devin, OpenAI Codex, and more.
>
> **Scope**: These are organization-wide standards that apply to ALL AgentCraftworks repositories.
> Individual repos may extend these with repo-specific instructions in their own `AGENTS.md`.

## Organization Overview

AgentCraftworks is a GitHub App platform that automates software development workflows using intelligent AI agents. The platform uses a 5-level engagement model, 4-state handoff FSM, CODEOWNERS-based routing, and the Model Context Protocol (MCP).

## Security Requirements for Workflows & Authentication

> **MANDATORY — all agents must follow these rules when creating or modifying GitHub Actions workflows, authentication, or infrastructure code.**

### Authentication Hierarchy (most secure → least)

| Priority | Method | Use Case | Required |
|----------|--------|----------|----------|
| 1 | **OIDC Federated Credentials** | Azure login in GitHub Actions | ✅ Always |
| 2 | **GitHub App Token** (`actions/create-github-app-token@v1`) | T3+ agent workflows that write (branches, commits, PRs) | ✅ For T3+ |
| 3 | **`GITHUB_TOKEN`** (automatic) | T1-T2 agent workflows (read, comment) | ✅ For T1-T2 |

### Prohibited Practices

- ❌ **Never use Personal Access Tokens (PATs)** — use GitHub App Tokens instead
- ❌ **Never store Azure credentials as secrets** — use OIDC federated credentials (`id-token: write`)
- ❌ **Never use `secrets.GITHUB_TOKEN` for T3+ agents** — use `actions/create-github-app-token` instead (commits from `GITHUB_TOKEN` don't trigger downstream workflows)
- ❌ **Never create workflows without a `permissions:` block** — always declare least-privilege permissions
- ❌ **Never hardcode secrets, tokens, or credentials** in workflow files or source code
- ❌ **Never commit `.env` files** — use `.env.example` templates only

### GitHub App Token Pattern (required for T3+ agents)

```yaml
steps:
  - name: Generate GitHub App Token
    id: app-token
    uses: actions/create-github-app-token@v1
    with:
      app-id: ${{ secrets.GH_APP_ID }}
      private-key: ${{ secrets.GH_APP_PRIVATE_KEY }}

  - name: Checkout with App Token
    uses: actions/checkout@v6
    with:
      token: ${{ steps.app-token.outputs.token }}

  - name: Run agent job
    env:
      GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
    run: npx tsx src/jobs/your-job.ts
```

### Azure OIDC Pattern (required for all Azure deployments)

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - name: Azure Login (OIDC)
    uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### Workflow Requirements Checklist

When creating or modifying any `.github/workflows/*.yml` file:

- [ ] `permissions:` block is present with least-privilege scopes
- [ ] No PATs — use GitHub App Token or `GITHUB_TOKEN`
- [ ] Azure auth uses OIDC (no `AZURE_CREDENTIALS` secret)
- [ ] Deploy workflows specify `environment:` for protection rules
- [ ] `actions/checkout` uses `@v6` (not older versions)
- [ ] Agent engagement level (T1-T5) is documented in workflow header comment

### Security Guidelines

- **HMAC Verification**: All webhooks must be HMAC-SHA256 verified before processing
- **Managed Identities**: Use managed identity when deployed to Azure (no stored credentials)
- **Correlation IDs**: All logs must include correlation ID for tracing across Azure Monitor
- **Never commit secrets**: Use `.env` file (not in git) or environment-scoped secrets in CI/CD

## Agent Engagement Levels (1-5)

Graduated permission control for AI agents:

| Level | Name | Action Tier | Permitted Actions |
|-------|------|-------------|-------------------|
| 1 | Observer | T1 | Read, view, list |
| 2 | Advisor | T2 | Comment, suggest |
| 3 | Peer Programmer | T3 | Label, assign, approve, edit file |
| 4 | Agent Team | T4 | Merge, close, create branch, push commit |
| 5 | Full Agent Team | T5 | Deploy, modify CI, orchestrate agents |

### Environment Caps

| Environment | Max Level | Max Name |
|------------|-----------|----------|
| local | 5 | Full Agent Team |
| dev | 5 | Full Agent Team |
| staging | 4 | Agent Team |
| production | 3 | Peer Programmer |

## Coding Agent Orchestration (4-Tier)

AgentCraftworks uses a 4-tier environment orchestration for agent deployment:

- **Local**: `@code-reviewer` (fast iteration)
- **Dev**: `@code-reviewer`, `@test-specialist`, `@documentation-expert` + specialists
- **Staging**: Core + `@security-specialist` (blocking), `@compliance-auditor` (blocking), `@performance-optimizer`, `@refactoring-expert`
- **Production**: All agents (blocking); requires approvals from `@release-manager`, `@security-auditor`, `@compliance-auditor`; deployment monitoring by `@production-observer`

### Environment Strategy for CI/CD

- Feature branches → CI only (build + test)
- `staging` branch → Deploy to staging Azure environment
- `main` branch → Deploy to production Azure environment
- Infrastructure provisioning → `deploy-azd.yml` (manual trigger with environment selection)

## Architecture Patterns & Practices

**Before implementing ANY pattern covered by a standard, you MUST read the relevant document in `ArchitecturePatternsPractices/` (if present in the repo).** These are **LOCKED** standards. Do not deviate without creating an Architecture Decision Record (ADR).

| Standard | Path | When to Consult |
|----------|------|----------------|
| Circuit Breaker | `resilience/CIRCUIT_BREAKER.md` | Adding retry logic, fault tolerance, or external service calls |
| Hashing Standard | `data/HASHING_STANDARD.md` | Any JSON/CLR numeric comparison or EF Core `ValueComparer` work |
| Migration Conventions | `data/MIGRATION_CONVENTIONS.md` | Creating or modifying DB migrations |
| Handoff State Machine | `agent-specific/HANDOFF_STATE_MACHINE.md` | Any handoff state transition or FSM changes |
| Engagement Level Governance | `agent-specific/ENGAGEMENT_LEVEL_GOVERNANCE.md` | Any engagement level, action tier, or permission check code |

### Rules

1. **Read before writing**: Each standard documents anti-patterns. Do NOT repeat them.
2. **Verification checklists**: Each standard has one. Validate your implementation before submitting.
3. **ADR for deviations**: To deviate from a LOCKED standard, create an ADR using the template.
4. **New standards**: Use the `TEMPLATE.md` for new standard proposals.

## GitHub API Rate Limit Management

**The authenticated GitHub API has a 5,000 request/hour limit per user token.** Agents performing code audits, file reads, or bulk operations can exhaust this quickly.

### Use Git Trees API for bulk file operations

```bash
# ONE request to get the full file tree (up to 100K entries)
gh api repos/OWNER/REPO/git/trees/main?recursive=1 --jq '.tree[] | select(.type=="blob") | .path'
```

### Rate limit rules for agents

1. **Check before heavy operations**: Before any operation that will make >50 API calls:
   ```bash
   gh api rate_limit --jq '.resources.core | "\(.remaining)/\(.limit) remaining, resets \(.reset | todate)"'
   ```
2. **Batch reads via Trees API**: Use `git/trees/{sha}?recursive=1` (1 request) instead of `contents/{path}` per file.
3. **Cache SHAs across operations**: If you read a file's SHA in one step, reuse it.
4. **Pace bulk writes**: For >10 writes, use the Git Data API to create a single commit with multiple file changes (4 requests for N files).
5. **If you hit 403 rate limit**: Stop immediately. Check `gh api rate_limit` for reset time. Report to the user and pause.

### API call cost reference

| Operation | Requests | Better Alternative |
|-----------|----------|-------------------|
| List all files in repo | 1 per directory | `git/trees/main?recursive=1` (1 total) |
| Read 20 files | 20 | Clone locally if available |
| Create 5 files + 1 commit each | 5 | Git Data API: blob+tree+commit+ref (4 total) |
| Check rate limit | 1 | Free (doesn't count against limit) |

## Best Practices for AI-Assisted Development

### 1. Git Worktrees for Parallel Development

Use git worktrees to run 3-5 parallel agent sessions:

```bash
git worktree add ../MyRepo-security feature/security-hardening
git worktree add ../MyRepo-docs feature/documentation-update
```

**Benefits**: 3-5x productivity, zero context switching, independent environments.

### 2. Plan Mode for Verification

Switch to plan mode when things go sideways:
- Unexpected test failures
- Build errors after changes
- Cascading fixes
- Unclear requirements

### 3. Subagent Orchestration

Delegate to specialized subagents to keep context clean:

```javascript
task({
  agent_type: "security-specialist",
  description: "Security review",
  prompt: "Review OAuth for vulnerabilities..."
})
```

### 4. Voice Dictation

Speak prompts (3x faster than typing):
- macOS: Fn key twice
- Windows: Windows + H
- 150-200 words/min speaking vs 40-60 typing

### 5. Self-Learning Rules

After every correction, update agent instruction files so agents don't repeat mistakes:

```markdown
## Rule: Always Use Absolute Paths
**Mistake**: Using `./src/index.js`
**Fix**: Use full absolute paths
**Reasoning**: Tools require absolute paths in CI/CD
```

## Coding Conventions

### General

- **Env vars**: `GH_*` prefix (NOT `GITHUB_*` which is reserved by GitHub Actions)
- **GitHub API**: Use `octokit.request()`, NOT `.rest.*` methods (Octokit v16+)
- **Types**: Use `unknown` over `any`, strict null checks enabled
- **Error Handling**: Graceful try/catch; structured error logging with context
- **Logging**: Structured `{ msg, key: value }` pattern
- **Comments**: Explain "why", not "what"; use JSDoc for public functions
- **Async**: Always use async/await for I/O

### TypeScript-Specific

- **Runtime**: Node.js 22+ with ES Modules
- **Build**: esbuild for compilation, `tsc --noEmit` for type checking
- **Testing**: `node --import tsx --test test/**/*.test.ts`

## Contributing Standards

1. Create feature branch: `feat/*` or `feature/*`
2. Use git worktrees for parallel development (see best practices)
3. Open PR with agent labels for review routing
4. Address feedback from assigned agents
5. Update agent instruction files if you discover new lessons
6. Merge after approval and CI passes
7. Delete feature branch and worktree

## Always Ask First

Before making significant changes:
- "Should I create a Git branch for this work?"
- "Should I use a git worktree for parallel development?"
- "Do we need security-specialist review for this change?"
- "Which environment (dev/staging/prod) does this target?"
- "Should I update deployment or status documentation?"
- "Should I update agent instruction files with this lesson?"

---

**Maintained By**: AgentCraftworks Organization
**Standard Version**: 2.0
