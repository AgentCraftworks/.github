# AgentCraftworks

**Intelligent multi-agent orchestration for GitHub — from PR to production.**

AgentCraftworks is a GitHub App that automates software development workflows using coordinated AI agents. It routes work through CODEOWNERS-based assignment, manages handoffs via a finite state machine, and enforces governance policies — all without leaving GitHub.

## What We Ship

| Capability | Description |
|-----------|-------------|
| **Handoff FSM** | 4-state finite state machine (pending → active → completed/failed) routes work to the right agent at the right time |
| **CODEOWNERS Routing** | Automatically assigns AI agents based on file ownership patterns |
| **MCP Server** | 14+ Model Context Protocol tools for handoff management, autonomy control, and observability |
| **Rate Governor** | 6-pattern adaptive rate limiting — traffic light throttling, shared token pool, predictive circuit breaker, cascade detection, lease cleanup, and priority retry |
| **Squad Coordinator** | Multi-agent orchestration with MCP capability detection, CLI fallback chains, and team configuration |
| **Aspire Integration** | .NET Aspire CLI bridge for distributed tracing, health checks, and observability dashboards |
| **Governance Gates** | Pre/post-execution policy enforcement with graduated promotion (staging → canary → production) |
| **Autonomy Dial** | 5-level engagement system (Observer → Autopilot) with environment-aware caps |

## Repositories

| Repo | Purpose |
|------|---------|
| [`AgentCraftworks`](https://github.com/AgentCraftworks/AgentCraftworks) | Enterprise product — GitHub App, MCP server, Rate Governor, Squad Coordinator |
| [`AgentCraftworks-CE`](https://github.com/AgentCraftworks/AgentCraftworks-CE) | Open-source Community Edition |
| [`AgentCraftworks-VSCode`](https://github.com/AgentCraftworks/AgentCraftworks-VSCode) | VS Code extension for IDE integration |
| [`AgentCraftworks-WebSite`](https://github.com/AgentCraftworks/AgentCraftworks-WebSite) | Marketing website (Next.js 15) |
| [`AgentCraftworks-Hub`](https://github.com/AgentCraftworks/AgentCraftworks-Hub) | Monitoring dashboard — rate limits, Actions billing, Copilot usage |
| [`AgentCraftworks-PlatformOps`](https://github.com/AgentCraftworks/AgentCraftworks-PlatformOps) | CI/CD standards, runner infra, engineering operations |
| [`AgentCraftworks-BizOps`](https://github.com/AgentCraftworks/AgentCraftworks-BizOps) | Marketing analytics and business operations |

## Tech Stack

TypeScript (strict mode) · Express · esbuild · node:test · Azure Bicep · .NET Aspire · GitHub Actions

## Get Started

Install from the [GitHub Marketplace](https://github.com/marketplace/agentcraftworks) or explore the [Community Edition](https://github.com/AgentCraftworks/AgentCraftworks-CE).

---

*Built by [AICraftworks, LLC](https://agentcraftworks.com)*