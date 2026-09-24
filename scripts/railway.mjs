// Thin wrappers around the Railway CLI for the feedme service. Variable values are returned to the
// caller for checks, never printed here.
import { execFileSync } from "node:child_process";

export const SERVICE = "feedme";

function railway(args) {
  const out = execFileSync("railway", [...args, "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(out.slice(out.search(/[[{]/)));
}

export function getVars() {
  const d = railway(["variable", "list", "--service", SERVICE]);
  return d.variables ?? d;
}

export function setVars(pairs) {
  for (const [k, v] of Object.entries(pairs)) railway(["variable", "set", `${k}=${v}`, "--service", SERVICE, "--skip-deploys"]);
}

export function redeployLatestCommit() {
  railway(["redeploy", "--service", SERVICE, "--from-source", "--yes"]);
}

export function latestDeployment() {
  const d = railway(["deployment", "list", "--service", SERVICE]);
  const list = d.deployments ?? d;
  const x = list[0] || {};
  return { status: x.status, commit: (x.meta?.commitHash || "").slice(0, 7), createdAt: x.createdAt };
}

export function volumes() {
  const d = railway(["volume", "list"]);
  return d.volumes ?? [];
}
