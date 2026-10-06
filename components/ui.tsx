import { scoreLabel } from "@/lib/oulu";
import { TONE } from "@/lib/format";

export function Section(props: { id: string; title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={props.id} aria-labelledby={`${props.id}-h`} className="mt-20">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <h2 id={`${props.id}-h`} className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase sm:text-5xl">
          {props.title}
        </h2>
        {props.hint && <p className="font-mono text-xs text-muted">{props.hint}</p>}
      </div>
      {props.children}
    </section>
  );
}

/** Small caps label used on tiles and table heads. */
export const LABEL = "text-[0.7rem] font-semibold tracking-[0.16em] text-muted uppercase sm:text-xs";

export function Score({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const { label, tone } = scoreLabel(value);
  return (
    <span className={`inline-flex items-center gap-2 ${size === "lg" ? "text-base" : "text-sm"} ${TONE[tone].text}`}>
      <span className={`size-1.5 rounded-full ${TONE[tone].dot}`} />
      {label}
      <span className="font-mono text-xs text-faint tabular-nums">{value}</span>
    </span>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-rule bg-tile ${className}`}>{children}</div>;
}

/** Right arrow for links that go somewhere (directions, external pages). */
export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`inline size-[0.9em] shrink-0 align-[-0.1em] ${className}`} aria-hidden>
      <path d="M2.5 8h10M9 4.5 12.5 8 9 11.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Plus that turns into a cross when its <details> opens. */
export function Plus() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-muted transition-transform duration-300 group-open:rotate-45" aria-hidden>
      <path d="M8 2.5v11M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
