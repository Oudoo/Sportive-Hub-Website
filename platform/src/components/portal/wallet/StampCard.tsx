import { cx } from "@/components/ui";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 11h17v9.5h-17zM2.5 7h19v4h-19zM12 7v13.5M12 7c-1.5 0-4.5-.5-4.5-2.5S10 2 12 7zm0 0c1.5 0 4.5-.5 4.5-2.5S14 2 12 7z" />
    </svg>
  );
}

/**
 * The 2×4 stamp grid: one stamp per attended session, the last slot is the gift.
 * Works on the dark wallet (default) and on the light admin pages.
 */
export function StampCard({ count, size, rewardName, cardsCompleted, light = false }: { count: number; size: number; rewardName: string | null; cardsCompleted: number; light?: boolean }) {
  const cells = Array.from({ length: size }, (_, i) => i);
  const cols = size % 4 === 0 ? 4 : size % 3 === 0 ? 3 : size <= 6 ? size : 4;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className={cx("text-[11px] uppercase tracking-[0.2em]", light ? "text-olive" : "text-leaf")}>Stamp card</div>
          <div className={cx("mt-1 text-lg font-medium", light ? "text-charcoal" : "text-mist")}>
            {count} of {size} stamped
          </div>
        </div>
        <div className={cx("text-xs", light ? "text-olive" : "text-mist/70")}>
          {rewardName ? `Full card: ${rewardName}` : "Full card: a gift from us"}
          {cardsCompleted > 0 ? ` · ${cardsCompleted} completed` : ""}
        </div>
      </div>
      <ol className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-label="Stamps">
        {cells.map((i) => {
          const filled = i < count;
          const gift = i === size - 1;
          return (
            <li
              key={i}
              aria-label={gift ? (filled ? "Gift earned" : "Gift") : filled ? "Stamped" : "Empty"}
              className={cx(
                "flex aspect-square items-center justify-center rounded-full border-2 text-base font-medium transition-colors",
                filled ? "border-emerald bg-emerald text-mist" : gift ? (light ? "border-dashed border-olive text-olive" : "border-dashed border-leaf/70 text-leaf") : light ? "border-charcoal/20 text-charcoal/40" : "border-pine/70 text-pine",
              )}
            >
              {gift ? <GiftIcon /> : filled ? <CheckIcon /> : i + 1}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
