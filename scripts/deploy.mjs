import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import process from "node:process";
import { TARGETS, deploySteps } from "./deploy-plan.mjs";

const target = process.argv[2];
if (!TARGETS.includes(target)) {
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
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error(`Run this through npm: npm run deploy:${target}`);
  process.exit(1);
}
const require = createRequire(import.meta.url);
const wranglerPackage = require.resolve("wrangler/package.json");
const wranglerCli = join(dirname(wranglerPackage), require(wranglerPackage).bin.wrangler);

for (const { command, args } of deploySteps({
  target,
  sha,
  node: process.execPath,
  npmCli,
  wranglerCli,
})) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
