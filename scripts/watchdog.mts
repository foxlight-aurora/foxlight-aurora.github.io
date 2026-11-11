// Checks the live site: it's updating, the page matches its data, the data passes lib/verify.ts, and its Kp matches
// NOAA's. Run by .github/workflows/watchdog.yml after every deploy and every 30 minutes: a failure opens the GitHub
// issue "Live site check failed" (GitHub emails the owner), which is closed again once the checks pass. It also
// cancels a deploy run that's stuck, since that blocks every newer one.
// Locally: npx tsx scripts/watchdog.mts (prints the result; exits 1 on failure).
import type { AuroraData } from "../lib/data";
import { parseKpForecast } from "../lib/parse";
import { SITE_URL } from "../lib/site";
import { verifySnapshot } from "../lib/verify";

const SITE = process.env.SITE ?? SITE_URL;
const TITLE = "Live site check failed";

/** Fetches what a visitor opening the site now gets: past the local cache (GitHub's CDN ignores the query). */
async function get(url: string, as: "json" | "text" = "json") {
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === "json" ? res.json() : res.text();
}

async function check(): Promise<string[]> {
  const data = (await get(`${SITE}/data.json`)) as AuroraData;
  const errors = verifySnapshot(data);

  // Normal worst case: the build interval, NOAA's ~15-minute Kp gap after midnight UTC (which holds builds back on
  // purpose), and GitHub's CDN keeping each file up to 10 minutes. Rebuilds run every 10 minutes from 13:00 to 07:59
  // UTC and hourly otherwise; in the first night hour the last hourly build still counts.
  const night = (h: number) => h >= 13 || h < 8;
  const hour = new Date().getUTCHours();
  const limit = night(hour) && night((hour + 23) % 24) ? 50 : 90;
  const age = (Date.now() - Date.parse(data.generatedAt)) / 60000;
  if (age > limit) errors.push(`The newest data is ${Math.round(age)} minutes old (more than ${limit}): the site isn't updating`);

  // The page is built from the same kind of snapshot as data.json. GitHub's CDN keeps each file up to 10 minutes on its
  // own, so the two can come from builds a little apart; more than 20 minutes apart means something is wrong.
  const pageAt = ((await get(SITE, "text")) as string).match(/data-generated-at="([^"]+)"/)?.[1];
  const apart = pageAt ? Math.abs(Date.parse(pageAt) - Date.parse(data.generatedAt)) / 60000 : Infinity;
  if (!(apart <= 20)) errors.push(`The page and data.json are from builds ${pageAt ? `${Math.round(apart)} minutes` : "of unknown time"} apart`);

  // Kp matches NOAA's for that 3-hour block, unless NOAA has revised it since (estimated → observed). NOAA being
  // unreachable isn't the site's fault: skip.
  const at = Date.parse(data.generatedAt);
  const ours = data.kpBins.find((b) => at >= Date.parse(b.start) && at < Date.parse(b.start) + 3 * 3600000);
  const noaa = await get("https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json")
    .then((rows) => parseKpForecast(rows as never).find((b) => b.start === ours?.start))
    .catch(() => undefined);
  if (ours && noaa && noaa.kind === ours.kind && noaa.kp !== ours.kp) errors.push(`Kp for ${ours.start}: the site has ${ours.kp}, NOAA ${noaa.kp}`);
  return errors;
}

/** Opens the issue on failure (once), closes it when the checks pass again. Only in GitHub Actions. */
async function report(errors: string[]) {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo, GITHUB_SERVER_URL: server, GITHUB_RUN_ID: run } = process.env;
  if (!token || !repo) return;
  const api = (path: string, init?: RequestInit) =>
    fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    }).then((r) => r.json());
  const issues = (await api("/issues?state=open&per_page=100")) as { number: number; title: string }[];
  const open = issues.find((i) => i.title === TITLE);

  if (errors.length && !open) {
    const body = [`The watchdog found problems on ${SITE}:`, "", ...errors.map((e) => `- ${e}`), "", `Run: ${server}/${repo}/actions/runs/${run}`, "", "This issue closes itself when the checks pass again."].join("\n");
    await api("/issues", { method: "POST", body: JSON.stringify({ title: TITLE, body }) });
  } else if (!errors.length && open) {
    await api(`/issues/${open.number}/comments`, { method: "POST", body: JSON.stringify({ body: "All checks pass again." }) });
    await api(`/issues/${open.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
  }
}

/**
 * Cancels a deploy run that has been stuck for over 20 minutes (a normal one takes ~2). Only one deploy runs at a time,
 * so a stuck one makes GitHub cancel every newer run: on 9 Nov a deploy sat "waiting" on GitHub's side for two days.
 * Only in GitHub Actions.
 */
async function unstick() {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo } = process.env;
  if (!token || !repo) return;
  const api = (path: string, method = "GET") =>
    fetch(`https://api.github.com/repos/${repo}${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
  const runs = ((await (await api("/actions/workflows/deploy.yml/runs?per_page=30")).json()) as { workflow_runs: { id: number; status: string; run_started_at: string }[] }).workflow_runs;
  for (const r of runs) {
    if (r.status === "completed" || Date.now() - Date.parse(r.run_started_at) < 20 * 60000) continue;
    // Force-cancel: a plain cancel fails for a run waiting on its environment (as GitHub's Cancel button did).
    const ok = (await api(`/actions/runs/${r.id}/force-cancel`, "POST")).ok;
    console.log(`${ok ? "Cancelled" : "Couldn't cancel"} deploy run ${r.id}, ${r.status} since ${r.run_started_at}`);
  }
}

await unstick().catch((e) => console.log(`Couldn't check for stuck deploy runs: ${e}`));
const errors = await check().catch((e) => [`The watchdog couldn't check the site: ${e}`]);
console.log(errors.length ? errors.map((e) => `FAILED: ${e}`).join("\n") : `All checks pass on ${SITE}`);
await report(errors);
process.exit(errors.length ? 1 : 0);
