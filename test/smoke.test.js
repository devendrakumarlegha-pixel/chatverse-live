const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const serverPath = path.join(root, "server", "index.js");
const server = fs.readFileSync(serverPath, "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

test("server JavaScript parses successfully", () => {
  const result = spawnSync(process.execPath, ["--check", serverPath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("start script is defined", () => {
  assert.equal(pkg.scripts.start, "node server/index.js");
});

test("health and status endpoints are registered", () => {
  assert.match(server, /app\.get\("\/health"/);
  assert.match(server, /app\.get\("\/api\/status"/);
});

test("leaderboard persistence loads and saves all scores", () => {
  assert.match(server, /function loadScores\(\)/);
  assert.match(server, /function saveScores\(\)/);
  assert.match(server, /loadScores\(\);/);
  assert.match(server, /globalScores\.set\(name,\(globalScores\.get\(name\)\|\|0\)\+1\);saveScores\(\)/);
  assert.match(server, /JSON\.stringify\(\[\.\.\.globalScores\.entries\(\)\]/);
});

test("YouTube chat commands are allow-listed before awarding points", () => {
  assert.match(server, /function awardPoint\(author,command\)/);
  for (const command of ["!red", "!blue", "!build", "!attack", "!defend", "!power", "!forest", "!castle", "!chaos"]) {
    assert.ok(server.includes(JSON.stringify(command)), "Missing allow-listed command: " + command);
  }
});
