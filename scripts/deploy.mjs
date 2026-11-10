import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";
const target = process.argv[2];
if (!["staging", "production"].includes(target)) {
  console.error(
    "Choose an environment: npm run deploy:staging or npm run deploy:production -- --confirm-production <commit SHA>",
  );
  process.exit(1);
}
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()) {
  console.error("Commit changes before deployment so the release can be reproduced.");
  process.exit(1);
}
if (
  target === "production" &&
  (process.argv[3] !== "--confirm-production" || process.argv[4] !== sha)
) {
  console.error("Production requires an explicit release of the tested full commit SHA.");
  process.exit(1);
}
const checked = spawnSync("npm", ["run", "check"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (checked.status !== 0) process.exit(checked.status ?? 1);
const deployed = spawnSync(
  "npx",
  ["wrangler", "deploy", "--env", target, "--message", `Release ${sha}`],
  { stdio: "inherit", shell: process.platform === "win32" },
);
process.exit(deployed.status ?? 1);
