import { Suspense } from "react";
import { ItemDetail } from "./item-detail";

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div
          aria-label="Memuat detail barang"
          className="mx-auto min-h-[60dvh] max-w-5xl animate-pulse px-4 py-10"
        />
      }
    >
      <ItemDetail params={params} />
    </Suspense>
  );
}
