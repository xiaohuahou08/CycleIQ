/**
 * Local issue queue: pick the oldest open issue with the highest configured priority label,
 * create a branch, then (after you implement) publish pushes and opens a PR linked to the issue.
 *
 * Requires: `gh` CLI authenticated (`gh auth login`), `git`, and a clean tree for `pick`.
 *
 * Cron example (hourly):
 *   0 * * * * cd /path/to/CycleIQ && node scripts/issue-work.mjs pick >>$HOME/.cycleiq-issue.log 2>&1
 *
 * Usage:
 *   node scripts/issue-work.mjs pick [--dry-run]
 *   node scripts/issue-work.mjs publish [--dry-run]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const STATE_DIR = path.join(process.cwd(), ".github", "issue-bot");
const STATE_FILE = path.join(STATE_DIR, "current.json");

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  }).trim();
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function parseCsvEnv(name, fallback) {
  const raw = (process.env[name] ?? fallback).trim();
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function ghApiJson(pathname) {
  const out = sh("gh", ["api", "-H", "Accept: application/vnd.github+json", pathname]);
  return JSON.parse(out);
}

function resolveRepository() {
  const env = process.env.GITHUB_REPOSITORY?.trim();
  if (env) return env;
  return sh("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);
}

function requireCleanWorkingTree() {
  const st = sh("git", ["status", "--porcelain"]);
  if (st) {
    throw new Error(
      "Working tree is not clean. Commit or stash changes before `pick`."
    );
  }
}

function defaultBranchName(owner, repo) {
  return sh("gh", ["api", `/repos/${owner}/${repo}`, "-q", ".default_branch"]);
}

function remoteBranchExists(branch) {
  try {
    const out = sh("git", ["ls-remote", "--heads", "origin", branch]);
    return Boolean(out);
  } catch {
    return false;
  }
}

function openPrForHead(branch) {
  try {
    const out = sh("gh", ["pr", "list", "--head", branch, "--state", "open", "--json", "number,url"]);
    const arr = JSON.parse(out);
    return arr[0] ?? null;
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const cmd = argv[2];
  return { cmd, dryRun };
}

function selectIssue(owner, name, priorityLabels, excludeLabels) {
  const issues = ghApiJson(
    `/repos/${owner}/${name}/issues?state=open&per_page=100&sort=created&direction=asc`
  );

  function issuePriorityIndex(issue) {
    const labels = (issue.labels ?? [])
      .map((l) => (typeof l === "string" ? l : l.name))
      .filter(Boolean);
    const lower = labels.map((l) => String(l).toLowerCase());
    if (lower.some((l) => excludeLabels.has(l))) return null;
    for (let i = 0; i < priorityLabels.length; i++) {
      if (lower.includes(priorityLabels[i].toLowerCase())) return i;
    }
    return null;
  }

  let best = null;
  for (const issue of issues) {
    if (issue.pull_request) continue;
    const prioIdx = issuePriorityIndex(issue);
    if (prioIdx === null) continue;
    if (!best) {
      best = { issue, prioIdx };
      continue;
    }
    if (prioIdx < best.prioIdx) best = { issue, prioIdx };
    else if (prioIdx === best.prioIdx) {
      if (new Date(issue.created_at) < new Date(best.issue.created_at)) {
        best = { issue, prioIdx };
      }
    }
  }
  return best;
}

function writeState(data) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(`No state file at ${STATE_FILE}. Run \`pick\` first.`);
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function cmdPick({ dryRun }) {
  if (!dryRun) requireCleanWorkingTree();

  const repo = resolveRepository();
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new Error(`Bad repository: ${repo}`);

  const priorityLabels = parseCsvEnv("ISSUEBOT_PRIORITY_LABELS", "P0,P1,P2,P3");
  const excludeLabels = new Set(
    parseCsvEnv("ISSUEBOT_EXCLUDE_LABELS", "blocked,wip").map((l) => l.toLowerCase())
  );

  const best = selectIssue(owner, name, priorityLabels, excludeLabels);
  if (!best) {
    console.log("issue-work: no matching open issues (by priority labels).");
    process.exit(0);
  }

  const issue = best.issue;
  const issueNumber = issue.number;
  const issueTitle = issue.title ?? `Issue ${issueNumber}`;
  const branch = `issue/${issueNumber}-${slugify(issueTitle)}`;
  const priority = priorityLabels[best.prioIdx];
  const issueUrl = issue.html_url ?? `https://github.com/${owner}/${name}/issues/${issueNumber}`;

  const existingPr = openPrForHead(branch);
  if (existingPr) {
    console.log(
      `issue-work: branch ${branch} already has open PR ${existingPr.url} — skipping pick.`
    );
    process.exit(0);
  }

  if (remoteBranchExists(branch) && !dryRun) {
    console.log(`issue-work: remote branch exists: ${branch}; checking it out.`);
    sh("git", ["fetch", "origin", branch]);
    sh("git", ["checkout", branch]);
    sh("git", ["pull", "--ff-only", "origin", branch]);
  } else if (!dryRun) {
    const def = defaultBranchName(owner, name);
    sh("git", ["fetch", "origin", def]);
    sh("git", ["checkout", def]);
    sh("git", ["pull", "--ff-only", "origin", def]);
    sh("git", ["checkout", "-b", branch]);
  }

  const state = {
    repository: repo,
    issueNumber,
    title: issueTitle,
    body: issue.body ?? "",
    url: issueUrl,
    priority,
    branch,
    pickedAt: new Date().toISOString(),
  };

  if (dryRun) {
    console.log("issue-work pick (dry-run):", JSON.stringify(state, null, 2));
    process.exit(0);
  }

  writeState(state);
  console.log(`issue-work: picked #${issueNumber} (${priority}) on branch ${branch}`);
  console.log(`issue-work: state written to ${STATE_FILE}`);
  console.log("issue-work: implement the fix on this branch, then run:");
  console.log("  node scripts/issue-work.mjs publish");
}

function cmdPublish({ dryRun }) {
  const state = readState();
  const branch = state.branch;
  const issueNumber = state.issueNumber;
  const issueTitle = state.title;
  const issueUrl = state.url;
  const priority = state.priority;

  const current = sh("git", ["branch", "--show-current"]);
  if (current !== branch) {
    throw new Error(
      `Expected branch ${branch}, on ${current}. Run: git checkout ${branch}`
    );
  }

  const draft = (process.env.ISSUEBOT_DRAFT_PR ?? "true").toLowerCase() !== "false";
  const existingPr = openPrForHead(branch);
  if (existingPr) {
    console.log(
      dryRun
        ? `issue-work publish (dry-run): PR already open: ${existingPr.url}`
        : `issue-work: PR already open: ${existingPr.url}`
    );
    process.exit(0);
  }

  const status = sh("git", ["status", "--porcelain"]);
  if (status) {
    if (dryRun) {
      console.log(
        "issue-work publish (dry-run): would commit, push, and open a draft PR (if configured)."
      );
      process.exit(0);
    }
    const msg =
      process.env.ISSUEBOT_COMMIT_MESSAGE?.trim() ||
      `fix(#${issueNumber}): ${issueTitle}`;
    sh("git", ["add", "-A"]);
    sh("git", ["commit", "-m", msg]);
  } else {
    console.log("issue-work: no local changes to commit.");
    if (dryRun) {
      console.log(
        "issue-work publish (dry-run): would push and open a draft PR (if configured)."
      );
      process.exit(0);
    }
  }

  sh("git", ["push", "-u", "origin", branch]);

  const prTitle = `[${priority}] ${issueTitle} (closes #${issueNumber})`;
  const prBody = [
    "## Summary",
    "",
    `- Addresses ${issueUrl}`,
    "",
    "## Links",
    "",
    `- Closes #${issueNumber}`,
    "",
    "## Test plan",
    "",
    "- [ ] (fill in)",
    "",
  ].join("\n");

  const prArgs = ["pr", "create", "--title", prTitle, "--body", prBody];
  if (draft) prArgs.push("--draft");

  const prUrl = sh("gh", prArgs);
  console.log(`issue-work: opened PR: ${prUrl}`);
}

const { cmd, dryRun } = parseArgs(process.argv);
if (!cmd || !["pick", "publish"].includes(cmd)) {
  console.error("Usage: node scripts/issue-work.mjs pick|publish [--dry-run]");
  process.exit(1);
}

try {
  if (cmd === "pick") cmdPick({ dryRun });
  else cmdPublish({ dryRun });
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
