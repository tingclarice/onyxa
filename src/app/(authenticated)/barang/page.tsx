import { getActiveBusinessItemMovements } from "@/features/inventory-intelligence/server";
import { ItemMovementList } from "@/features/inventory-intelligence/ui/item-movement-list";
import { getActiveBusinessItemPrices } from "@/features/procurement-pricing/server";
import { PriceVarianceBadge } from "@/features/procurement-pricing/ui/price-variance-badge";
import { formatRupiah } from "@/lib/utils/format";

// Reads the active business from the session, so it renders on the server per request.
export const instant = false;

export default async function BarangPage() {
  const [items, priceSummaries] = await Promise.all([
    getActiveBusinessItemMovements(),
    getActiveBusinessItemPrices(),
  ]);

  const priceCells = Object.fromEntries(priceSummaries.filter((price) => price.purchaseCount > 0).map((price) => [
    price.itemId,
    <div key={price.itemId} className="space-y-1">
      <PriceVarianceBadge alertLevel={price.alertLevel} variancePercent={price.latestVariancePercent} purchaseCount={price.purchaseCount} />
      {price.previousEmaUnitPrice !== null && (
        <p className="text-xs text-muted-foreground">EMA {formatRupiah(price.previousEmaUnitPrice)}/{price.normalizedUnit.toLowerCase()}</p>
      )}
      {price.cheapestAlternative && (
        <p className="text-xs text-muted-foreground">
          Lebih murah di {price.cheapestAlternative.recommendedSupplierName} · {formatRupiah(price.cheapestAlternative.recommendedLatestUnitPrice)}/{price.cheapestAlternative.normalizedUnit.toLowerCase()}
        </p>
      )}
    </div>,
  ]));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Barang
        </h1>
        <p className="text-base text-muted-foreground">
          Kelola katalog barang dan pantau harga beli serta pergerakan setiap barang.
        </p>
      </header>

      <ItemMovementList items={items} priceCells={priceCells} />
    </div>
  );
}
