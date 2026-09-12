/** Interface language: taken from Steam itself, English unless the client is in French. */

export type Lang = "en" | "fr";

function steamLocale(): string {
  const w = window as any;
  const manager = w.LocalizationManager;
  const candidates = [
    manager?.m_rgLocalesToUse?.[0],
    manager?.GetPreferredLocales?.()?.[0],
    manager?.m_strPreferredLanguage,
    navigator?.language,
  ];
  const found = candidates.find((c) => typeof c === "string" && c.length >= 2);
  return (found || "en").toLowerCase();
}

export const lang: Lang = steamLocale().startsWith("fr") ? "fr" : "en";
export const locale = lang === "fr" ? "fr-FR" : "en-US";

const en = {
  loading: "Loading…",

  updateSection: "Update available",
  updateLine: (latest: string, current: string) => `Version ${latest} is out (installed: ${current}).`,
  installing: "Installing…",
  updateTo: (version: string) => `Update to ${version}`,
  seeChanges: "What's new",

  freeSection: "Free to keep",
  noSession: "No Steam session found: open the Store once, then refresh.",
  checkFailed: (detail: string) => `Check failed: ${detail}`,
  noGames: "No Steam game is 100% off right now.",
  free: "Free",
  dlc: "DLC",
  addToLibrary: "Add to my library",
  alreadyOwned: "✓ Already in your library",
  adding: "Adding…",
  addFromStore: "Add from the Store",
  seeOnSteam: "Open the Steam page",
  refresh: "Refresh",
  checking: "Checking…",
  lastCheck: (date: string) => `Last check: ${date}`,
  never: "never",

  optionsSection: "Options",
  autoClaim: "Automatic add",
  autoClaimHelp: "Adds every new 100%-off game on its own (hourly check).",
  includeDlc: "Include DLC",
  includeDlcHelp: "Also shows free DLC and soundtracks.",
  notifications: "Notifications",
  notificationsHelp: "Tells you when a game is found or added, or when an update is out.",
  beta: "Beta versions",
  betaHelp: "Also offers test builds. They come earlier, and can be unstable.",
  checkUpdates: "Check for updates",
  searching: "Checking…",
  version: (version: string) => `Version ${version}`,

  historySection: "Recently added",
  betaTag: "beta",
  rollbackTo: (version: string) => `Back to stable ${version}`,
  upcomingSection: "Upcoming promos",
  openSteamDB: "Open SteamDB",

  toastAdded: "🎁 Added to your library",
  toastAddFailed: "Could not add the game",
  toastFreeGame: "Free game on Steam",
  toastUpToDate: "FSG is up to date",
  toastCheckFailed: "Check failed",
  toastCheckFailedBody: "GitHub is unreachable, try again later.",
  toastUpdate: (version: string) => `FSG ${version} is available`,
  toastUpdateBody: "Open FSG in the Decky menu to install it.",

  claim: {
    not_found: "Game not found, refresh the list.",
    no_session: "No Steam session found: open the Store once, then try again.",
    no_subid: "No free licence found: use the Store page instead.",
    network_error: (detail: string) => `Network error: ${detail}`,
    http_error: (detail: string) => `Steam refused the request (HTTP ${detail}).`,
    not_confirmed: "Steam did not confirm the addition.",
    added: "Added to your library.",
  },
};

const fr: typeof en = {
  loading: "Chargement…",

  updateSection: "Mise à jour disponible",
  updateLine: (latest, current) => `Version ${latest} disponible (installée : ${current}).`,
  installing: "Installation…",
  updateTo: (version) => `Mettre à jour vers ${version}`,
  seeChanges: "Voir les nouveautés",

  freeSection: "Gratuits à garder",
  noSession: "Session Steam introuvable : ouvre le Store une fois, puis actualise.",
  checkFailed: (detail) => `Vérification impossible : ${detail}`,
  noGames: "Aucun jeu remisé à 100 % sur Steam en ce moment.",
  free: "Gratuit",
  dlc: "DLC",
  addToLibrary: "Ajouter à ma bibliothèque",
  alreadyOwned: "✓ Déjà dans ta bibliothèque",
  adding: "Ajout en cours…",
  addFromStore: "Ajouter depuis le Store",
  seeOnSteam: "Voir la fiche Steam",
  refresh: "Actualiser",
  checking: "Vérification…",
  lastCheck: (date) => `Dernière vérification : ${date}`,
  never: "jamais",

  optionsSection: "Options",
  autoClaim: "Ajout automatique",
  autoClaimHelp: "Ajoute tout seul chaque nouveau jeu remisé à 100 % (vérification toutes les heures).",
  includeDlc: "Inclure les DLC",
  includeDlcHelp: "Affiche aussi les DLC et bandes-son offerts.",
  notifications: "Notifications",
  notificationsHelp: "Prévient quand un jeu est détecté ou ajouté, ou qu'une mise à jour sort.",
  beta: "Versions bêta",
  betaHelp: "Propose aussi les versions de test. Elles arrivent plus tôt, et peuvent être instables.",
  checkUpdates: "Vérifier les mises à jour",
  searching: "Recherche…",
  version: (version) => `Version ${version}`,

  historySection: "Récemment ajoutés",
  betaTag: "bêta",
  rollbackTo: (version) => `Revenir à la version stable ${version}`,
  upcomingSection: "Promos à venir",
  openSteamDB: "Ouvrir SteamDB",

  toastAdded: "🎁 Ajouté à ta bibliothèque",
  toastAddFailed: "Ajout impossible",
  toastFreeGame: "Jeu gratuit sur Steam",
  toastUpToDate: "FSG est à jour",
  toastCheckFailed: "Vérification impossible",
  toastCheckFailedBody: "GitHub injoignable, réessaie plus tard.",
  toastUpdate: (version) => `Mise à jour FSG ${version} disponible`,
  toastUpdateBody: "Ouvre FSG dans le menu Decky pour l'installer.",

  claim: {
    not_found: "Jeu introuvable, actualise la liste.",
    no_session: "Session Steam introuvable : ouvre le Store une fois puis réessaie.",
    no_subid: "Aucune licence gratuite trouvée : passe par la fiche Store.",
    network_error: (detail) => `Erreur réseau : ${detail}`,
    http_error: (detail) => `Steam a refusé la demande (HTTP ${detail}).`,
    not_confirmed: "Steam n'a pas confirmé l'ajout.",
    added: "Ajouté à ta bibliothèque.",
  },
};

export const t = lang === "fr" ? fr : en;

/** Turns a backend result code into a sentence for the user. */
export function claimMessage(code: string, detail = ""): string {
  const entry = (t.claim as Record<string, unknown>)[code];
  if (typeof entry === "function") return (entry as (d: string) => string)(detail);
  if (typeof entry === "string") return entry;
  return detail || code;
}
