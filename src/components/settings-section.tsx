import type { ReactNode } from "react";

/** A settings block: title and description on the left, content on the right. */
export function SettingsSection({
  id,
  title,
  description,
  children,
  last = false,
}: {
  id: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`grid items-start gap-6 lg:grid-cols-[1fr_1.4fr] ${last ? "" : "border-b pb-8"}`}
    >
      <div className="space-y-2">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
