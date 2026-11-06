"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  getInsights,
  type Insight,
  type InsightType,
} from "@/lib/api/insights";
import { cn } from "@/lib/utils";

const severityStyles = {
  warning: {
    iconClass:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    cardClass: "border-amber-200 dark:border-amber-900",
  },
  attention: {
    iconClass: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
    cardClass: "border-red-200 dark:border-red-900",
  },
};

const insightStyles: Record<
  InsightType,
  {
    icon: typeof TrendingUp;
    action: string;
  }
> = {
  "price-increase": {
    icon: TrendingUp,
    action: "Lihat riwayat harga",
  },
  "slow-moving": {
    icon: Clock3,
    action: "Abaikan",
  },
  "needs-review": {
    icon: AlertTriangle,
    action: "Abaikan",
  },
};

function InsightSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl border bg-card p-5"
    >
      <div className="flex gap-4">
        <div className="size-12 shrink-0 rounded-xl bg-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-3/4 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-12 w-40 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  insight,
  onDismiss,
}: {
  insight: Insight;
  onDismiss: (id: string) => void;
}) {
  const styles = insightStyles[insight.type];
  const severity = severityStyles[insight.severity];
  const Icon = styles.icon;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 sm:p-5",
        severity.cardClass,
      )}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12",
            severity.iconClass,
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-semibold leading-6">
            {insight.title}
          </h2>
          <p className="mt-2 text-base leading-6 text-muted-foreground">
            {insight.explanation}
          </p>
          <div className="mt-4">
            {insight.type === "price-increase" ? (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/transaksi">
                  {styles.action}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onDismiss(insight.id)}
              >
                <Check aria-hidden="true" />
                {styles.action}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BerandaPage() {
  const insightsQuery = useQuery({
    queryKey: ["insights"],
    queryFn: getInsights,
  });
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const insights = (insightsQuery.data ?? []).filter(
    (insight) => !dismissedIds.includes(insight.id),
  );

  function dismissInsight(id: string) {
    setDismissedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <header className="mb-7 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Ringkasan usaha
        </p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Beranda
        </h1>
        <p className="text-base text-muted-foreground">
          Hal penting dari catatan belanja Anda.
        </p>
      </header>

      <section aria-labelledby="insights-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="insights-title" className="text-lg font-semibold">
            Peringatan untuk Anda
          </h2>
          {!insightsQuery.isPending &&
            !insightsQuery.isError &&
            insights.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {insights.length} hal
              </span>
            )}
        </div>

        {insightsQuery.isPending ? (
          <div className="space-y-3" aria-label="Memuat peringatan">
            <InsightSkeleton />
            <InsightSkeleton />
            <InsightSkeleton />
          </div>
        ) : insightsQuery.isError ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-5 py-10 text-center"
          >
            <p className="text-base text-muted-foreground">
              Peringatan belum bisa dimuat. Coba lagi sebentar lagi.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void insightsQuery.refetch()}
            >
              Coba lagi
            </Button>
          </div>
        ) : insights.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-5 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <Check aria-hidden="true" className="size-6" />
            </span>
            <p className="text-base text-muted-foreground">
              Belum ada peringatan. Unggah beberapa nota dulu ya.
            </p>
            <Button asChild>
              <Link href="/scan">
                Unggah nota
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onDismiss={dismissInsight}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
