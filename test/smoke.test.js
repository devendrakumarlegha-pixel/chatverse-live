const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
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

test("frontend and overlay JavaScript parse successfully", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chatverse-syntax-"));
  try {
    const files = [
      path.join(root, "public", "index.html"),
      path.join(root, "public", "overlay.html"),
      path.join(root, "public", "sounds.js")
    ];
    const scripts = [];
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      if (file.endsWith(".js")) {
        scripts.push([path.basename(file), source]);
      } else {
        const matches = source.matchAll(/<script>([\\s\\S]*?)<\\/script>/gi);
        for (const match of matches) scripts.push([path.basename(file) + "-inline-" + scripts.length, match[1]]);
      }
    }
    assert.ok(scripts.length >= 3, "Expected inline game/overlay scripts and sound module");
    for (const [name, source] of scripts) {
      const file = path.join(tempDir, name.replace(/[^a-z0-9_.-]/gi, "_") + ".js");
      fs.writeFileSync(file, source, "utf8");
      const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      assert.equal(result.status, 0, name + ": " + (result.stderr || result.stdout));
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
