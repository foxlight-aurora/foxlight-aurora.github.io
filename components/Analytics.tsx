"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Google Analytics, only with consent (EU/Traficom rules). Nothing is loaded from Google until the visitor taps
 * "Allow"; declining or ignoring the banner sends nothing. The choice is kept in this browser and can be changed
 * from the footer ("Cookie settings").
 */
const GA_ID = "G-PY9306Z2K6";
const HOST = "foxlight-aurora.github.io"; // don't count local builds and previews
const KEY = "foxlight:analytics";
const CHANGE = "foxlight:analytics-change";
/** Set by AutoRefresh before it reloads, so a page left open isn't counted as a new visit every few minutes. */
export const AUTO_RELOAD = "foxlight:auto-reload";

type Choice = "granted" | "denied" | null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const read = (): Choice => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
};

const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGE, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE, cb);
    window.removeEventListener("storage", cb);
  };
};

const save = (choice: Choice) => {
  try {
    if (choice) localStorage.setItem(KEY, choice);
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(CHANGE));
};

const disableFlag = `ga-disable-${GA_ID}`;
const flags = () => window as unknown as Record<string, boolean>;

function load() {
  if (location.hostname !== HOST) return;
  flags()[disableFlag] = false; // resume if consent was withdrawn and given again without a reload
  if (window.gtag) return window.gtag("consent", "update", { analytics_storage: "granted" });
  let auto = false;
  try {
    auto = sessionStorage.getItem(AUTO_RELOAD) === "1";
    sessionStorage.removeItem(AUTO_RELOAD);
  } catch {}
  window.dataLayer = window.dataLayer || [];
  // gtag.js expects the `arguments` object itself, not an array.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  // Consent Mode v2: the banner asks about statistics only, so advertising stays off. Without a default, Google
  // treats every consent type as granted.
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: !auto });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

/** Stop measuring and remove the Analytics cookies after consent is withdrawn. */
function unload() {
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  flags()[disableFlag] = true;
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_")) {
      for (const domain of ["", `; domain=${location.hostname}`, `; domain=.${location.hostname}`])
        document.cookie = `${name}=; max-age=0; path=/${domain}`;
    }
  }
}

export function Analytics() {
  const choice = useSyncExternalStore(subscribe, read, () => "denied" as Choice); // no banner in the static HTML
  useEffect(() => {
    if (choice === "granted") load();
  }, [choice]);
  if (choice !== null) return null;

  return (
    <>
    {/* Scroll room so the banner never hides the end of the footer. */}
    <div aria-hidden className="h-40 sm:h-24" />
    <div role="dialog" aria-label="Visit statistics" className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-line bg-surface/95 p-4 text-sm shadow-xl shadow-black/50 backdrop-blur sm:flex-row sm:items-center">
        <p className="flex-1 leading-relaxed text-muted">
          Allowing cookies lets us use Google Analytics for website statistics.
        </p>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => { unload(); save("denied"); }}
            className="rounded-xl border border-line px-4 py-2 text-muted hover:border-faint hover:text-ink">
            No thanks
          </button>
          <button onClick={() => save("granted")}
            className="rounded-xl border border-great/40 bg-great/10 px-4 py-2 text-great hover:bg-great/20">
            Allow
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

/** Footer link that brings the banner back so the visitor can change their choice. */
export function CookieSettings() {
  return (
    <button onClick={() => { unload(); save(null); }} className="underline underline-offset-4 hover:text-muted">
      Cookie settings
    </button>
  );
}
