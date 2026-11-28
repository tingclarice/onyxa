import { AlertTriangle } from "lucide-react";
import { formatDate, formatRupiah } from "@/lib/utils/format";
import type { ItemMovementDetail } from "../types/inventory";
import { formatDays, formatPerDay, formatQuantity } from "./movement-format";
import { SpeedflowBadge } from "./speedflow-badge";
import { StockOpnameForm } from "./stock-opname-form";

interface OpnameAuditSectionProps {
  item: ItemMovementDetail;
  defaultDate: string;
}

export function OpnameAuditSection({
  item,
  defaultDate,
}: OpnameAuditSectionProps) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Speedflow &amp; Stock Opname
          </h2>
          <p className="text-sm text-muted-foreground">
            Kecepatan keluar aktual berdasarkan anchor stock opname atau estimasi rolling restock.
          </p>
        </div>
        <SpeedflowBadge speedflow={item.speedflow} baseUnit={item.baseUnit} />
      </div>

      <StockOpnameForm
        itemId={item.itemId}
        baseUnit={item.baseUnit}
        defaultDate={defaultDate}
      />

      {item.audits.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="border-b px-4 py-3 sm:px-5">
            <h3 className="text-base font-semibold">
              Rekonsiliasi Opname (Audit Periode)
            </h3>
            <p className="text-sm text-muted-foreground">
              Perhitungan unit keluar dan HPP aktual di antara dua titik stock opname.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Periode</th>
                  <th className="px-4 py-2.5 font-medium">Stok awal</th>
                  <th className="px-4 py-2.5 font-medium">Restock</th>
                  <th className="px-4 py-2.5 font-medium">Stok akhir</th>
                  <th className="px-4 py-2.5 font-medium">Keluar aktual</th>
                  <th className="px-4 py-2.5 font-medium">Kecepatan</th>
                  <th className="px-4 py-2.5 font-medium">HPP aktual</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {item.audits.map((audit) => (
                  <tr
                    key={`${audit.fromSnapshot.id}-${audit.toSnapshot.id}`}
                    className="align-top"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium">
                        {formatDate(audit.fromSnapshot.recordedAt.slice(0, 10))} –{" "}
                        {formatDate(audit.toSnapshot.recordedAt.slice(0, 10))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDays(audit.days)}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatQuantity(audit.fromSnapshot.postEventStock, item.baseUnit)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatQuantity(audit.restockedQty, item.baseUnit)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatQuantity(audit.toSnapshot.countedQty, item.baseUnit)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <div className="font-medium">
                        {formatQuantity(audit.actualUnitsOut, item.baseUnit)}
                      </div>
                      {audit.hasCountDiscrepancy && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                          <AlertTriangle aria-hidden="true" className="size-3" />
                          COUNT_DISCREPANCY
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatPerDay(audit.auditSpeedflow, item.baseUnit)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {audit.actualCOGS !== null
                        ? formatRupiah(audit.actualCOGS)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {item.snapshots.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="border-b px-4 py-3 sm:px-5">
            <h3 className="text-base font-semibold">Riwayat Titik Opname</h3>
          </div>
          <ul className="divide-y text-sm">
            {item.snapshots.map((snapshot) => (
              <li
                key={snapshot.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
              >
                <div>
                  <span className="font-medium">
                    {formatDate(snapshot.recordedAt.slice(0, 10))}
                  </span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {snapshot.source === "INLINE_RESTOCK"
                      ? "Saat restock"
                      : "Opname mandiri"}
                  </span>
                </div>
                <div className="text-right tabular-nums text-muted-foreground">
                  Hitung:{" "}
                  <span className="font-medium text-foreground">
                    {formatQuantity(snapshot.countedQty, item.baseUnit)}
                  </span>
                  {snapshot.source === "INLINE_RESTOCK" && (
                    <>
                      {" "}
                      → Baseline baru:{" "}
                      <span className="font-medium text-foreground">
                        {formatQuantity(snapshot.postEventStock, item.baseUnit)}
                      </span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
