import { DialogButton, Focusable, Navigation } from "@decky/ui";
import { callable } from "@decky/api";
import { useEffect, useState } from "react";

import logo from "../assets/fsg-logo.png";
import { locale, t } from "./i18n";
import type { State } from "./types";

const getState = callable<[], State>("get_state");
const recomputeStats = callable<[], State>("recompute_stats");

export const STATS_ROUTE = "/fsg-stats";

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

const page: React.CSSProperties = {
  padding: "32px 48px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  height: "100%",
  overflowY: "auto",
};
const card: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  borderRadius: "8px",
  padding: "18px 22px",
};
const big = { fontSize: "34px", fontWeight: "bold", lineHeight: "40px" };
const label = { fontSize: "14px", textTransform: "uppercase" as const, letterSpacing: "1px", opacity: 0.6 };
const note = { fontSize: "14px", opacity: 0.6, marginTop: "4px" };

export function StatsPage() {
  const [state, setState] = useState<State | null>(null);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    getState().then(setState);
  }, []);

  const onRecompute = async () => {
    setComputing(true);
    try {
      setState(await recomputeStats());
    } finally {
      setComputing(false);
    }
  };

  if (!state) return <div style={page}>{t.loading}</div>;

  const { totals, library, claimed } = state;
  const busy = computing || state.computing_stats;
  const free = Math.max(library.count - library.priced, 0);

  return (
    <div style={page}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <img src={logo} style={{ width: "48px", height: "48px", borderRadius: "50%" }} />
        <div style={{ fontSize: "26px", fontWeight: "bold" }}>{t.statsTitle}</div>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ ...card, flex: "1 1 300px" }}>
          <div style={label}>{t.savingsSection}</div>
          <div style={big}>{totals.cents > 0 ? money(totals.cents, totals.currency) : "—"}</div>
          <div style={note}>{t.savingsCount(totals.count)}</div>
        </div>
        <div style={{ ...card, flex: "1 1 300px" }}>
          <div style={label}>{t.libraryTitle}</div>
          <div style={big}>{library.ts ? money(library.cents, library.currency) || "—" : "—"}</div>
          <div style={note}>
            {library.ts ? t.libraryCount(library.count) : t.libraryNever}
            {library.ts > 0 && <div>{t.libraryPricedSplit(library.priced, free)}</div>}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={label}>{t.historySection}</div>
        {claimed.length === 0 && <div style={note}>{t.savingsEmpty}</div>}
        {claimed.map((c) => (
          <div
            key={`${c.appid}-${c.ts}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              padding: "6px 0",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
            <span style={{ opacity: 0.6, whiteSpace: "nowrap" }}>{formatDate(c.ts)}</span>
            <span style={{ fontWeight: "bold", whiteSpace: "nowrap", minWidth: "80px", textAlign: "right" }}>
              {money(c.price_cents || 0, c.currency || totals.currency) || "—"}
            </span>
          </div>
        ))}
      </div>

      <div style={note}>{t.libraryHint}</div>

      <Focusable style={{ display: "flex", gap: "16px" }}>
        <DialogButton disabled={busy} onClick={onRecompute}>
          {busy ? t.libraryComputing : t.libraryRecalc}
        </DialogButton>
        <DialogButton onClick={() => Navigation.NavigateBack()}>{t.back}</DialogButton>
      </Focusable>
    </div>
  );
}
