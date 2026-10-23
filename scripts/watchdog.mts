// Checks the live site: it's updating, the page matches its data, the data passes lib/verify.ts, and its Kp matches
// NOAA's. Run by .github/workflows/watchdog.yml after every deploy and every 30 minutes: a failure opens the GitHub
// issue "Live site check failed" (GitHub emails the owner), which is closed again once the checks pass.
// Locally: npx tsx scripts/watchdog.mts (prints the result; exits 1 on failure).
import type { AuroraData } from "../lib/data";
import { parseKpForecast } from "../lib/parse";
import { SITE_URL } from "../lib/site";
import { verifySnapshot } from "../lib/verify";

const SITE = process.env.SITE ?? SITE_URL;
const TITLE = "Live site check failed";

/** Fetches past every cache, so the check sees what a visitor opening the site now gets. */
async function get(url: string, as: "json" | "text" = "json") {
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === "json" ? res.json() : res.text();
}

async function check(): Promise<string[]> {
  const data = (await get(`${SITE}/data.json`)) as AuroraData;
  const errors = verifySnapshot(data);

  // Rebuilds run every 10 minutes from 13 to 06 UTC and hourly otherwise; NOAA's Kp file has a ~15-minute gap after
  // midnight UTC that holds builds back on purpose, so leave room for it.
  const hour = new Date().getUTCHours();
  const limit = hour >= 13 || hour < 6 ? 35 : 90;
  const age = (Date.now() - Date.parse(data.generatedAt)) / 60000;
  if (age > limit) errors.push(`The newest data is ${Math.round(age)} minutes old (more than ${limit}): the site isn't updating`);

  // The page and data.json come from the same build (a deploy between the two requests can split them: retry once).
  const pageAt = async () => ((await get(SITE, "text")) as string).match(/data-generated-at="([^"]+)"/)?.[1];
  const sameBuild = (await pageAt()) === data.generatedAt || (await pageAt()) === ((await get(`${SITE}/data.json`)) as AuroraData).generatedAt;
  if (!sameBuild) errors.push("The page and data.json come from different builds");

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

const errors = await check().catch((e) => [`The watchdog couldn't check the site: ${e}`]);
console.log(errors.length ? errors.map((e) => `FAILED: ${e}`).join("\n") : `All checks pass on ${SITE}`);
await report(errors);
process.exit(errors.length ? 1 : 0);
