"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { SITE_URL } from "@/lib/site";

type Platform = "iphone" | "android";
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// Chrome and Edge offer their own install prompt; catch it as soon as this script runs, before React mounts.
let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // our button replaces Chrome's mini bar
    deferred = e as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}
const onPrompt = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Already opened from the home screen: nothing to add. */
const standaloneQuery = () => window.matchMedia("(display-mode: standalone)");
const onStandalone = (cb: () => void) => {
  const q = standaloneQuery();
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};
const isStandalone = () => standaloneQuery().matches || (navigator as { standalone?: boolean }).standalone === true;

function detect(): Platform | null {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch gives it away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iphone";
  if (/Android/.test(ua)) return "android";
  return null;
}

/**
 * "Add to home screen": puts the site on the home screen, where it opens full screen like an app. Where the browser
 * offers an install prompt (Chrome, Edge, Samsung Internet) one tap opens it; iPhone has none, so it shows the steps.
 */
export function InstallApp() {
  const installed = useSyncExternalStore(onStandalone, isStandalone, () => false);
  const prompt = useSyncExternalStore(onPrompt, () => deferred, () => null);
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Platform | null>(null);
  const [tab, setTab] = useState<Platform>("iphone");
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (installed) return null;

  const toggle = () => {
    if (prompt) return install();
    if (!open) {
      const d = detect();
      setDevice(d);
      setTab(d ?? "iphone");
    }
    setOpen(!open);
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    deferred = null;
    notify();
    setOpen(false);
  };

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-expanded={prompt ? undefined : open}
        aria-controls={prompt ? undefined : id}
        className="inline-flex items-center gap-2 rounded-full border border-rule bg-bg/60 px-3 py-1.5 font-sans text-sm font-medium text-ink transition-colors hover:border-great/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-great/60"
      >
        <PhoneIcon />
        Add to home screen
      </button>

      {open && (
        <div
          id={id}
          role="dialog"
          aria-labelledby={`${id}-h`}
          className="absolute top-full left-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-left font-sans shadow-xl shadow-black/50 sm:right-0 sm:left-auto"
        >
          <p id={`${id}-h`} className="font-display text-2xl leading-none font-bold tracking-wide text-ink uppercase">
            Foxlight on your home screen
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            It opens full screen in one tap, like an app. No app store, nothing to download.
          </p>

          {prompt && (
            <button type="button" onClick={install}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-great/40 bg-great/10 px-4 py-2 text-sm font-medium text-great transition-colors hover:border-great/70">
              <PhoneIcon />
              Install Foxlight
            </button>
          )}

          {!device && (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              On a computer? Open <span className="text-ink">{SITE_URL.replace("https://", "")}</span> on your phone, then:
            </p>
          )}

          <div role="radiogroup" aria-label="Phone" className="mt-4 flex rounded-full border border-rule p-0.5">
            {(["iphone", "android"] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={tab === p} onClick={() => setTab(p)}
                className={`flex-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${tab === p ? "bg-line text-ink" : "text-muted hover:text-ink"}`}>
                {p === "iphone" ? "iPhone / iPad" : "Android"}
              </button>
            ))}
          </div>

          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
            {(tab === "iphone" ? IPHONE : ANDROID).map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-rule font-mono text-[0.7rem] text-ink tabular-nums">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const B = "font-medium text-ink";

const IPHONE: React.ReactNode[] = [
  <>Open this page in <b className={B}>Safari</b> or <b className={B}>Chrome</b>.</>,
  <>
    Tap <b className={B}>Share</b> <ShareIcon />. In Chrome it&rsquo;s at the right of the address bar; in Safari it&rsquo;s in the
    toolbar, or inside the <b className={B}>More</b> <DotsIcon /> menu on newer iPhones.
  </>,
  <>Scroll down and choose <b className={B}>Add to Home Screen</b>.</>,
  <>Leave <b className={B}>Open as Web App</b> on if you see it, then tap <b className={B}>Add</b>.</>,
];

const ANDROID: React.ReactNode[] = [
  <>Open this page in <b className={B}>Chrome</b>.</>,
  <>Tap the menu <DotsIcon vertical /> at the top right.</>,
  <>Choose <b className={B}>Add to Home screen</b> or <b className={B}>Install app</b>.</>,
  <>Tap <b className={B}>Install</b>. Foxlight appears with your other apps.</>,
];

const ICON = "inline size-4 shrink-0 align-[-0.2em] text-ink";

function PhoneIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
      <rect x="4" y="1.5" width="8" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 12h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Safari's share button: a box with an arrow out of the top. */
function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} aria-hidden>
      <path d="M5.5 6.5H4.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 1.5v8M5.5 4 8 1.5 10.5 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotsIcon({ vertical = false }: { vertical?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`${ICON} ${vertical ? "rotate-90" : ""}`} aria-hidden>
      {[3.5, 8, 12.5].map((x) => <circle key={x} cx={x} cy="8" r="1.4" fill="currentColor" />)}
    </svg>
  );
}
