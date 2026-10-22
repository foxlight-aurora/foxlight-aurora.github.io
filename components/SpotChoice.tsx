"use client";

import { createContext, useContext, useState } from "react";

type Option = { id: string; name: string };
type Choice = { id: string; options: Option[]; choose: (id: string) => void };

const Ctx = createContext<Choice | null>(null);

/**
 * The viewing spot shown in the hero and under "Next nights". Every page load starts at `initial`
 * (the recommended spot); a pick lasts until the page is reloaded.
 */
export function SpotChoiceProvider({ initial, options, children }: { initial: string; options: Option[]; children: React.ReactNode }) {
  const [id, choose] = useState(initial);
  return <Ctx.Provider value={{ id, options, choose }}>{children}</Ctx.Provider>;
}

export function useSpotChoice() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSpotChoice needs a SpotChoiceProvider");
  return c;
}

/** Renders the view for the chosen spot (views are built on the server, one per spot). */
export function BySpot({ views }: { views: Record<string, React.ReactNode> }) {
  return views[useSpotChoice().id] ?? null;
}

/** The chosen spot's name, for places that follow the choice without offering their own picker. */
export function SpotName() {
  const { id, options } = useSpotChoice();
  return <>{options.find((o) => o.id === id)?.name ?? id}</>;
}

/**
 * Inline spot picker: the spot's name sits in the sentence as a mint-tinted chip with a pin and a chevron, so it reads
 * as something to change rather than more text. A native select is laid over it (keyboard, screen readers and the
 * phone's own picker all work) so it sizes to the chosen name.
 */
export function SpotSelect({ label = "Viewing spot" }: { label?: string }) {
  const { id, options, choose } = useSpotChoice();
  const name = options.find((o) => o.id === id)?.name ?? id;
  return (
    <span className="group relative inline-flex items-baseline gap-[0.3em] rounded-[0.5em] border border-great/45 bg-great/10 px-[0.45em] font-medium whitespace-nowrap text-ink transition-colors hover:border-great/80 hover:bg-great/15 has-[:focus-visible]:border-great/80 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-great/40">
      <svg viewBox="0 0 16 16" className="size-[0.85em] self-center text-great" aria-hidden>
        <path d="M8 14.5s4.5-4.2 4.5-8a4.5 4.5 0 0 0-9 0c0 3.8 4.5 8 4.5 8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="8" cy="6.5" r="1.6" fill="currentColor" />
      </svg>
      {name}
      <svg viewBox="0 0 12 12" className="size-[0.8em] self-center text-great transition-transform group-hover:translate-y-px" aria-hidden>
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        aria-label={label}
        title="Change spot"
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
