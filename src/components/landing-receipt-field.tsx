import type { CSSProperties } from "react";

const receipts = [
  { x: 6, y: 23, size: 72, tilt: -24, drift: 6, seconds: 25, offset: -7 },
  { x: 89, y: 22, size: 62, tilt: 19, drift: -5, seconds: 29, offset: -9 },
  { x: 96, y: 54, size: 90, tilt: -13, drift: -8, seconds: 32, offset: -17 },
  { x: 4, y: 66, size: 54, tilt: 29, drift: -1, seconds: 27, offset: -18 },
  { x: 15, y: 88, size: 83, tilt: -15, drift: -4, seconds: 31, offset: -8 },
  { x: 87, y: 91, size: 67, tilt: 24, drift: 8, seconds: 24, offset: -11 },
  { x: 28, y: 22, size: 66, tilt: 15, drift: -8, seconds: 28, offset: -9 },
  { x: 47, y: 27, size: 46, tilt: -27, drift: 7, seconds: 24, offset: -11 },
  { x: 69, y: 20, size: 102, tilt: -20, drift: 8, seconds: 34, offset: -7 },
  { x: 41, y: 86, size: 92, tilt: 22, drift: -6, seconds: 32, offset: -9 },
  { x: 61, y: 93, size: 57, tilt: -21, drift: 9, seconds: 27, offset: -6 },
  { x: 96, y: 83, size: 48, tilt: 11, drift: 3, seconds: 26, offset: -10 },
];

export function LandingReceiptField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 text-emerald-800 dark:text-emerald-300"
    >
      {receipts.map(({ x, y, size, tilt, drift, seconds, offset }) => {
        const position: CSSProperties & Record<`--receipt-${string}`, string> = {
          left: `${x}%`,
          top: `${y}%`,
          "--receipt-size": `${size}px`,
          "--receipt-tilt": `${tilt}deg`,
          "--receipt-drift": `${drift}vw`,
          "--receipt-period": `${seconds}s`,
          "--receipt-offset": `${offset}s`,
        };

        return (
          <svg
            key={x + ":" + y}
            viewBox="0 0 54 72"
            className="landing-flying-receipt absolute"
            style={position}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 6l4 4 5-4 5 4 5-4 5 4 5-4 5 4 4-4v60l-4-4-5 4-5-4-5 4-5-4-5 4-5-4-4 4z" />
            <path d="M16 22h22M16 32h17M16 42h22M16 52h11" />
          </svg>
        );
      })}
    </div>
  );
}
