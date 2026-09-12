import { ButtonItem, Focusable, PanelSection, PanelSectionRow } from "@decky/ui";
import { callable } from "@decky/api";
import { useState } from "react";

import { locale, t } from "./i18n";
import type { State } from "./types";

const recomputeStats = callable<[], State>("recompute_stats");

export function money(cents: number, currency: string) {
  if (!cents) return "";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency || "EUR" }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`.trim();
  }
}

export function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const muted = { fontSize: "12px", lineHeight: "16px", opacity: 0.7 };
const big = { fontSize: "24px", fontWeight: "bold", lineHeight: "28px" };
const label = { fontSize: "11px", letterSpacing: "1px", opacity: 0.6, textTransform: "uppercase" as const };

/** The statistics, shown in the plugin's own column instead of the main list. */
export function StatsPanel({
  state,
  setState,
  onBack,
}: {
  state: State;
  setState: (s: State) => void;
  onBack: () => void;
}) {
  const [computing, setComputing] = useState(false);
  const { totals, library, claimed } = state;
  const busy = computing || state.computing_stats;
  const free = Math.max(library.count - library.priced, 0);

  const onRecompute = async () => {
    setComputing(true);
    try {
      setState(await recomputeStats());
    } finally {
      setComputing(false);
    }
  };

  return (
    <>
      <PanelSection title={t.statsTitle}>
        <PanelSectionRow>
          <Focusable onActivate={() => {}}>
            <div style={label}>{t.savingsSection}</div>
            <div style={{ ...big, color: "#a4d007" }}>
              {totals.cents > 0 ? money(totals.cents, totals.currency) : "—"}
            </div>
            <div style={muted}>{t.savingsCount(totals.count)}</div>
          </Focusable>
        </PanelSectionRow>
        <PanelSectionRow>
          <Focusable onActivate={() => {}}>
            <div style={label}>{t.libraryTitle}</div>
            <div style={big}>{library.ts ? money(library.cents, library.currency) || "—" : "—"}</div>
            <div style={muted}>
              {library.ts ? t.libraryCount(library.count) : t.libraryNever}
              {library.ts > 0 && <div>{t.libraryPricedSplit(library.priced, free)}</div>}
            </div>
          </Focusable>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy} onClick={onRecompute}>
            {busy ? t.libraryComputing : t.libraryRecalc}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ ...muted, opacity: 0.5 }}>{t.libraryHint}</div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.historySection}>
        {claimed.length === 0 && (
          <PanelSectionRow>
            <div style={muted}>{t.savingsEmpty}</div>
          </PanelSectionRow>
        )}
        {claimed.map((c) => (
          <PanelSectionRow key={`${c.appid}-${c.ts}`}>
            <Focusable style={{ width: "100%" }} onActivate={() => {}}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                </span>
                <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                  {money(c.price_cents || 0, c.currency || totals.currency) || "—"}
                </span>
              </div>
              <div style={muted}>{formatDate(c.ts)}</div>
            </Focusable>
          </PanelSectionRow>
        ))}
      </PanelSection>

      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={onBack}>
            ← {t.back}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}
