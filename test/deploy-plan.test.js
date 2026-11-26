import { describe, expect, it } from "vitest";
import { deploySteps } from "../scripts/deploy-plan.mjs";

const paths = {
  node: "C:\\Program Files\\nodejs\\node.exe",
  npmCli: "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
  wranglerCli: "C:\\project\\node_modules\\wrangler\\bin\\wrangler.js",
};
const sha = "2b14b07d18c4783cdc42f4ebdef0d6312c1c031f";

describe("Deploy script", () => {
  it("runs checks and wrangler through Node directly, without a shell", () => {
    const steps = deploySteps({ target: "staging", sha, ...paths });
    expect(steps).toEqual([
      { command: paths.node, args: [paths.npmCli, "run", "check"] },
      {
        command: paths.node,
        args: [paths.wranglerCli, "deploy", "--env", "staging", "--message", `Release ${sha}`],
      },
    ]);
  });

  // Regression: on Windows the shell split "Release <SHA>" at the space,
  // so wrangler treated the SHA as the Worker entry-point file.
  it("keeps the release message as one argument even with spaces in paths", () => {
    const [, wrangler] = deploySteps({ target: "production", sha, ...paths });
    expect(wrangler.args).toContain(`Release ${sha}`);
    expect(wrangler.args).not.toContain(sha);
    expect(wrangler.args[0]).toBe(paths.wranglerCli);
  });

  it("refuses unknown environments", () => {
    expect(() => deploySteps({ target: "prod", sha, ...paths })).toThrow();
  });
});
