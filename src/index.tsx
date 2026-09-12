import {
  ButtonItem,
  Navigation,
  PanelSection,
  PanelSectionRow,
  ToggleField,
  staticClasses,
} from "@decky/ui";
import {
  addEventListener,
  callable,
  definePlugin,
  removeEventListener,
  toaster,
} from "@decky/api";
import { useEffect, useState } from "react";

import logo from "../assets/fsg-logo.png";
import { claimMessage, lang, locale, t } from "./i18n";

interface Game {
  appid: number;
  subid: number | null;
  name: string;
  type: string;
  image: string;
  original_price: string;
  ends: string;
  owned: boolean;
}

interface Settings {
  auto_claim: boolean;
  include_dlc: boolean;
  notify: boolean;
  language: string;
  beta: boolean;
}

interface Update {
  current: string;
  latest: string;
  available: boolean;
  rollback: boolean;
  prerelease: boolean;
  channel: string;
  title: string;
  notes: string;
  url: string;
  zip_url: string;
  zip_sha256: string;
}

interface State {
  games: Game[];
  last_check: number;
  logged_in: boolean | null;
  error: string;
  checking: boolean;
  settings: Settings;
  claimed: { appid: number; name: string; ts: number }[];
  version: string;
  update: Update | null;
}

interface ClaimResult {
  ok: boolean;
  code: string;
  detail: string;
}

type ToggleKey = "auto_claim" | "include_dlc" | "notify" | "beta";

const getState = callable<[], State>("get_state");
const refresh = callable<[], State>("refresh");
const claim = callable<[appid: number], ClaimResult>("claim");
const setSetting = callable<[key: string, value: boolean | string], Settings>("set_setting");
const checkUpdate = callable<[], Update | null>("check_update");

const STEAMDB_FREE_URL = "https://steamdb.info/upcoming/free/";
const PLUGIN_NAME = "FSG";
const INSTALL_TYPE_UPDATE = 2; // InstallType.UPDATE in Decky Loader

const muted = { fontSize: "12px", lineHeight: "16px", opacity: 0.7 };

function Logo({ size }: { size: string }) {
  return <img src={logo} style={{ width: size, height: size, borderRadius: "50%" }} />;
}

function openStore(appid: number) {
  const steam = (window as any).SteamClient;
  if (steam?.URL?.ExecuteSteamURL) steam.URL.ExecuteSteamURL(`steam://store/${appid}`);
  else Navigation.NavigateToExternalWeb(`https://store.steampowered.com/app/${appid}/`);
  Navigation.CloseSideMenus();
}

function openWeb(url: string) {
  Navigation.NavigateToExternalWeb(url);
  Navigation.CloseSideMenus();
}

async function installUpdate(update: Update) {
  // Same call as Decky's own store: Decky shows its install prompt, checks the
  // SHA-256 of the zip, then reloads the plugin.
  const backend = (window as any).DeckyBackend;
  if (backend?.call) {
    await backend.call(
      "utilities/install_plugin",
      update.zip_url,
      PLUGIN_NAME,
      update.latest,
      update.zip_sha256,
      INSTALL_TYPE_UPDATE,
    );
  } else {
    openWeb(update.url);
  }
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UpdateBanner({ update }: { update: Update }) {
  const [installing, setInstalling] = useState(false);

  const onInstall = async () => {
    setInstalling(true);
    try {
      await installUpdate(update);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <PanelSection title={t.updateSection}>
      <PanelSectionRow>
        <div style={muted}>
          {t.updateLine(update.latest, update.current)}
          {update.prerelease && ` [${t.betaTag}]`}
          {update.title && <div style={{ fontWeight: "bold" }}>{update.title}</div>}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={installing} onClick={onInstall}>
          {installing
            ? t.installing
            : update.available
              ? t.updateTo(update.latest)
              : t.rollbackTo(update.latest)}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => openWeb(update.url)}>
          {t.seeChanges}
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

function GameCard({
  game,
  claiming,
  onClaim,
}: {
  game: Game;
  claiming: boolean;
  onClaim: (game: Game) => void;
}) {
  let label = t.addToLibrary;
  if (game.owned) label = t.alreadyOwned;
  else if (claiming) label = t.adding;
  else if (!game.subid) label = t.addFromStore;

  return (
    <>
      <PanelSectionRow>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
          {game.image && <img src={game.image} style={{ width: "100%", borderRadius: "4px" }} />}
          <div style={{ fontWeight: "bold" }}>{game.name}</div>
          <div style={muted}>
            {game.original_price && (
              <span style={{ textDecoration: "line-through", marginRight: "6px" }}>
                {game.original_price}
              </span>
            )}
            <span style={{ color: "#a4d007" }}>{t.free}</span>
            {game.type !== "game" && ` · ${t.dlc}`}
          </div>
          {game.ends && <div style={muted}>{game.ends}</div>}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={game.owned || claiming}
          onClick={() => (game.subid ? onClaim(game) : openStore(game.appid))}
        >
          {label}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => openStore(game.appid)}>
          {t.seeOnSteam}
        </ButtonItem>
      </PanelSectionRow>
    </>
  );
}

function Content() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const doRefresh = async () => {
    setBusy(true);
    try {
      setState(await refresh());
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    getState().then(async (s) => {
      setState(s);
      // The backend asks Steam for game names and prices in this language too.
      if (s.settings.language !== lang) {
        const settings = await setSetting("language", lang);
        setState((prev) => (prev ? { ...prev, settings } : prev));
      }
      if (!s.last_check) doRefresh();
    });
    const listener = addEventListener<[State]>("fsg_state", setState);
    return () => {
      removeEventListener("fsg_state", listener);
    };
  }, []);

  const onClaim = async (game: Game) => {
    setClaiming(game.appid);
    try {
      const result = await claim(game.appid);
      toaster.toast({
        title: result.ok ? t.toastAdded : t.toastAddFailed,
        body: result.ok ? game.name : claimMessage(result.code, result.detail),
        logo: <Logo size="100%" />,
      });
      setState(await getState());
    } finally {
      setClaiming(null);
    }
  };

  const onCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const update = await checkUpdate();
      if (update) setState((s) => (s ? { ...s, update } : s));
      if (!update) {
        toaster.toast({ title: t.toastCheckFailed, body: t.toastCheckFailedBody });
      } else if (!update.available) {
        toaster.toast({ title: t.toastUpToDate, body: t.version(update.current), logo: <Logo size="100%" /> });
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const toggle = async (key: ToggleKey, value: boolean) => {
    const settings = await setSetting(key, value);
    setState((s) => (s ? { ...s, settings } : s));
  };

  if (!state) {
    return (
      <PanelSection>
        <PanelSectionRow>
          <div style={muted}>{t.loading}</div>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  const checking = busy || state.checking;

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Logo size="96px" />
          </div>
        </PanelSectionRow>
      </PanelSection>

      {(state.update?.available || state.update?.rollback) && <UpdateBanner update={state.update} />}

      <PanelSection title={t.freeSection}>
        {state.logged_in === false && (
          <PanelSectionRow>
            <div style={{ ...muted, color: "#ffb04a", opacity: 1 }}>{t.noSession}</div>
          </PanelSectionRow>
        )}
        {state.error && (
          <PanelSectionRow>
            <div style={{ ...muted, color: "#ff6b6b", opacity: 1 }}>{t.checkFailed(state.error)}</div>
          </PanelSectionRow>
        )}
        {state.games.length === 0 && !checking && (
          <PanelSectionRow>
            <div style={muted}>{t.noGames}</div>
          </PanelSectionRow>
        )}
        {state.games.map((game) => (
          <GameCard
            key={game.appid}
            game={game}
            claiming={claiming === game.appid}
            onClaim={onClaim}
          />
        ))}
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={checking} onClick={doRefresh}>
            {checking ? t.checking : t.refresh}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={muted}>
            {t.lastCheck(state.last_check ? formatDate(state.last_check) : t.never)}
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.optionsSection}>
        <PanelSectionRow>
          <ToggleField
            label={t.autoClaim}
            description={t.autoClaimHelp}
            checked={state.settings.auto_claim}
            onChange={(v) => toggle("auto_claim", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.includeDlc}
            description={t.includeDlcHelp}
            checked={state.settings.include_dlc}
            onChange={(v) => toggle("include_dlc", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.notifications}
            description={t.notificationsHelp}
            checked={state.settings.notify}
            onChange={(v) => toggle("notify", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.beta}
            description={t.betaHelp}
            checked={state.settings.beta}
            onChange={(v) => toggle("beta", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={checkingUpdate} onClick={onCheckUpdate}>
            {checkingUpdate ? t.searching : t.checkUpdates}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={muted}>
            {t.version(state.version)}
            {state.settings.beta && ` · ${t.betaTag}`}
          </div>
        </PanelSectionRow>
      </PanelSection>

      {state.claimed.length > 0 && (
        <PanelSection title={t.historySection}>
          {state.claimed.map((c) => (
            <PanelSectionRow key={`${c.appid}-${c.ts}`}>
              <div style={muted}>
                {c.name} — {formatDate(c.ts)}
              </div>
            </PanelSectionRow>
          ))}
        </PanelSection>
      )}

      <PanelSection title={t.upcomingSection}>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => openWeb(STEAMDB_FREE_URL)}>
            {t.openSteamDB}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}

export default definePlugin(() => {
  const onClaimed = addEventListener<[name: string, appid: number]>(
    "fsg_claimed",
    (name, appid) =>
      toaster.toast({
        title: t.toastAdded,
        body: name,
        logo: <Logo size="100%" />,
        onClick: () => openStore(appid),
      }),
  );
  const onNew = addEventListener<[name: string, appid: number]>(
    "fsg_new",
    (name, appid) =>
      toaster.toast({
        title: t.toastFreeGame,
        body: name,
        logo: <Logo size="100%" />,
        onClick: () => openStore(appid),
      }),
  );
  const onUpdate = addEventListener<[version: string, title: string]>(
    "fsg_update",
    (version, title) =>
      toaster.toast({
        title: t.toastUpdate(version),
        body: title || t.toastUpdateBody,
        logo: <Logo size="100%" />,
      }),
  );

  return {
    name: "FSG",
    titleView: (
      <div
        className={staticClasses.Title}
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        <Logo size="24px" />
        Free Steam Game
      </div>
    ),
    content: <Content />,
    icon: <Logo size="1em" />,
    onDismount() {
      removeEventListener("fsg_claimed", onClaimed);
      removeEventListener("fsg_new", onNew);
      removeEventListener("fsg_update", onUpdate);
    },
  };
});
