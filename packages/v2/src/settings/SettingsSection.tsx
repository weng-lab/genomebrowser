import type { ReactNode } from "react";

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: "8px" }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      {children}
    </section>
  );
}
