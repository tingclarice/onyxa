export type ItemPricePoint = {
  date: string;
  price: number;
};

export type ItemSupplierPrice = {
  supplier: string;
  latest_price: number;
  last_purchase_date: string;
};

export type MasterItem = {
  id: string;
  name: string;
  base_unit: "kg" | "liter" | "pcs";
  latest_price: number;
  last_purchase_date: string;
  price_rose: boolean;
  price_change_percent?: number;
  price_history: ItemPricePoint[];
  suppliers: ItemSupplierPrice[];
  aliases: string[];
};

const mockItems: MasterItem[] = [
  {
    id: "gula-pasir",
    name: "Gula Pasir",
    base_unit: "kg",
    latest_price: 18400,
    last_purchase_date: "2026-11-05",
    price_rose: true,
    price_change_percent: 8,
    price_history: [
      { date: "2026-06-05", price: 16500 },
      { date: "2026-07-05", price: 16800 },
      { date: "2026-08-05", price: 17000 },
      { date: "2026-09-05", price: 17000 },
      { date: "2026-10-05", price: 17000 },
      { date: "2026-11-05", price: 18400 },
    ],
    suppliers: [
      {
        supplier: "Toko Grosir Jaya",
        latest_price: 18400,
        last_purchase_date: "2026-11-05",
      },
      {
        supplier: "Pasar Segar Bu Rina",
        latest_price: 18000,
        last_purchase_date: "2026-10-28",
      },
    ],
    aliases: ["GULA PASIR 50KG", "GP 50 kg"],
  },
  {
    id: "tepung-terigu",
    name: "Tepung Terigu",
    base_unit: "kg",
    latest_price: 13500,
    last_purchase_date: "2026-08-23",
    price_rose: false,
    price_history: [
      { date: "2026-04-23", price: 13200 },
      { date: "2026-05-23", price: 13500 },
      { date: "2026-06-23", price: 13500 },
      { date: "2026-07-23", price: 13500 },
      { date: "2026-08-23", price: 13500 },
    ],
    suppliers: [
      {
        supplier: "Aneka Bahan Kue",
        latest_price: 13500,
        last_purchase_date: "2026-08-23",
      },
    ],
    aliases: ["Terigu protein sedang", "TEPUNG 1KG"],
  },
  {
    id: "minyak-goreng",
    name: "Minyak Goreng",
    base_unit: "liter",
    latest_price: 18500,
    last_purchase_date: "2026-11-04",
    price_rose: false,
    price_history: [
      { date: "2026-07-04", price: 19000 },
      { date: "2026-08-04", price: 19000 },
      { date: "2026-09-04", price: 18800 },
      { date: "2026-10-04", price: 18500 },
      { date: "2026-11-04", price: 18500 },
    ],
    suppliers: [
      {
        supplier: "Pasar Segar Bu Rina",
        latest_price: 18500,
        last_purchase_date: "2026-11-04",
      },
      {
        supplier: "Toko Grosir Jaya",
        latest_price: 18700,
        last_purchase_date: "2026-10-29",
      },
    ],
    aliases: ["Minyak kita 2L", "M.Goreng"],
  },
  {
    id: "telur-ayam",
    name: "Telur Ayam",
    base_unit: "kg",
    latest_price: 28000,
    last_purchase_date: "2026-11-05",
    price_rose: false,
    price_history: [
      { date: "2026-07-05", price: 27000 },
      { date: "2026-08-05", price: 27500 },
      { date: "2026-09-05", price: 27500 },
      { date: "2026-10-05", price: 28000 },
      { date: "2026-11-05", price: 28000 },
    ],
    suppliers: [
      {
        supplier: "Pasar Segar Bu Rina",
        latest_price: 28000,
        last_purchase_date: "2026-11-05",
      },
      {
        supplier: "Berkah Frozen Food",
        latest_price: 28500,
        last_purchase_date: "2026-10-25",
      },
    ],
    aliases: ["Telor ayam", "Telur 1 krat"],
  },
  {
    id: "gelas-plastik",
    name: "Gelas Plastik",
    base_unit: "pcs",
    latest_price: 450,
    last_purchase_date: "2026-11-02",
    price_rose: false,
    price_history: [
      { date: "2026-07-02", price: 500 },
      { date: "2026-08-02", price: 500 },
      { date: "2026-09-02", price: 480 },
      { date: "2026-10-02", price: 450 },
      { date: "2026-11-02", price: 450 },
    ],
    suppliers: [
      {
        supplier: "Toko Grosir Jaya",
        latest_price: 450,
        last_purchase_date: "2026-11-02",
      },
    ],
    aliases: ["Cup 16 oz", "Gelas bening"],
  },
];

function cloneItem(item: MasterItem): MasterItem {
  return {
    ...item,
    price_history: item.price_history.map((point) => ({ ...point })),
    suppliers: item.suppliers.map((supplier) => ({ ...supplier })),
    aliases: [...item.aliases],
  };
}

export async function getItems(): Promise<MasterItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return mockItems.map(cloneItem);
}

export async function getItem(id: string): Promise<MasterItem | null> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const item = mockItems.find((candidate) => candidate.id === id);
  return item ? cloneItem(item) : null;
}

export async function addItemAlias(
  itemId: string,
  alias: string,
): Promise<MasterItem> {
  const item = mockItems.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error("Barang tidak ditemukan.");
  const normalizedAlias = alias.trim();
  if (!normalizedAlias) throw new Error("Nama alias harus diisi.");
  if (
    item.aliases.some(
      (existingAlias) =>
        existingAlias.toLocaleLowerCase("id-ID") ===
        normalizedAlias.toLocaleLowerCase("id-ID"),
    )
  ) {
    throw new Error("Alias ini sudah ada.");
  }

  item.aliases.push(normalizedAlias);
  return cloneItem(item);
}

export async function removeItemAlias(
  itemId: string,
  alias: string,
): Promise<MasterItem> {
  const item = mockItems.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error("Barang tidak ditemukan.");

  item.aliases = item.aliases.filter((existingAlias) => existingAlias !== alias);
  return cloneItem(item);
}
