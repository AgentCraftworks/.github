const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const workflow = fs.readFileSync(".github/workflows/acw-pr-readiness-reusable.yml", "utf8").replace(/\r\n/g, "\n");
const base = "a".repeat(40);
const head = "b".repeat(40);
const merge = "c".repeat(40);
const pr = { number: 42, base: { sha: base, ref: "staging" }, head: { sha: head }, draft: false };

function stepScript(name) {
  const marker = `      - name: ${name}\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `missing step ${name}`);
  const end = workflow.indexOf("\n      - name:", start + marker.length);
  const nextJob = workflow.slice(start + marker.length).search(/\n  [a-z0-9-]+:\s*\n/);
  const jobEnd = nextJob === -1 ? workflow.length : start + marker.length + nextJob;
  const block = workflow.slice(start, end === -1 ? jobEnd : Math.min(end, jobEnd));
  const match = block.match(/          script: \|\n((?:            .*\n|\n)*)/);
  assert.ok(match, `missing script for ${name}`);
  return match[1].replace(/^            /gm, "");
}

async function run(name, { event = "pull_request_target", payload = { pull_request: { number: 42 } },
  request, paginate, iterator, env = {}, needs } = {}) {
  const failures = [];
  const outputs = {};
  const core = {
    setFailed: (value) => failures.push(value),
    setOutput: (key, value) => { outputs[key] = value; },
    info() {}, notice() {}, warning() {},
    summary: { addHeading() { return this; }, addRaw() { return this; }, async write() {} },
  };
  const paginated = paginate || (async () => []);
  paginated.iterator = iterator || (async function* () { yield { data: [], headers: {} }; });
  const github = { request: request || (async () => ({ data: pr })), paginate: paginated };
  const script = stepScript(name).replace("${{ toJson(needs) }}", JSON.stringify(needs || {}));
  const context = { eventName: event, payload, repo: { owner: "org", repo: "repo" } };
  const variables = { GH_PR_NUMBER: "42", GH_BASE_SHA: base, GH_HEAD_SHA: head, ...env };
  await vm.runInNewContext(`(async () => {\n${script}\n})()`, { core, github, context, process: { env: variables }, Buffer });
  return { failures, outputs };
}

function scanMocks({ analysis = [{ commit_sha: merge, error: "" }], alerts = [], status, changed = false } = {}) {
  let pullCalls = 0;
  return {
    request: async (route) => {
      if (route.includes("/pulls/")) {
        pullCalls++;
        return { data: changed && pullCalls > 1 ? { ...pr, head: { sha: "d".repeat(40) } } : pr };
      }
      return { data: { sha: merge, parents: [{ sha: base }, { sha: head }] } };
    },
    paginate: async (route, options) => {
      if (status) throw Object.assign(new Error("unavailable"), { status });
      assert.equal(options.ref, "refs/pull/42/merge");
      return route.endsWith("/analyses") ? analysis : alerts;
    },
  };
}

test("security gates run rather than skip on supported PR events", () => {
  for (const name of ["ghas-gate", "dependency-review-gate"]) {
    const section = workflow.split(`  ${name}:\n`)[1].split(/\n  [a-z0-9-]+:\s*\n/)[0];
    assert.doesNotMatch(section, /^    if:/m);
  }
});

for (const event of ["pull_request", "pull_request_target", "pull_request_review", "workflow_call"]) {
  test(`resolve trusted PR SHAs and scan current merge on ${event}`, async () => {
    const payload = event === "workflow_call" ? {} : { pull_request: { number: 42, head: { repo: { fork: true } } } };
    const refs = await run("Resolve PR base/head refs", { event, payload });
    assert.equal(refs.outputs.base_ref, base);
    assert.equal(refs.outputs.head_ref, head);
    const scan = await run("Fail when open code scanning alerts exist for this PR", {
      event, payload, ...scanMocks(),
    });
    assert.deepEqual(scan.failures, []);
  });
}

test("reject unsupported events and mismatched PR numbers", async () => {
  await assert.rejects(run("Resolve PR base/head refs", { event: "push" }), /Unsupported event/);
  await assert.rejects(run("Fail when open code scanning alerts exist for this PR", {
    payload: { pull_request: { number: 43 } },
  }), /invalid pull request/);
  const refs = await run("Resolve PR base/head refs", {
    request: async () => ({ data: { ...pr, base: { ref: "staging" } } }),
  });
  assert.match(refs.failures[0], /Could not determine/);
});

test("fail closed for missing, stale, failed and unauthorized code scans", async () => {
  for (const analysis of [[], [{ commit_sha: head, error: "" }], [{ commit_sha: merge, error: "scan failed" }], [{ commit_sha: merge }]]) {
    await assert.rejects(run("Fail when open code scanning alerts exist for this PR", scanMocks({ analysis })), /No valid successful/);
  }
  for (const status of [403, 404]) {
    await assert.rejects(run("Fail when open code scanning alerts exist for this PR", scanMocks({ status })), /unavailable or unauthorized/);
  }
  await assert.rejects(run("Fail when open code scanning alerts exist for this PR", scanMocks({ changed: true })), /changed/);
  const found = await run("Fail when open code scanning alerts exist for this PR", scanMocks({ alerts: [{ rule: { id: "test" } }] }));
  assert.match(found.failures[0], /Open GHAS/);
  await assert.rejects(run("Fail when open code scanning alerts exist for this PR", {
    ...scanMocks(),
    request: async (route) => route.includes("/pulls/")
      ? { data: pr } : { data: { sha: merge, parents: [{ sha: base }, { sha: "d".repeat(40) }] } },
  }), /merge ref does not match/);
});

test("dependency review uses only base checkout, explicit SHAs, and fails on incomplete graph data", async () => {
  const job = workflow.split("  dependency-review-gate:\n")[1].split("\n  escalate-human-decision:")[0];
  assert.match(job, /ref: \$\{\{ steps\.pr-refs\.outputs\.base_ref \}\}/);
  assert.match(job, /persist-credentials: false/);
  assert.match(job, /base-ref: \$\{\{ steps\.pr-refs\.outputs\.base_ref \}\}/);
  assert.match(job, /head-ref: \$\{\{ steps\.pr-refs\.outputs\.head_ref \}\}/);
  assert.doesNotMatch(job, /uses:\s+\.\//);
  await run("Require complete dependency graph data", {
    iterator: async function* (route, options) {
      assert.match(route, /dependency-graph\/compare/);
      assert.equal(options.basehead, `${base}...${head}`);
      yield { data: [], headers: {} };
    },
  });
  await assert.rejects(run("Require complete dependency graph data", {
    iterator: async function* () { yield { data: [], headers: { "x-github-dependency-graph-snapshot-warnings": "warning" } }; },
  }), /incomplete snapshots/);
  for (const status of [403, 404]) {
    await assert.rejects(run("Require complete dependency graph data", {
      iterator: async function* () { throw Object.assign(new Error(`HTTP ${status}`), { status }); },
    }), new RegExp(`HTTP ${status}`));
  }
  await assert.rejects(run("Verify PR revisions remain current", {
    request: async () => ({ data: { ...pr, head: { sha: "d".repeat(40) } } }),
  }), /changed/);
});

test("script inputs are not interpolated into executable JavaScript", () => {
  for (const match of workflow.matchAll(/          script: \|\n((?:            .*\n|\n)*)/g)) {
    assert.doesNotMatch(match[1], /\$\{\{\s*inputs\./);
  }
});

test("escalation fails closed for failed, skipped, cancelled and missing required gates", async () => {
  const names = ["required-human-approval", "review-feedback-gate", "ghas-gate", "dependency-review-gate"];
  for (const result of ["failure", "skipped", "cancelled", undefined]) {
    const needs = Object.fromEntries(names.map((name) => [name, { result: "success" }]));
    if (result === undefined) delete needs["ghas-gate"];
    else needs["ghas-gate"] = { result };
    const response = await run("Label and notify when any gate is failing", { needs });
    assert.match(response.failures[0], /ghas-gate/);
  }
  const needs = Object.fromEntries(names.map((name) => [name, { result: "success" }]));
  const response = await run("Label and notify when any gate is failing", { needs });
  assert.deepEqual(response.failures, []);
});
