import { getActiveBusinessItemMovements } from "@/features/inventory-intelligence/server";
import { ItemMovementList } from "@/features/inventory-intelligence/ui/item-movement-list";
import { getActiveBusinessItemPrices } from "@/features/procurement-pricing/server";

// Reads the active business from the session, so it renders on the server per request.
export const instant = false;

/** /barang — every item from saved receipts, slowing items first. */
export default async function BarangPage() {
  const [items, priceSummaries] = await Promise.all([
    getActiveBusinessItemMovements(),
    getActiveBusinessItemPrices(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Barang
        </h1>
        <p className="text-base text-muted-foreground">
          Barang dari nota yang sudah kamu simpan. Pantau pergerakan stok dan
          fluktuasi harga supplier (EMA).
        </p>
      </header>

      <ItemMovementList items={items} priceSummaries={priceSummaries} />
    </div>
  );
}
