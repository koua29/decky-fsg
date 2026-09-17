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
  sessionOk: "Steam session detected",
  sessionMissing: "No Steam session",
  sessionUnknown: "Steam session not checked yet",
  sessionHint: "FSG needs you signed in to the Steam Store on this console to add a game.",
  openStoreButton: "Open the Steam Store",
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
  savingsSection: "Value claimed",
  savingsTotal: (count: number, amount: string) => `${count} games claimed, worth ${amount}`,
  savingsCount: (count: number) => `${count} games claimed`,
  savingsEmpty: "Nothing claimed yet.",
  libraryLine: (count: number, amount: string) => `Library: ${count} items, worth about ${amount}`,
  libraryCount: (count: number) => `Library: ${count} items`,
  libraryNever: "Library not measured yet.",
  libraryComputing: "Pricing your library…",
  libraryRecalc: "Recalculate the statistics",
  libraryTitle: "Library",
  libraryPricedSplit: (priced: number, free: number) =>
    `${priced} priced · ${free} at 0 (demos, free-to-play, delisted)`,
  statsButton: "See the statistics",
  updatesSection: "Updates",
  toastUpdated: "Update installed",
  toastUpdatedBody: "Open FSG again to load the new version.",
  statsTitle: "Statistics",
  back: "Back",
  libraryHint: "Items include DLC. Nothing is computed until you ask.",
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
  toastUpdateFound: (version: string) => `Update available: ${version}`,
  toastUpdateFoundBody: "The button is at the bottom of the panel, under Check for updates.",
  toastUpdate: (version: string) => `FSG ${version} is available`,
  toastUpdateBody: "Open FSG in the Decky menu to install it.",

  claim: {
    not_found: "Game not found, refresh the list.",
    no_session: "No Steam session found: open the Steam Store once on this console (Library → Store), then try again.",
    no_subid: "No free licence button on the store page: the offer is probably over. Check the game's Steam page.",
    network_error: (detail: string) =>
      `Network error: ${detail}. Check the console's connection, then try again.`,
    login_required:
      "Steam sent the request to its login page: open the Steam Store on this console, make sure you are signed in, then try again.",
    redirected: (detail: string) =>
      `Steam answered with a redirect (HTTP ${detail}) and the game is still missing. Open the Steam Store once, then try again; if it keeps failing, claim the game from its Steam page.`,
    http_error: (detail: string) =>
      `Steam answered HTTP ${detail} and the game is still missing from your library. Claim it from its Steam page; the details are in the log (~/homebrew/logs/FSG).`,
    not_confirmed:
      "Steam took the request but the game is not in your library yet. Wait a few seconds and refresh; if it stays out, claim it from its Steam page.",
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
  sessionOk: "Session Steam détectée",
  sessionMissing: "Session Steam absente",
  sessionUnknown: "Session Steam pas encore vérifiée",
  sessionHint: "FSG a besoin que tu sois connecté au Store Steam sur la console pour ajouter un jeu.",
  openStoreButton: "Ouvrir le Store Steam",
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
  savingsSection: "Valeur récupérée",
  savingsTotal: (count, amount) => `${count} jeux récupérés, ${amount} de valeur`,
  savingsCount: (count) => `${count} jeux récupérés`,
  savingsEmpty: "Aucun jeu récupéré pour l'instant.",
  libraryLine: (count, amount) => `Bibliothèque : ${count} éléments, environ ${amount}`,
  libraryCount: (count) => `Bibliothèque : ${count} éléments`,
  libraryNever: "Bibliothèque pas encore mesurée.",
  libraryComputing: "Estimation de ta bibliothèque…",
  libraryRecalc: "Recalculer les statistiques",
  libraryTitle: "Bibliothèque",
  libraryPricedSplit: (priced, free) =>
    `${priced} chiffrés · ${free} à 0 € (démos, free-to-play, jeux retirés)`,
  statsButton: "Voir les statistiques",
  updatesSection: "Mises à jour",
  toastUpdated: "Mise à jour installée",
  toastUpdatedBody: "Rouvre FSG pour charger la nouvelle version.",
  statsTitle: "Statistiques",
  back: "Retour",
  libraryHint: "Les éléments comptent les DLC. Rien n'est calculé sans ta demande.",
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
  toastUpdateFound: (version) => `Mise à jour disponible : ${version}`,
  toastUpdateFoundBody: "Le bouton est en bas du panneau, sous « Vérifier les mises à jour ».",
  toastUpdate: (version) => `Mise à jour FSG ${version} disponible`,
  toastUpdateBody: "Ouvre FSG dans le menu Decky pour l'installer.",

  claim: {
    not_found: "Jeu introuvable, actualise la liste.",
    no_session:
      "Session Steam introuvable : ouvre une fois le Store Steam sur la console (Bibliothèque → Store), puis réessaie.",
    no_subid: "Pas de bouton de licence gratuite sur la fiche : la promo est sûrement finie. Vérifie la fiche Steam du jeu.",
    network_error: (detail) => `Erreur réseau : ${detail}. Vérifie la connexion de la console, puis réessaie.`,
    login_required:
      "Steam a renvoyé la demande vers sa page de connexion : ouvre le Store Steam sur la console, vérifie que tu es bien connecté, puis réessaie.",
    redirected: (detail) =>
      `Steam a répondu par une redirection (HTTP ${detail}) et le jeu n'est toujours pas dans ta bibliothèque. Ouvre une fois le Store Steam puis réessaie ; si ça continue, récupère le jeu depuis sa fiche Steam.`,
    http_error: (detail) =>
      `Steam a répondu HTTP ${detail} et le jeu n'est toujours pas dans ta bibliothèque. Récupère-le depuis sa fiche Steam ; le détail est dans le journal (~/homebrew/logs/FSG).`,
    not_confirmed:
      "Steam a accepté la demande mais le jeu n'est pas encore dans ta bibliothèque. Attends quelques secondes et actualise ; s'il n'apparaît pas, récupère-le depuis sa fiche Steam.",
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
