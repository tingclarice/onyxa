import { getActiveBusinessItemMovements } from "@/features/inventory-intelligence/server";
import { ItemMovementList } from "@/features/inventory-intelligence/ui/item-movement-list";

// Reads the active business from the session, so it renders on the server per request.
export const instant = false;

/** /barang — every item from saved receipts, slowing items first. */
export default async function BarangPage() {
  const items = await getActiveBusinessItemMovements();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Barang
        </h1>
        <p className="text-base text-muted-foreground">
          Barang dari nota yang sudah kamu simpan. Barang yang melambat ada di
          paling atas.
        </p>
      </header>

      <ItemMovementList items={items} />
    </div>
  );
}
