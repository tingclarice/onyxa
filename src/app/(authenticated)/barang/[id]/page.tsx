import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { formatDate, formatRupiah } from "@/lib/utils/format";
import { getActiveBusinessItemDetail } from "@/features/inventory-intelligence/server";
import { MovementExplanation } from "@/features/inventory-intelligence/ui/movement-explanation";
import { PurchaseHistoryList } from "@/features/inventory-intelligence/ui/purchase-history-list";
import { unitLabel } from "@/features/inventory-intelligence/ui/movement-format";

// Reads the active business from the session, so it renders on the server per request.
export const instant = false;

/** /barang/[id] — one item: is it slowing down, and its purchase history. */
export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const itemId = z.uuid().safeParse(id);
  if (!itemId.success) notFound();

  const item = await getActiveBusinessItemDetail(itemId.data);
  if (!item) notFound();
  const last = item.lastPurchase;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 px-4 py-6 sm:px-6 md:py-10">
      <header className="space-y-4">
        <Link
          href="/barang"
          className="inline-flex min-h-12 items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          Kembali ke barang
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {item.name}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Satuan dasar: {unitLabel(item.baseUnit)}
            {last &&
              ` · terakhir ${formatRupiah(last.unitPrice)}/${last.unit} dari ${last.supplierName} (${formatDate(last.date)})`}
          </p>
        </div>
      </header>

      <MovementExplanation item={item} />
      <PurchaseHistoryList purchases={item.purchases} baseUnit={item.baseUnit} />
    </div>
  );
}
