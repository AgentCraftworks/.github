import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/acw-pr-readiness-reusable.yml", import.meta.url),
  "utf8",
);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function job(id) {
  const match = workflow.match(new RegExp(`^  ${id}:\\n([\\s\\S]*?)(?=^  [a-z0-9-]+:|$(?![\\s\\S]))`, "m"));
  assert.ok(match, `Missing job ${id}`);
  return match[1];
}

async function run(id, {
  event = "pull_request",
  pullNumber = 41,
  payload = {},
  results = {},
  draft = false,
  apiError,
  scanError,
  alerts = [],
  reviews = [],
  base = { sha: "trusted-base-sha", ref: "integration/v1" },
  head = { sha: "untrusted-head-sha" },
  decisionLabel = false,
} = {}) {
  const requests = [];
  const failures = [];
  const outputs = {};
  const labels = new Set(decisionLabel ? ["needs-human-decision"] : []);
  const summary = {
    addHeading() { return this; },
    addRaw() { return this; },
    async write() {},
  };
  const core = {
    setFailed(message) { failures.push(message); },
    setOutput(key, value) { outputs[key] = value; },
    info() {},
    notice() {},
    warning() {},
    summary,
  };
  const github = {
    async request(route, params) {
      requests.push({ route, params });
      if (route === "GET /repos/{owner}/{repo}/pulls/{pull_number}") {
        if (apiError) throw apiError;
        return { data: { number: pullNumber, draft, base, head } };
      }
      if (route === "POST /repos/{owner}/{repo}/issues/{issue_number}/labels") {
        for (const label of params.labels) labels.add(label);
        return { data: {} };
      }
      if (route === "POST /repos/{owner}/{repo}/issues/{issue_number}/comments") {
        return { data: {} };
      }
      throw new Error(`Unexpected request: ${route}`);
    },
    async paginate(route, params) {
      requests.push({ route, params });
      if (route === "GET /repos/{owner}/{repo}/code-scanning/alerts") {
        if (scanError) throw scanError;
        return alerts;
      }
      if (route === "GET /repos/{owner}/{repo}/issues/{issue_number}/comments") return [];
      if (route === "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews") return reviews;
      throw new Error(`Unexpected pagination: ${route}`);
    },
  };
  const inputs = {
    pull_number: pullNumber,
    escalation_label: "needs-human-decision",
    required_human_reviewer: "maintainer",
    enforced_base_branches: "staging,main",
  };
  // Execute the actual inline workflow script, not a copied implementation.
  const script = job(id).split("          script: |\n")[1]
    .split(/(?=^      - name:)/m)[0]
    .replace(/^ {12}/gm, "")
    .replace(/\$\{\{\s*inputs\.(\w+)\s*\}\}/g, (_, name) => String(inputs[name] ?? ""))
    .replace(/\$\{\{\s*toJson\(needs\)\s*\}\}/g, JSON.stringify(results));
  const context = { eventName: event, repo: { owner: "owner", repo: "repo" }, payload };
  await new AsyncFunction("github", "core", "context", script)(github, core, context);
  return { requests, failures, outputs, labels };
}

for (const event of ["pull_request", "pull_request_target", "pull_request_review", "workflow_dispatch", "push"]) {
  for (const id of ["ghas-gate", "dependency-review-gate"]) {
    test(`${id} evaluates explicit PR input for ${event}`, async () => {
      assert.doesNotMatch(job(id), /^    if:/m, "Caller events must not silently skip a required gate");
      const result = await run(id, { event, payload: { pull_request: { number: 999 } } });
      assert.deepEqual(result.failures, []);
      assert.equal(result.requests[0].params.pull_number, 41, "Explicit input is authoritative");
      if (id === "ghas-gate") {
        assert.equal(result.requests[1].params.ref, "untrusted-head-sha");
      } else {
        assert.deepEqual(result.outputs, { base_ref: "trusted-base-sha", head_ref: "untrusted-head-sha" });
      }
    });
  }
}

for (const id of ["ghas-gate", "dependency-review-gate"]) {
  for (const pullNumber of ["", 0, -1, 1.5, "invalid", "Infinity", 9007199254740992]) {
    test(`${id} explicitly rejects invalid PR input ${JSON.stringify(pullNumber)}`, async () => {
      const result = await run(id, { event: "workflow_dispatch", pullNumber });
      assert.equal(result.failures.length, 1);
      assert.match(result.failures[0], /positive safe integer/);
      assert.deepEqual(result.requests, []);
    });
  }

  test(`${id} fails for a nonexistent PR`, async () => {
    const error = Object.assign(new Error("Pull request not found"), { status: 404 });
    await assert.rejects(run(id, { apiError: error }), (received) => received === error);
  });
}

for (const status of [403, 404]) {
  test(`GHAS ${status} is failure, not a successful empty scan`, async () => {
    const result = await run("ghas-gate", { scanError: { status } });
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0], /GHAS evaluation could not be completed/);
  });
}

test("GHAS unexpected API errors propagate", async () => {
  const error = Object.assign(new Error("Service unavailable"), { status: 503 });
  await assert.rejects(run("ghas-gate", { scanError: error }), (received) => received === error);
});

test("GHAS valid empty results pass and open alerts fail", async () => {
  assert.deepEqual((await run("ghas-gate")).failures, []);
  const result = await run("ghas-gate", { alerts: [{ rule: { id: "unsafe-code" } }] });
  assert.match(result.failures[0], /Open GHAS code scanning alerts found \(1\)/);
});

test("Missing PR head or immutable base SHA fails explicitly", async () => {
  assert.match((await run("ghas-gate", { head: {} })).failures[0], /head commit SHA/);
  for (const options of [{ base: { ref: "staging" } }, { head: {} }]) {
    const result = await run("dependency-review-gate", options);
    assert.match(result.failures[0], /base\/head refs/);
    assert.deepEqual(result.outputs, {});
  }
});

test("Dependency review checks out only trusted base code without persistent credentials", () => {
  const gate = job("dependency-review-gate");
  assert.match(gate, /uses: actions\/checkout@v6\n        with:\n          ref: \$\{\{ steps\.pr-refs\.outputs\.base_ref \}\}\n          persist-credentials: false/);
  assert.doesNotMatch(gate, /^\s+run:|require\(|import\(/m);
  assert.match(gate, /head-ref: \$\{\{ steps\.pr-refs\.outputs\.head_ref \}\}/);
  assert.match(gate, /fail-on-severity: moderate/);
});

for (const decisionLabel of [false, true]) {
  for (const result of ["success", "skipped", "cancelled"]) {
    test(`Readiness ${result} preserves ${decisionLabel ? "blocked" : "ordinary"} durable decision state`, async () => {
      const outcome = await run("escalate-human-decision", {
        decisionLabel,
        results: { "ghas-gate": { result } },
      });
      assert.equal(outcome.labels.has("needs-human-decision"), decisionLabel);
      assert.equal(outcome.requests.length, 1, "No label/comment/reviewer mutation on recovery");
    });
  }
}

test("Failed readiness escalates without routine human approval on integration branches", async () => {
  const result = await run("escalate-human-decision", {
    results: { "dependency-review-gate": { result: "failure" } },
  });
  assert.ok(result.labels.has("needs-human-decision"));
  assert.ok(result.requests.some(({ route }) => route.endsWith("/comments") && route.startsWith("POST")));
  assert.ok(result.requests.every(({ route }) => !route.includes("requested_reviewers")));
});

test("Draft failure defers escalation without clearing existing decisions", async () => {
  const result = await run("escalate-human-decision", {
    draft: true,
    decisionLabel: true,
    results: { "ghas-gate": { result: "failure" } },
  });
  assert.ok(result.labels.has("needs-human-decision"));
  assert.equal(result.requests.length, 1);
});

test("Integration PRs do not require routine human approval", async () => {
  const result = await run("required-human-approval");
  assert.deepEqual(result.failures, []);
  assert.equal(result.requests.length, 1, "Approval reviews are not consulted on integration branches");
});

for (const ref of ["staging", "main"]) {
  test(`${ref} still requires the configured human approval`, async () => {
    const options = { base: { sha: "trusted-base-sha", ref } };
    const blocked = await run("required-human-approval", options);
    assert.match(blocked.failures[0], /require APPROVED review/);
    const approved = await run("required-human-approval", {
      ...options,
      reviews: [{ user: { login: "maintainer" }, state: "APPROVED", submitted_at: "2026-11-06T08:00:00Z" }],
    });
    assert.deepEqual(approved.failures, []);
  });
}

test("Existing required job names remain unchanged", () => {
  assert.match(job("required-human-approval"), /^    name: required-human-approval$/m);
  assert.match(job("ghas-gate"), /^    name: ghas-gate$/m);
  assert.match(job("dependency-review-gate"), /^    name: dependency-review-gate$/m);
  assert.match(job("escalate-human-decision"), /^    name: Escalate unresolved findings for human decision$/m);
});
