"use client";

import { useEffect } from "react";
import { AUTO_RELOAD } from "./Analytics";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** While the page stays open and visible. Opening, returning to it or coming back online checks at once. */
const CHECK_EVERY = 2 * 60 * 1000;
// The page and version.json come from the same snapshot; anything newer is a newer build.
const NEWER_BY = 60 * 1000;
/** Query parameter that gives a refreshed page its own address, so the browser's cache can't hand back the old one. */
const V = "v";
/** The build last reloaded for, so GitHub's CDN still serving the old page can't cause a reload loop. */
const TRIED = "foxlight:refresh-tried";

/**
 * Keeps an open page on the newest build. The site is rebuilt every ~10 minutes. Every check asks for version.json
 * under a unique address, and a newer build is loaded under one too (then the address is tidied back): that gets past
 * the browser's cache. GitHub's CDN ignores the address and keeps each file up to 10 minutes, so a new build shows
 * within about 10 minutes of its deploy.
 */
export function AutoRefresh({ generatedAt }: { generatedAt: string }) {
  useEffect(() => {
    const url = new URL(location.href);
    if (url.searchParams.has(V)) {
      url.searchParams.delete(V);
      history.replaceState(history.state, "", url);
    }

    let last = 0;
    let busy = false;
    const check = async (now: boolean) => {
      if (document.visibilityState !== "visible" || busy || (!now && Date.now() - last < CHECK_EVERY)) return;
      busy = true;
      last = Date.now();
      try {
        const res = await fetch(`${BASE}/version.json?t=${Date.now()}`, { cache: "no-store" });
        const { generatedAt: latest } = await res.json();
        if (!(Date.parse(latest) - Date.parse(generatedAt) > NEWER_BY)) return;
        try {
          if (sessionStorage.getItem(TRIED) === latest) return;
          sessionStorage.setItem(TRIED, latest);
          sessionStorage.setItem(AUTO_RELOAD, "1");
        } catch {}
        const next = new URL(location.href);
        next.searchParams.set(V, latest);
        location.replace(next);
      } catch {
      } finally {
        busy = false;
      }
    };

    const atOnce = () => check(true);
    check(true);
    const id = setInterval(() => check(false), 30 * 1000);
    document.addEventListener("visibilitychange", atOnce); // tab or home-screen app brought back
    window.addEventListener("pageshow", atOnce); // restored from the back/forward cache
    window.addEventListener("online", atOnce);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", atOnce);
      window.removeEventListener("pageshow", atOnce);
      window.removeEventListener("online", atOnce);
    };
  }, [generatedAt]);
  return null;
}
