const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn, spawnSync } = require("node:child_process");
const net = require("node:net");

const root = path.join(__dirname, "..");
const serverPath = path.join(root, "server", "index.js");
const server = fs.readFileSync(serverPath, "utf8");
const frontend = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
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
        const matches = source.matchAll(/<script>([\s\S]*?)<\/script>/gi);
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

test("disconnect endpoint requires a valid session", () => {
  assert.match(server, /app\.post\("\/api\/disconnect",\(req,res\)=>\{if\(!session\(req\)\)/);
  assert.match(server, /12\*60\*60\*1000/);
});

test("frontend uses shared leaderboard and authorizes disconnect", () => {
  assert.match(frontend, /stream\.addEventListener\('leaderboard'/);
  assert.match(frontend, /fetch\('\/api\/disconnect',\{method:'POST',headers:headers\(\)\}\)/);
  assert.doesNotMatch(frontend, /This prototype is not connected to YouTube Live Chat yet/);
});

test("server starts, serves health, and protects disconnect", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chatverse-runtime-"));
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const baseUrl = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      PORT: String(port),
      BASE_URL: baseUrl,
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      SESSION_SECRET: "",
      LEADERBOARD_FILE: path.join(tempDir, "scores.json")
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let logs = "";
  child.stdout.on("data", chunk => { logs += chunk.toString(); });
  child.stderr.on("data", chunk => { logs += chunk.toString(); });
  try {
    let health = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (child.exitCode !== null) throw new Error("Server exited early: " + logs);
      try {
        health = await fetch(baseUrl + "/health");
        if (health.ok) break;
      } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    assert.ok(health && health.ok, "Health endpoint did not respond. " + logs);
    assert.deepEqual(await health.json(), { ok: true, service: "chatverse-live" });
    const status = await fetch(baseUrl + "/api/status");
    assert.equal(status.status, 200);
    assert.equal((await status.json()).configured, false);
    const disconnect = await fetch(baseUrl + "/api/disconnect", { method: "POST" });
    assert.equal(disconnect.status, 401);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise(resolve => child.once("exit", resolve)),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
