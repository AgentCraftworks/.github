const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const workflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/acw-pr-readiness-reusable.yml"), "utf8");
const base = "a".repeat(40);
const head = "b".repeat(40);
const merge = "c".repeat(40);
const pr = { number: 42, base: { sha: base, ref: "staging" }, head: { sha: head }, draft: false };

function job(name) {
  return workflow.split(`  ${name}:\n`)[1].split(/\n  [a-z0-9-]+:\s*\n/)[0];
}

function script(name) {
  const block = workflow.split(`      - name: ${name}\n`)[1];
  assert.ok(block, `missing step ${name}`);
  const match = block.match(/          script: \|\n((?:            .*\n|\n)*)/);
  assert.ok(match, `missing script for ${name}`);
  return match[1].replace(/^            /gm, "");
}

async function run(name, { event = "pull_request_target", payload = { pull_request: { number: 42 } },
  request = async () => ({ data: pr }), paginate = async () => [], iterator,
  env = {}, needs = {} } = {}) {
  const failures = [];
  const outputs = {};
  const calls = [];
  const core = {
    setFailed: (value) => failures.push(value),
    setOutput: (key, value) => { outputs[key] = value; },
    info() {}, notice() {}, warning() {},
    summary: { addHeading() { return this; }, addRaw() { return this; }, async write() {} },
  };
  paginate.iterator = iterator || (async function* () { yield { data: [], headers: {} }; });
  const github = { request: async (...args) => { calls.push(args); return request(...args); }, paginate };
  const context = { eventName: event, payload, repo: { owner: "org", repo: "repo" } };
  const variables = { GH_PR_NUMBER: "42", GH_BASE_SHA: base, GH_HEAD_SHA: head, ...env };
  const source = script(name).replace("${{ toJson(needs) }}", JSON.stringify(needs));
  await vm.runInNewContext(`(async () => {\n${source}\n})()`, { core, github, context, process: { env: variables } });
  return { failures, outputs, calls };
}

function scan({ analyses = [{ commit_sha: merge, error: "" }], alerts = [], status, changed = false } = {}) {
  let pulls = 0;
  return {
    request: async (route) => route.includes("/pulls/")
      ? { data: changed && ++pulls > 1 ? { ...pr, head: { sha: "d".repeat(40) } } : pr }
      : { data: { sha: merge, parents: [{ sha: base }, { sha: head }] } },
    paginate: async (route, options) => {
      if (status) throw Object.assign(new Error("unavailable"), { status });
      assert.equal(options.ref, "refs/pull/42/merge");
      return route.endsWith("/analyses") ? analyses : alerts;
    },
  };
}

test("required security jobs do not skip caller events", () => {
  for (const name of ["ghas-gate", "dependency-review-gate"]) {
    assert.doesNotMatch(job(name), /^    if:/m);
  }
});

for (const event of ["pull_request", "pull_request_target", "pull_request_review", "workflow_call"]) {
  test(`resolve API commit SHAs and scan merge for ${event}, including fork payloads`, async () => {
    const payload = event === "workflow_call" ? {} : { pull_request: { number: 42, head: { repo: { fork: true } } } };
    const refs = await run("Resolve PR base/head refs", { event, payload });
    assert.equal(refs.outputs.base_ref, base);
    assert.equal(refs.outputs.head_ref, head);
    assert.deepEqual((await run("Fail when open code scanning alerts exist for this PR", {
      event, payload, ...scan(),
    })).failures, []);
  });
}

test("reject unsupported events, mismatched PRs, and invalid commit SHAs", async () => {
  await assert.rejects(run("Resolve PR base/head refs", { event: "push" }), /Unsupported event/);
  await assert.rejects(run("Fail when open code scanning alerts exist for this PR", {
    payload: { pull_request: { number: 43 } },
  }), /invalid pull request/);
  const refs = await run("Resolve PR base/head refs", { request: async () => ({ data: { ...pr, base: { ref: "staging" } } }) });
  assert.match(refs.failures[0], /Could not determine/);
});

test("fail closed on unavailable, missing, stale, failed, or changed scans and on alerts", async () => {
  for (const analyses of [[], [{ commit_sha: head, error: "" }], [{ commit_sha: merge, error: "failed" }], [{ commit_sha: merge }]]) {
    await assert.rejects(run("Fail when open code scanning alerts exist for this PR", scan({ analyses })), /No valid successful/);
  }
  for (const status of [403, 404, 500]) {
    await assert.rejects(run("Fail when open code scanning alerts exist for this PR", scan({ status })));
  }
  await assert.rejects(run("Fail when open code scanning alerts exist for this PR", scan({ changed: true })), /changed/);
  const result = await run("Fail when open code scanning alerts exist for this PR", scan({ alerts: [{ rule: { id: "test" } }] }));
  assert.match(result.failures[0], /Open GHAS/);
});

test("dependency review uses trusted checkout, explicit refs, and rejects incomplete or inaccessible graphs", async () => {
  const section = job("dependency-review-gate");
  assert.match(section, /ref: \$\{\{ steps\.pr-refs\.outputs\.base_ref \}\}/);
  assert.match(section, /persist-credentials: false/);
  assert.match(section, /base-ref: \$\{\{ steps\.pr-refs\.outputs\.base_ref \}\}/);
  assert.match(section, /head-ref: \$\{\{ steps\.pr-refs\.outputs\.head_ref \}\}/);
  assert.match(section, /fail-on-severity: moderate/);
  assert.match(section, /actions\/dependency-review-action@2031cfc080254a8a887f58cffee85186f0e49e48/);
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
  await run("Require complete dependency review output", { env: { GH_DEPENDENCY_SUMMARY: "<h1>Dependency Review</h1>" } });
  for (const summary of ["", "<h2>Snapshot Warnings</h2>"]) {
    await assert.rejects(run("Require complete dependency review output", { env: { GH_DEPENDENCY_SUMMARY: summary } }), /incomplete snapshots/);
  }
  await assert.rejects(run("Verify PR revisions remain current", {
    request: async () => ({ data: { ...pr, head: { sha: "d".repeat(40) } } }),
  }), /changed/);
});

test("escalation fails on failed, skipped, cancelled, or missing required gates, including drafts", async () => {
  const names = ["required-human-approval", "review-feedback-gate", "ghas-gate", "dependency-review-gate"];
  for (const result of ["failure", "skipped", "cancelled", undefined]) {
    const needs = Object.fromEntries(names.map((name) => [name, { result: "success" }]));
    if (result === undefined) delete needs["ghas-gate"];
    else needs["ghas-gate"] = { result };
    for (const draft of [true, false]) {
      const response = await run("Label and notify when any gate is failing", {
        needs, request: async () => ({ data: { ...pr, draft } }),
      });
      assert.match(response.failures[0], /ghas-gate/);
      assert.ok(!response.calls.some(([route]) => route.startsWith("DELETE ")));
    }
  }
  const needs = Object.fromEntries(names.map((name) => [name, { result: "success" }]));
  const response = await run("Label and notify when any gate is failing", { needs, env: { GH_ESCALATION_LABEL: "needs-human-decision" } });
  assert.deepEqual(response.failures, []);
  assert.ok(response.calls.some(([route]) => route.startsWith("DELETE ")));
});
