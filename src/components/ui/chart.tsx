"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

const ChartContext = React.createContext<ChartConfig>({});

function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  const chartId = React.useId().replace(/:/g, "");

  return (
    <ChartContext.Provider value={config}>
      <div
        data-chart={chartId}
        className={cn(
          "flex w-full justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot]:stroke-background [&_.recharts-layer]:outline-none",
          className,
        )}
      >
        <style>{`
          [data-chart="${chartId}"] {
            ${Object.entries(config)
              .map(([key, value]) => `--color-${key}: ${value.color};`)
              .join("\n")}
          }
        `}</style>
        {children}
      </div>
    </ChartContext.Provider>
  );
}

function useChartConfig() {
  return React.useContext(ChartContext);
}

export { ChartContainer, useChartConfig };
