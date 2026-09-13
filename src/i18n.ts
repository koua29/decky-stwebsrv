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

const en = {
  loading: "Loading…",

  serverSection: "Web server",
  server: "Web server",
  serverHelp: "Browse, download and upload files from a browser on your network.",
  starting: "Starting…",
  address: "Open on your phone or computer:",
  noNetwork: "No network address found: connect to Wi-Fi first.",
  addressChoice: "Address shown",
  addressChoiceHelp: "The server answers on every network; this picks the one for the QR code.",
  addressAuto: "Automatic (cable first)",
  kind: { ethernet: "Wired", wifi: "Wi-Fi", other: "Other" } as Record<string, string>,
  otherAddresses: "Also reachable at:",
  login: (user: string) => `Username: ${user}`,
  password: (password: string) => `Password: ${password}`,
  newPassword: "New password",
  newPasswordDone: "New password set: everyone must log in again.",
  clients: (list: string) => `Connected recently: ${list}`,
  noClients: "No one connected yet.",
  stopsIn: (minutes: number) => `Stops after ${minutes} min without activity.`,
  startFailed: (detail: string) => `Could not start: ${detail}`,
  warning: "Anyone with the password can change your files. Use it on a network you trust.",

  optionsSection: "Options",
  idle: "Automatic stop",
  idleNever: "Never",
  idleMinutes: (minutes: number) => `After ${minutes} min idle`,
  theme: "Web page colours",
  themeSteam: "Steam (blue)",
  themeBruce: "Bruce (pink)",
  themeHacker: "Hacker (green)",
  notifications: "Notifications",
  notificationsHelp: "Tells you when the server stops by itself, or when an update is out.",
  beta: "Beta versions",
  betaHelp: "Also offers test builds. They come earlier, and can be unstable.",

  updatesSection: "Updates",
  checkUpdates: "Check for updates",
  searching: "Checking…",
  updateLine: (latest: string, current: string) => `Version ${latest} is out (installed: ${current}).`,
  installing: "Installing…",
  updateTo: (version: string) => `Update to ${version}`,
  rollbackTo: (version: string) => `Back to stable ${version}`,
  seeChanges: "What's new",
  version: (version: string) => `Version ${version}`,
  betaTag: "beta",

  toastIdleStop: "Web server stopped",
  toastIdleStopBody: (minutes: number) => `No activity for ${minutes} min.`,
  toastUpdated: "Update installed",
  toastUpdatedBody: "Open STWebSRV again to load the new version.",
  toastUpToDate: "STWebSRV is up to date",
  toastCheckFailed: "Check failed",
  toastCheckFailedBody: "GitHub is unreachable, try again later.",
  toastUpdateFound: (version: string) => `Update available: ${version}`,
  toastUpdateFoundBody: "The button is at the bottom of the panel, under Check for updates.",
  toastUpdate: (version: string) => `STWebSRV ${version} is available`,
  toastUpdateBody: "Open STWebSRV in the Decky menu to install it.",
  toastShortcutAdded: "Added to Steam from the web page",
};

const fr: typeof en = {
  loading: "Chargement…",

  serverSection: "Serveur web",
  server: "Serveur web",
  serverHelp: "Parcourir, télécharger et envoyer des fichiers depuis un navigateur du réseau.",
  starting: "Démarrage…",
  address: "À ouvrir sur ton téléphone ou ton ordinateur :",
  noNetwork: "Aucune adresse réseau : connecte-toi d'abord au Wi-Fi.",
  addressChoice: "Adresse affichée",
  addressChoiceHelp: "Le serveur répond sur tous les réseaux ; ceci choisit celui du QR code.",
  addressAuto: "Automatique (câble d'abord)",
  kind: { ethernet: "Câble", wifi: "Wi-Fi", other: "Autre" },
  otherAddresses: "Aussi joignable sur :",
  login: (user) => `Identifiant : ${user}`,
  password: (password) => `Mot de passe : ${password}`,
  newPassword: "Nouveau mot de passe",
  newPasswordDone: "Nouveau mot de passe : tout le monde doit se reconnecter.",
  clients: (list) => `Connectés récemment : ${list}`,
  noClients: "Personne ne s'est encore connecté.",
  stopsIn: (minutes) => `S'arrête après ${minutes} min sans activité.`,
  startFailed: (detail) => `Démarrage impossible : ${detail}`,
  warning: "Toute personne qui a le mot de passe peut modifier tes fichiers. À utiliser sur un réseau de confiance.",

  optionsSection: "Options",
  idle: "Arrêt automatique",
  idleNever: "Jamais",
  idleMinutes: (minutes) => `Après ${minutes} min d'inactivité`,
  theme: "Couleurs de la page web",
  themeSteam: "Steam (bleu)",
  themeBruce: "Bruce (rose)",
  themeHacker: "Hacker (vert)",
  notifications: "Notifications",
  notificationsHelp: "Prévient quand le serveur s'arrête tout seul, ou qu'une mise à jour sort.",
  beta: "Versions bêta",
  betaHelp: "Propose aussi les versions de test. Elles arrivent plus tôt, et peuvent être instables.",

  updatesSection: "Mises à jour",
  checkUpdates: "Vérifier les mises à jour",
  searching: "Recherche…",
  updateLine: (latest, current) => `Version ${latest} disponible (installée : ${current}).`,
  installing: "Installation…",
  updateTo: (version) => `Mettre à jour vers ${version}`,
  rollbackTo: (version) => `Revenir à la version stable ${version}`,
  seeChanges: "Voir les nouveautés",
  version: (version) => `Version ${version}`,
  betaTag: "bêta",

  toastIdleStop: "Serveur web arrêté",
  toastIdleStopBody: (minutes) => `Aucune activité depuis ${minutes} min.`,
  toastUpdated: "Mise à jour installée",
  toastUpdatedBody: "Rouvre STWebSRV pour charger la nouvelle version.",
  toastUpToDate: "STWebSRV est à jour",
  toastCheckFailed: "Vérification impossible",
  toastCheckFailedBody: "GitHub injoignable, réessaie plus tard.",
  toastUpdateFound: (version) => `Mise à jour disponible : ${version}`,
  toastUpdateFoundBody: "Le bouton est en bas du panneau, sous « Vérifier les mises à jour ».",
  toastUpdate: (version) => `Mise à jour STWebSRV ${version} disponible`,
  toastUpdateBody: "Ouvre STWebSRV dans le menu Decky pour l'installer.",
  toastShortcutAdded: "Ajouté à Steam depuis la page web",
};

export const t = lang === "fr" ? fr : en;
