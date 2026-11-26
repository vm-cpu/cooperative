// Builds the commands for a release. Kept free of Node APIs so it can be tested.
// Every command runs Node directly (no shell), so arguments such as
// "Release <SHA>" reach the program intact on every OS, including Windows.
export const TARGETS = ["staging", "production"];

export function deploySteps({ target, sha, node, npmCli, wranglerCli }) {
  if (!TARGETS.includes(target)) throw new Error(`Unknown environment: ${target}`);
  return [
    { command: node, args: [npmCli, "run", "check"] },
    {
      command: node,
      args: [wranglerCli, "deploy", "--env", target, "--message", `Release ${sha}`],
    },
  ];
}
