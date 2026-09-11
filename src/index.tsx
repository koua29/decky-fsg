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
}

interface Update {
  current: string;
  latest: string;
  available: boolean;
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
  message: string;
}

const getState = callable<[], State>("get_state");
const refresh = callable<[], State>("refresh");
const claim = callable<[appid: number], ClaimResult>("claim");
const setSetting = callable<[key: keyof Settings, value: boolean], Settings>("set_setting");
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
  return new Date(ts * 1000).toLocaleString("fr-FR", {
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
    <PanelSection title="Mise à jour disponible">
      <PanelSectionRow>
        <div style={muted}>
          Version {update.latest} disponible (installée : {update.current}).
          {update.title && <div style={{ fontWeight: "bold" }}>{update.title}</div>}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={installing} onClick={onInstall}>
          {installing ? "Installation…" : `Mettre à jour vers ${update.latest}`}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => openWeb(update.url)}>
          Voir les nouveautés
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
  let label = "Ajouter à ma bibliothèque";
  if (game.owned) label = "✓ Déjà dans ta bibliothèque";
  else if (claiming) label = "Ajout en cours…";
  else if (!game.subid) label = "Ajouter depuis le Store";

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
            <span style={{ color: "#a4d007" }}>Gratuit</span>
            {game.type !== "game" && " · DLC"}
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
          Voir la fiche Steam
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
    getState().then((s) => {
      setState(s);
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
        title: result.ok ? "🎁 Ajouté à ta bibliothèque" : "Ajout impossible",
        body: result.ok ? game.name : result.message,
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
        toaster.toast({ title: "Vérification impossible", body: "GitHub injoignable, réessaie plus tard." });
      } else if (!update.available) {
        toaster.toast({ title: "FSG est à jour", body: `Version ${update.current}`, logo: <Logo size="100%" /> });
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const toggle = async (key: keyof Settings, value: boolean) => {
    const settings = await setSetting(key, value);
    setState((s) => (s ? { ...s, settings } : s));
  };

  if (!state) {
    return (
      <PanelSection>
        <PanelSectionRow>
          <div style={muted}>Chargement…</div>
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

      {state.update?.available && <UpdateBanner update={state.update} />}

      <PanelSection title="Gratuits à garder">
        {state.logged_in === false && (
          <PanelSectionRow>
            <div style={{ ...muted, color: "#ffb04a", opacity: 1 }}>
              Session Steam introuvable : ouvre le Store une fois, puis actualise.
            </div>
          </PanelSectionRow>
        )}
        {state.error && (
          <PanelSectionRow>
            <div style={{ ...muted, color: "#ff6b6b", opacity: 1 }}>{state.error}</div>
          </PanelSectionRow>
        )}
        {state.games.length === 0 && !checking && (
          <PanelSectionRow>
            <div style={muted}>Aucun jeu remisé à 100 % sur Steam en ce moment.</div>
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
            {checking ? "Vérification…" : "Actualiser"}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={muted}>
            Dernière vérification : {state.last_check ? formatDate(state.last_check) : "jamais"}
          </div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title="Options">
        <PanelSectionRow>
          <ToggleField
            label="Ajout automatique"
            description="Ajoute tout seul chaque nouveau jeu remisé à 100 % (vérification toutes les heures)."
            checked={state.settings.auto_claim}
            onChange={(v) => toggle("auto_claim", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Inclure les DLC"
            description="Affiche aussi les DLC et bandes-son offerts."
            checked={state.settings.include_dlc}
            onChange={(v) => toggle("include_dlc", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label="Notifications"
            description="Prévient quand un jeu est détecté ou ajouté, ou qu'une mise à jour sort."
            checked={state.settings.notify}
            onChange={(v) => toggle("notify", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={checkingUpdate} onClick={onCheckUpdate}>
            {checkingUpdate ? "Recherche…" : "Vérifier les mises à jour"}
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={muted}>Version {state.version}</div>
        </PanelSectionRow>
      </PanelSection>

      {state.claimed.length > 0 && (
        <PanelSection title="Récemment ajoutés">
          {state.claimed.map((c) => (
            <PanelSectionRow key={`${c.appid}-${c.ts}`}>
              <div style={muted}>
                {c.name} — {formatDate(c.ts)}
              </div>
            </PanelSectionRow>
          ))}
        </PanelSection>
      )}

      <PanelSection title="Promos à venir">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => openWeb(STEAMDB_FREE_URL)}>
            Ouvrir SteamDB
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
        title: "🎁 Ajouté à ta bibliothèque",
        body: name,
        logo: <Logo size="100%" />,
        onClick: () => openStore(appid),
      }),
  );
  const onNew = addEventListener<[name: string, appid: number]>(
    "fsg_new",
    (name, appid) =>
      toaster.toast({
        title: "Jeu gratuit sur Steam",
        body: name,
        logo: <Logo size="100%" />,
        onClick: () => openStore(appid),
      }),
  );
  const onUpdate = addEventListener<[version: string, title: string]>(
    "fsg_update",
    (version, title) =>
      toaster.toast({
        title: `Mise à jour FSG ${version} disponible`,
        body: title || "Ouvre FSG dans le menu Decky pour l'installer.",
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
