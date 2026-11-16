// Runs every browser test against a running app and prints a summary.
//   npm run build && npm run start -- -p 3003     (in one terminal)
//   npm run test:e2e                              (in another; BASE=http://host:port to change the address)
// Needs Microsoft Edge (change `channel` in the scripts for another browser). Output files go to tests/out.
// The test browser itself sometimes dies on some machines ("browser has been closed"). That is not an app
// failure, so a file is retried up to 3 times when that happens.
import { spawnSync } from "node:child_process";
import { readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "out");
mkdirSync(out, { recursive: true });
const base = process.env.BASE || "http://localhost:3003";
const only = process.argv[2]; // optional: part of a file name
let failed = 0;

for (const f of readdirSync(path.join(here, "e2e")).filter((n) => n.endsWith(".mjs") && (!only || n.includes(only))).sort()) {
  let lines = [];
  let bad = [];
  let status = 1;
  let attempt = 0;
  for (; attempt < 3; attempt++) {
    const r = spawnSync(process.execPath, [path.join(here, "e2e", f), base], { cwd: out, encoding: "utf8", timeout: 400_000 });
    status = r.status ?? 1;
    lines = (r.stdout || "").split("\n").filter(Boolean);
    bad = lines.filter((l) => l.startsWith("FAIL"));
    const flaky = bad.some((l) => /has been closed/.test(l)) || (r.stderr || "").includes("has been closed");
    if (!flaky) break;
    console.log(`  (${f}: the test browser died, retrying)`);
  }
  const pass = lines.filter((l) => l.startsWith("PASS")).length;
  const jsErr = lines.find((l) => l.startsWith("JS errors:")) ?? "no result (crashed?)";
  console.log(`\n== ${f}: ${pass} passed, ${bad.length} failed. ${jsErr}`);
  bad.forEach((l) => console.log("  " + l));
  if (status !== 0 || bad.length || !/none/.test(jsErr)) failed++;
}
console.log(failed ? `\n${failed} test file(s) had problems` : "\nALL E2E TESTS PASS");
process.exit(failed ? 1 : 0);
