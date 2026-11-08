import Link from "next/link";
import { CircleCheck, TrendingDown } from "lucide-react";
import type { SlowMovingWarnings } from "../types/inventory";
import { formatDays } from "./movement-format";

const ITEMS_SHOWN = 5;

/**
 * Home-screen warnings. Shows the slowing items with how much their burn
 * rate dropped and how late restocking is, or "Semua aman" when none.
 */
export function SlowMovingWarningCard({ warnings }: { warnings: SlowMovingWarnings }) {
  const { enabled, slowingItems } = warnings;

  return (
    <section
      aria-labelledby="warnings-title"
      className="space-y-4 rounded-2xl border p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="warnings-title" className="text-lg font-semibold">
          Peringatan
        </h2>
        {enabled && slowingItems.length > 0 && (
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {slowingItems.length} barang melambat
          </p>
        )}
      </div>

      {!enabled ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Peringatan barang melambat sedang dimatikan.{" "}
          <Link href="/pengaturan" className="font-medium text-accent underline-offset-4 hover:underline">
            Ubah di Pengaturan
          </Link>
        </p>
      ) : slowingItems.length === 0 ? (
        <p className="flex items-center gap-2 text-base text-green-800 dark:text-green-200">
          <CircleCheck aria-hidden="true" className="size-5" />
          Semua aman
        </p>
      ) : (
        <>
          <ul className="divide-y">
            {slowingItems.slice(0, ITEMS_SHOWN).map((item) =>
              item.status.kind === "slowing" ? (
                <li key={item.itemId}>
                  <Link
                    href={`/barang/${item.itemId}`}
                    className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:text-accent"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <TrendingDown aria-hidden="true" className="size-4 text-amber-700" />
                      {item.name}
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      turun {item.status.burnRateDropPercent}% · terlambat{" "}
                      {formatDays(item.status.restockDelayDays)}
                    </span>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
          {slowingItems.length > ITEMS_SHOWN && (
            <Link
              href="/barang"
              className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Lihat {slowingItems.length - ITEMS_SHOWN} barang lainnya
            </Link>
          )}
        </>
      )}
    </section>
  );
}
