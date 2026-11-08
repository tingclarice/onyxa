// Shapes for detecting items that are slowing down.
// A reseller buys an item again when it has sold out, so the purchase history
// tells how fast each item is used up ("burn rate").

export type BaseUnit = "KG" | "LITER" | "PCS";

/** One purchase of an item, in the item's base unit. */
export interface ItemPurchase {
  /** Receipt date, YYYY-MM-DD. */
  date: string;
  /** Quantity in the item's base unit (kg, liter or pcs). */
  quantity: number;
}

/** The most recent receipt line for an item, for display. */
export interface LastPurchaseDetails {
  date: string;
  supplierName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

/** Everything known about how an item has been bought. */
export interface ItemPurchaseHistory {
  itemId: string;
  name: string;
  baseUnit: BaseUnit;
  /** Purchases usable for burn rate, oldest first. */
  purchases: ItemPurchase[];
  lastPurchase: LastPurchaseDetails | null;
}

/** The item's movement, as judged from its burn rate. */
export type MovementStatus =
  | {
      kind: "not_enough_data";
      /** Purchase days found so far (at least MIN_PURCHASES are needed). */
      purchaseDays: number;
    }
  | {
      kind: "normal" | "slowing";
      /** Usual amount used per day (EMA), in the base unit. */
      usualBurnRatePerDay: number;
      /** Highest possible current amount per day: last quantity ÷ days since it was bought. */
      currentBurnRatePerDay: number;
      /** How much the burn rate dropped, in %. 0 when it has not dropped. */
      burnRateDropPercent: number;
      /** How many days the last purchase should last at the usual burn rate. */
      expectedDaysToRunOut: number;
      /** When the last purchase should have run out, YYYY-MM-DD. */
      expectedRunOutDate: string;
      daysSinceLastPurchase: number;
      /** Whole days past the expected run-out date. 0 when not late. */
      restockDelayDays: number;
    };

export interface ItemMovement {
  itemId: string;
  name: string;
  baseUnit: BaseUnit;
  lastPurchase: LastPurchaseDetails | null;
  status: MovementStatus;
}

export interface ItemMovementDetail extends ItemMovement {
  /** Purchases used for the calculation, newest first. */
  purchases: ItemPurchase[];
}

/** What the home-screen warning card needs. */
export interface SlowMovingWarnings {
  /** False when the owner turned slow-moving alerts off in Pengaturan. */
  enabled: boolean;
  slowingItems: ItemMovement[];
}
