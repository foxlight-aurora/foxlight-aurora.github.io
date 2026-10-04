"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";

type Option = { id: string; name: string };
type Choice = { id: string; options: Option[]; choose: (id: string) => void };

const Ctx = createContext<Choice | null>(null);
// Per tab, so a pick survives the automatic reload on a new build but a new visit starts from the best spot.
const STORE = "foxlight:spot";

const noSubscribe = () => () => {};
const readSaved = () => {
  try {
    return sessionStorage.getItem(STORE);
  } catch {
    return null;
  }
};

/** The viewing spot shown in the hero and under "Next nights". Starts at `initial` (the recommended spot). */
export function SpotChoiceProvider({ initial, options, children }: { initial: string; options: Option[]; children: React.ReactNode }) {
  // Read after hydration; the server always renders `initial`.
  const saved = useSyncExternalStore(noSubscribe, readSaved, () => null);
  const [picked, setPicked] = useState<string | null>(null);
  const valid = (id: string | null) => (id && options.some((o) => o.id === id) ? id : null);
  const id = picked ?? valid(saved) ?? initial;

  const choose = (next: string) => {
    setPicked(next);
    try {
      sessionStorage.setItem(STORE, next);
    } catch {}
  };

  return <Ctx.Provider value={{ id, options, choose }}>{children}</Ctx.Provider>;
}

function useSpotChoice() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSpotChoice needs a SpotChoiceProvider");
  return c;
}

/** Renders the view for the chosen spot (views are built on the server, one per spot). */
export function BySpot({ views }: { views: Record<string, React.ReactNode> }) {
  return views[useSpotChoice().id] ?? null;
}

/**
 * Inline spot picker: the spot's name reads as part of the sentence, with a native select laid over it
 * (keyboard, screen readers and the phone's own picker all work) so it sizes to the chosen name.
 */
export function SpotSelect({ label = "Viewing spot" }: { label?: string }) {
  const { id, options, choose } = useSpotChoice();
  const name = options.find((o) => o.id === id)?.name ?? id;
  return (
    <span className="relative inline-flex items-baseline rounded-md font-medium whitespace-nowrap text-ink decoration-faint decoration-dashed underline-offset-4 hover:underline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-great/60">
      {name}
      <svg viewBox="0 0 12 12" className="ml-1 size-[0.7em] self-center text-muted" aria-hidden>
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        aria-label={label}
        value={id}
        onChange={(e) => choose(e.target.value)}
        className="absolute inset-0 w-full cursor-pointer appearance-none opacity-0"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </span>
  );
}
