/*
 * STWebSRV web page, adapted from the WebUI of the Bruce firmware
 * (https://github.com/BruceDevices/firmware, AGPL-3.0, WebUI by lshaf).
 * The serial commands, screen navigator and reboot of the original are gone;
 * drives, SteamOS shortcuts, previews and folder downloads were added.
 */
function $(s, root = document) {
  return root.querySelector(s);
}
function $$(s, root = document) {
  return Array.from(root.querySelectorAll(s));
}

// ------------------------------------------------------------------ language

const FR = (navigator.language || "").toLowerCase().startsWith("fr");
const L = FR
  ? {
      logout: "Déconnexion",
      refresh: "Actualiser le dossier",
      uploadFiles: "Envoyer des fichiers dans ce dossier",
      uploadFolder: "Envoyer un dossier dans ce dossier",
      createFile: "Nouveau fichier",
      createFolder: "Nouveau dossier",
      zipFolder: "Télécharger ce dossier en .zip",
      name: "Nom",
      size: "Taille",
      action: "Action",
      download: "Télécharger",
      downloadZip: "Télécharger en .zip",
      rename: "Renommer",
      delete: "Supprimer",
      uploading: "Envoi en cours",
      close: "Fermer",
      save: "Enregistrer",
      edit: "Modifier :",
      infoText:
        "Un gestionnaire de fichiers web pour SteamOS, lancé depuis le plugin Decky. Toute personne qui a le mot de passe peut lire et modifier tes fichiers : ne l'utilise que sur un réseau de confiance.",
      infoCredit: "Page web adaptée de la WebUI du",
      renameFolder: "Renommer le dossier : ",
      renameFile: "Renommer le fichier : ",
      newName: "Nouveau nom :",
      folderName: "Nom du dossier :",
      fileName: "Nom du fichier :",
      create: "Créer",
      loading: "Chargement…",
      deleting: "Suppression…",
      renaming: "Renommage…",
      creating: "Création…",
      saving: "Enregistrement…",
      emptyName: "Le nom ne peut pas être vide.",
      emptyFolder: "Dossier vide",
      confirmDelete: (f) => `Supprimer ${f} ?\n\nC'EST DÉFINITIF !`,
      unsaved: "Modifications non enregistrées. Les abandonner ?",
      sessionExpired: "Session expirée. Aller à la page de connexion ?",
      overwrite: (n) => `${n} fichier(s) existent déjà ici. Les remplacer ?`,
      dropHere: "Dépose tes fichiers ici pour les envoyer dans ce dossier",
      notText: "Ce fichier n'est pas du texte. Le télécharger ?",
      tooLarge: "Fichier trop gros pour l'éditeur (2 Mo max). Le télécharger ?",
      failed: (m) => `Échec : ${m}`,
      uploadFailed: (n) => `${n} envoi(s) ont échoué.`,
      uploadHint: "Fermer la page met l'envoi en pause : renvoie le même fichier pour reprendre.",
      cancelUpload: "Annuler",
      confirmCancel: "Annuler l'envoi ? La partie déjà envoyée du fichier en cours sera supprimée.",
      uploadSummary: (i, n, done, total, pct) => `Fichier ${i}/${n} · ${done} / ${total} · ${pct} %`,
      uploadSpeed: (speed, eta) => `${speed}/s${eta ? ` · ${eta} restantes` : ""}`,
      uploadWaiting: "Préparation…",
      remaining: (eta) => `${eta} restantes`,
      queued: "En attente",
      verifying: (pct) => `vérification de la partie déjà envoyée ${pct} %`,
      retrying: (n, max) => `connexion perdue, nouvel essai ${n}/${max}…`,
      finalizing: "vérification finale…",
      uploadDone: "terminé",
      cancelled: "Annulé",
      summaryCancelled: (n, size) => `Envoi annulé · ${n} fichier(s) envoyé(s), ${size}`,
      summaryDone: (n, size, failed) => `${n} fichier(s) envoyé(s), ${size}${failed ? ` · ${failed} échec(s)` : ""}`,
      networkLost: "connexion perdue (renvoie le fichier pour reprendre)",
      checksumFailed: "fichier abîmé pendant l'envoi, supprimé : recommence",
      addToSteam: "Ajouter à Steam",
      addToSteamButton: "Ajouter à Steam",
      betaTag: "bêta",
      steamName: "Nom dans Steam :",
      useProton: "Lancer avec Proton (programme Windows)",
      launchOptions: "Options de lancement (facultatif) :",
      steamHint:
        "Le raccourci apparaît dans la bibliothèque Steam (onglet Non-Steam). La console doit être en mode Jeu, avec Decky actif.",
      steamAdding: "Ajout à Steam…",
      steamAdded: (name, tool) =>
        `« ${name} » est ajouté à Steam${tool ? ` (${tool})` : ""}.\n\nRetrouve-le dans la bibliothèque, onglet Non-Steam.`,
      steamExists: "Ce fichier est déjà dans ta bibliothèque Steam. L'ajouter une seconde fois ?",
      steamNoAnswer:
        "Steam n'a pas répondu. La console doit être en mode Jeu (pas en mode Bureau), avec Decky actif.",
      steamFailed: (detail) => `Steam n'a pas pu créer le raccourci${detail ? ` : ${detail}` : "."}`,
      nativeNote: "Programme Linux : il sera rendu exécutable si besoin.",
    }
  : {
      logout: "Log Out",
      refresh: "Refresh folder",
      uploadFiles: "Upload files to this folder",
      uploadFolder: "Upload a folder to this folder",
      createFile: "Create new file",
      createFolder: "Create new folder",
      zipFolder: "Download this folder as .zip",
      name: "Name",
      size: "Size",
      action: "Action",
      download: "Download",
      downloadZip: "Download as .zip",
      rename: "Rename",
      delete: "Delete",
      uploading: "Uploading",
      close: "Close",
      save: "Save",
      edit: "Edit:",
      infoText:
        "A web file manager for SteamOS, started from the Decky plugin. Anyone with the password can read and change your files: only use it on a network you trust.",
      infoCredit: "Web page adapted from the WebUI of the",
      renameFolder: "Rename folder: ",
      renameFile: "Rename file: ",
      newName: "New name:",
      folderName: "Folder name:",
      fileName: "File name:",
      create: "Create",
      loading: "Loading…",
      deleting: "Deleting…",
      renaming: "Renaming…",
      creating: "Creating…",
      saving: "Saving…",
      emptyName: "The name cannot be empty.",
      emptyFolder: "Empty folder",
      confirmDelete: (f) => `Are you sure you want to DELETE ${f}?\n\nTHIS ACTION CANNOT BE UNDONE!`,
      unsaved: "You have unsaved changes. Do you want to discard them?",
      sessionExpired: "Session expired or unauthorized. Go to the login page?",
      overwrite: (n) => `${n} file(s) already exist here. Replace them?`,
      dropHere: "Drop files here to upload them to the current folder",
      notText: "This file is not text. Download it instead?",
      tooLarge: "Too large for the editor (2 MB max). Download it instead?",
      failed: (m) => `Failed: ${m}`,
      uploadFailed: (n) => `${n} upload(s) failed.`,
      uploadHint: "Closing the page pauses the upload: send the same file again to resume.",
      cancelUpload: "Cancel",
      confirmCancel: "Cancel the upload? What was already sent of the current file will be deleted.",
      uploadSummary: (i, n, done, total, pct) => `File ${i}/${n} · ${done} / ${total} · ${pct} %`,
      uploadSpeed: (speed, eta) => `${speed}/s${eta ? ` · ${eta} left` : ""}`,
      uploadWaiting: "Preparing…",
      remaining: (eta) => `${eta} left`,
      queued: "Waiting",
      verifying: (pct) => `checking what was already sent ${pct} %`,
      retrying: (n, max) => `connection lost, retry ${n}/${max}…`,
      finalizing: "final check…",
      uploadDone: "done",
      cancelled: "Cancelled",
      summaryCancelled: (n, size) => `Upload cancelled · ${n} file(s) sent, ${size}`,
      summaryDone: (n, size, failed) => `${n} file(s) sent, ${size}${failed ? ` · ${failed} failed` : ""}`,
      networkLost: "connection lost (send the file again to resume)",
      checksumFailed: "file damaged in transit, deleted: try again",
      addToSteam: "Add to Steam",
      addToSteamButton: "Add to Steam",
      betaTag: "beta",
      steamName: "Name in Steam:",
      useProton: "Run with Proton (Windows program)",
      launchOptions: "Launch options (optional):",
      steamHint:
        "The shortcut appears in the Steam library (Non-Steam tab). The console must be in Game Mode with Decky running.",
      steamAdding: "Adding to Steam…",
      steamAdded: (name, tool) =>
        `"${name}" was added to Steam${tool ? ` (${tool})` : ""}.\n\nFind it in the library, Non-Steam tab.`,
      steamExists: "This file is already in your Steam library. Add it a second time?",
      steamNoAnswer: "Steam did not answer. The console must be in Game Mode (not Desktop Mode), with Decky running.",
      steamFailed: (detail) => `Steam could not create the shortcut${detail ? `: ${detail}` : "."}`,
      nativeNote: "Linux program: it will be made executable if needed.",
    };

function applyI18n(root = document) {
  document.documentElement.lang = FR ? "fr" : "en";
  $$("[data-i18n]", root).forEach((e) => {
    if (typeof L[e.dataset.i18n] === "string") e.textContent = L[e.dataset.i18n];
  });
  $$("[data-i18n-title]", root).forEach((e) => {
    if (typeof L[e.dataset.i18nTitle] === "string") e.title = L[e.dataset.i18nTitle];
  });
  $(".upload-area").setAttribute("data-label", L.dropHere);
}

// ------------------------------------------------------------------ templates and dialogs

const T = {
  master: $("#t"),
  _clone: function (selector) {
    const tmp = document.createElement("template");
    tmp.innerHTML = this.master.content.querySelector(selector).outerHTML;
    applyI18n(tmp.content);
    return tmp.content;
  },
  fileRow: function () {
    return this._clone("table tr.file-row");
  },
  pathRow: function () {
    return this._clone("table tr.path-row");
  },
  uploadLoading: function () {
    return this._clone(".upload-loading");
  },
};

const Dialog = {
  _bg: function (show) {
    $$(".dialog").forEach((dialog) => dialog.classList.add("hidden"));
    $(".dialog-background").classList.toggle("hidden", !show);
  },
  show: function (dialogName) {
    this._bg(true);
    $(".dialog." + dialogName).classList.remove("hidden");
  },
  hide: function () {
    this._bg(false);
    this.loading.hide();
    $(".preview-body").innerHTML = ""; // stops a playing video
  },
  loading: {
    show: function (message) {
      $(".loading-area").classList.remove("hidden");
      $(".loading-area .text").textContent = message || L.loading;
    },
    hide: function () {
      $(".loading-area").classList.add("hidden");
    },
  },
  showOneInput: function (name, inputVal, data) {
    const dbForm = {
      renameFolder: { title: L.renameFolder + inputVal, label: L.newName, action: L.rename },
      renameFile: { title: L.renameFile + inputVal, label: L.newName, action: L.rename },
      createFolder: { title: L.createFolder, label: L.folderName, action: L.create },
      createFile: { title: L.createFile, label: L.fileName, action: L.create },
    };
    const config = dbForm[name];
    if (!config) return;
    const dialog = $(".dialog.oinput");
    dialog.setAttribute("data-cache", data);
    dialog.querySelector(".oinput-title").textContent = config.title;
    dialog.querySelector(".oinput-label").textContent = config.label;
    dialog.querySelector("#oinput-input").value = inputVal;
    dialog.querySelector(".act-save-oinput-file").textContent = config.action;
    this.show("oinput");
    const input = dialog.querySelector("#oinput-input");
    input.focus();
    const dot = inputVal.lastIndexOf(".");
    if (name === "renameFile" && dot > 0) input.setSelectionRange(0, dot);
    else input.select();
  },
};

// ------------------------------------------------------------------ API

function handleAuthError() {
  if (confirm(L.sessionExpired)) window.location.href = "/";
  else Dialog.loading.hide();
}

function apiUrl(route, params) {
  return "/api/" + route + (params ? "?" + new URLSearchParams(params).toString() : "");
}

async function api(method, route, params, body) {
  const res = await fetch(apiUrl(route, params), {
    method,
    body,
    credentials: "same-origin",
    headers: method === "POST" ? { "X-STWebSRV": "1" } : {},
  });
  if (res.status === 401) {
    handleAuthError();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const error = new Error((await res.text()) || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res;
}

function fail(error) {
  Dialog.loading.hide();
  if (error.message !== "Unauthorized") alert(L.failed(error.message));
}

// ------------------------------------------------------------------ helpers

function joinPath(folder, name) {
  return ((folder.endsWith("/") ? folder : folder + "/") + name).replace(/\/+/g, "/");
}

function parentPath(path) {
  const cut = path.replace(/\/+$/, "").lastIndexOf("/");
  return cut <= 0 ? "/" : path.substring(0, cut);
}

function humanSize(bytes) {
  const units = FR ? ["o", "Ko", "Mo", "Go", "To"] : ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let unit = 0;
  while (n >= 1024 && unit < units.length - 1) {
    n /= 1024;
    unit++;
  }
  const text = unit === 0 ? `${Math.round(n)} ${units[0]}` : `${n.toFixed(1)} ${units[unit]}`;
  return FR ? text.replace(".", ",") : text;
}

function stringToId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return "id_" + Math.abs(hash) + "_" + Math.random().toString(36).slice(2, 7);
}

function calcHash(str) {
  let hash = 5381;
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i); // djb2 xor variant
    hash = hash >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function downloadUrl(drive, path, folder) {
  return apiUrl(folder ? "zip" : "download", { drive, path });
}

function startDownload(url) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function launchKind(name) {
  const lower = name.toLowerCase();
  if (launchExt.windows.some((ext) => lower.endsWith(ext))) return "windows";
  if (launchExt.native.some((ext) => lower.endsWith(ext))) return "native";
  return null;
}

const IMAGE = /\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/i;
const VIDEO = /\.(mp4|webm|mkv|mov|m4v)$/i;
const AUDIO = /\.(mp3|ogg|oga|opus|wav|flac|m4a|aac)$/i;
const BINARY =
  /\.(zip|7z|rar|gz|tgz|xz|zst|bz2|tar|iso|chd|cso|rvz|wbfs|wua|nsp|xci|3ds|cia|nds|gba|gbc|gb|sfc|smc|nes|n64|z64|md|bin|cue|img|exe|dll|so|appimage|pak|vpk|pkg|deb|rpm|flatpak|jar|apk|pdf|ttf|otf|woff2?|db|sqlite|dat|sav|srm)$/i;
const EDIT_LIMIT = 2 * 1024 * 1024;

// ------------------------------------------------------------------ state and listing

let drives = [];
let launchExt = { windows: [], native: [] };
let currentDrive;
let currentPath;
let currentEntries = [];
const btnRefreshFolder = $("#refresh-folder");

function updateURL(drive, path) {
  const params = new URLSearchParams();
  if (drive) params.set("drive", drive);
  if (path && path !== "/") params.set("path", path);
  const newURL = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
  window.history.replaceState({ drive, path }, "", newURL);
}

function getURLParams() {
  const params = new URLSearchParams(window.location.search);
  return { drive: params.get("drive"), path: params.get("path") || "/" };
}

function renderBreadcrumb(drive, path) {
  const holder = $(".current-path");
  holder.innerHTML = "";
  const label = (drives.find((d) => d.id === drive) || { label: drive }).label;
  const add = (text, target) => {
    const span = document.createElement("span");
    span.textContent = text;
    if (target !== null) {
      span.className = "crumb act-browse";
      span.setAttribute("data-drive", drive);
      span.setAttribute("data-path", target);
    }
    holder.appendChild(span);
  };
  add(label + ":/", "/");
  let built = "";
  path
    .split("/")
    .filter(Boolean)
    .forEach((part, i, parts) => {
      built += "/" + part;
      add(part, built);
      if (i < parts.length - 1) add("/", null);
    });
}

function messageRow(text) {
  const tbody = $("table.explorer tbody");
  const tr = document.createElement("tr");
  tr.className = "message-row";
  const td = document.createElement("td");
  td.colSpan = 3;
  td.textContent = text;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function renderFileRows(data) {
  const tbody = $("table.explorer tbody");
  tbody.innerHTML = "";
  currentEntries = data.entries;

  if (data.path !== "/") {
    const e = T.pathRow();
    const row = e.querySelector(".path-row");
    row.setAttribute("data-drive", data.drive);
    row.setAttribute("data-path", parentPath(data.path));
    tbody.appendChild(e);
  }
  if (data.entries.length === 0) messageRow(L.emptyFolder);

  for (const entry of data.entries) {
    const e = T.fileRow();
    const row = e.querySelector(".file-row");
    const dPath = joinPath(data.path, entry.name);
    const isDir = entry.type === "dir";
    const name = e.querySelector(".col-name");
    name.textContent = entry.name + (isDir ? "/" : "");
    if (entry.link) {
      const mark = document.createElement("span");
      mark.className = "link-mark";
      mark.textContent = " ↪";
      name.appendChild(mark);
    }
    name.setAttribute("title", entry.name);
    row.setAttribute("data-path", dPath);
    row.setAttribute("data-type", entry.type);
    row.setAttribute("data-size", entry.size);
    e.querySelector(".act-rename").setAttribute("data-action", isDir ? "renameFolder" : "renameFile");
    e.querySelector(".col-size").textContent = isDir ? "" : humanSize(entry.size);
    const download = e.querySelector(".act-download");
    download.setAttribute("href", downloadUrl(data.drive, dPath, isDir));
    download.setAttribute("download", isDir ? entry.name + ".zip" : entry.name);
    if (isDir) {
      download.title = L.downloadZip;
      name.classList.add("act-browse");
      e.querySelector(".col-action").classList.add("type-folder");
    } else {
      name.classList.add("act-open-file");
      e.querySelector(".col-action").classList.add("type-file");
      if (launchKind(entry.name)) e.querySelector(".col-action").classList.add("launchable");
    }
    tbody.appendChild(e);
  }
}

async function fetchFiles(drive, path) {
  btnRefreshFolder.classList.add("reloading");
  $("table.explorer tbody").innerHTML = "";
  messageRow(L.loading);
  currentDrive = drive;
  currentPath = path;
  updateURL(drive, path);

  $$(".drives .act-browse.active").forEach((e) => e.classList.remove("active"));
  $(`.drives .act-browse[data-drive='${CSS.escape(drive)}']`)?.classList.add("active");
  renderBreadcrumb(drive, path);
  const zip = $(".act-zip-current");
  zip.setAttribute("href", downloadUrl(drive, path, true));
  zip.setAttribute("download", "");

  try {
    const data = await (await api("GET", "list", { drive, path })).json();
    if (data.path !== path) {
      currentPath = data.path;
      updateURL(drive, data.path);
      renderBreadcrumb(drive, data.path);
    }
    renderFileRows(data);
  } catch (error) {
    $("table.explorer tbody").innerHTML = "";
    messageRow(L.failed(error.message));
    if (error.status === 404 && path !== "/") return fetchFiles(drive, parentPath(path));
  } finally {
    btnRefreshFolder.classList.remove("reloading");
  }
}

async function fetchSystemInfo() {
  const info = await (await api("GET", "info")).json();
  drives = info.drives;
  launchExt = info.launch_ext || launchExt;
  $(".app-version").textContent = info.version;
  $(".host-name").textContent = info.hostname;

  const holder = $(".drives");
  holder.innerHTML = "";
  for (const drive of info.drives) {
    const pill = document.createElement("span");
    pill.className = "btn-action act-browse block-space";
    pill.setAttribute("data-drive", drive.id);
    pill.setAttribute("data-path", "/");
    pill.textContent = `${drive.label} [${drive.used} / ${drive.total}]`;
    holder.appendChild(pill);
  }

  const shortcuts = $(".shortcuts");
  shortcuts.innerHTML = "";
  for (const shortcut of info.shortcuts) {
    const button = document.createElement("button");
    button.className = "btn-action act-browse";
    button.setAttribute("data-drive", shortcut.drive);
    button.setAttribute("data-path", shortcut.path);
    button.textContent = shortcut.label;
    shortcuts.appendChild(button);
  }
  if (currentDrive) $(`.drives .act-browse[data-drive='${CSS.escape(currentDrive)}']`)?.classList.add("active");
}

// ------------------------------------------------------------------ uploads

const UPLOAD_CHUNK = 8 * 1024 * 1024; // bytes per request
const MAX_ATTEMPTS = 8; // per chunk, with a growing pause between attempts

const _queueUpload = [];
let _runningUpload = false;
let _uploadFailures = 0;
let _cancelUpload = false;
let _currentXhr = null;

// Totals of the whole batch, for the summary line.
const Transfer = { total: 0, done: 0, doneFiles: 0, sent: 0, files: 0, index: 0, samples: [] };

class Resync extends Error {}
class Cancelled extends Error {}

// CRC32, the same checksum as Python's binascii.crc32 (and ZIP, PNG, Ethernet).
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes, previous = 0) {
  let c = (previous ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function readSlice(file, start, end) {
  return new Uint8Array(await file.slice(start, end).arrayBuffer());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return "";
  seconds = Math.round(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m) return `${m} min ${String(s).padStart(2, "0")} s`;
  return `${s} s`;
}

/** Bytes per second over the last 5 seconds of actual sending. */
function currentSpeed() {
  const now = performance.now();
  Transfer.samples.push([now, Transfer.sent]);
  while (Transfer.samples.length > 2 && now - Transfer.samples[0][0] > 5000) Transfer.samples.shift();
  const [t0, b0] = Transfer.samples[0];
  return now > t0 ? ((Transfer.sent - b0) * 1000) / (now - t0) : 0;
}

let _lastRender = 0;
function renderTransfer(item, force = false) {
  const now = performance.now();
  if (!force && now - _lastRender < 250) return;
  _lastRender = now;
  const speed = currentSpeed();
  const done = Transfer.done + (item ? item.progress : 0);
  const left = Math.max(Transfer.total - done, 0);
  const pct = Transfer.total ? Math.floor((done / Transfer.total) * 100) : 100;
  const summary = $(".dialog.upload .upload-summary");
  const eta = speed > 0 ? formatDuration(left / speed) : "";
  summary.innerHTML = "";
  const line = document.createElement("div");
  line.textContent = L.uploadSummary(Transfer.index, Transfer.files, humanSize(done), humanSize(Transfer.total), pct);
  const line2 = document.createElement("div");
  line2.textContent = speed > 0 ? L.uploadSpeed(humanSize(speed), eta) : L.uploadWaiting;
  const bar = document.createElement("div");
  bar.className = "summary-bar";
  const fill = document.createElement("div");
  fill.style.width = pct + "%";
  bar.appendChild(fill);
  summary.append(line, line2, bar);

  if (!item) return;
  const row = document.getElementById(item.id);
  if (!row) return;
  const size = item.file.size;
  const filePct = size ? Math.floor((item.progress / size) * 100) : 100;
  row.querySelector(".bar").style.width = filePct + "%";
  let stats = `${humanSize(item.progress)} / ${humanSize(size)} · ${filePct} %`;
  if (item.status) stats += ` · ${item.status}`;
  else if (speed > 0) {
    const fileEta = formatDuration((size - item.progress) / speed);
    stats += ` · ${humanSize(speed)}/s${fileEta ? " · " + L.remaining(fileEta) : ""}`;
  }
  row.querySelector(".upload-stats").textContent = stats;
}

function setRowState(item, text, className) {
  const row = document.getElementById(item.id);
  if (!row) return;
  row.querySelector(".upload-stats").textContent = text;
  if (className) row.classList.add(className);
}

function queueFiles(items) {
  // items: [{ file, name }] where name may contain sub-folders
  // Dropped folders merge into existing ones: only same-name files get replaced.
  const existing = new Set(currentEntries.filter((e) => e.type === "file").map((e) => e.name));
  const clashes = items.filter((i) => !i.name.includes("/") && existing.has(i.name)).length;
  if (clashes && !confirm(L.overwrite(clashes))) return;

  Dialog.show("upload");
  const body = $(".dialog.upload .dialog-body");
  if (!_runningUpload) {
    body.innerHTML = ""; // rows left over from a previous batch with errors
    $(".act-cancel-upload").classList.remove("closing");
    $(".act-cancel-upload").textContent = L.cancelUpload;
  }
  for (const item of items) {
    const progress = T.uploadLoading();
    const id = stringToId(item.name);
    progress.querySelector(".upload-loading").setAttribute("id", id);
    progress.querySelector(".upload-name").textContent = item.name;
    progress.querySelector(".upload-stats").textContent = `${L.queued} · ${humanSize(item.file.size)}`;
    body.appendChild(progress);
    _queueUpload.push({ ...item, id, drive: currentDrive, folder: currentPath, progress: 0, status: "" });
    Transfer.total += item.file.size;
    Transfer.files += 1;
  }
  renderTransfer(null, true);
  if (!_runningUpload) uploadNext();
}

async function readDroppedEntry(entry, out) {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    out.push({ file, name: entry.fullPath.replace(/^\/+/, "") });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    // readEntries returns the content in batches: keep reading until it is empty.
    for (;;) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      for (const child of batch) await readDroppedEntry(child, out);
    }
  }
}

/** POST without a body; returns { status, body } and never throws on HTTP errors. */
async function uploadCall(route, params) {
  let res;
  try {
    res = await fetch(apiUrl(route, params), { method: "POST", credentials: "same-origin", headers: { "X-STWebSRV": "1" } });
  } catch (error) {
    throw new Resync("network");
  }
  if (res.status === 401) {
    handleAuthError();
    throw new Error("Unauthorized");
  }
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { error: text };
  }
  return { status: res.status, body };
}

function sendChunk(item, offset, bytes, crc) {
  return new Promise((resolve, reject) => {
    const params = { drive: item.drive, path: item.folder, name: item.name, offset, crc };
    const req = new XMLHttpRequest();
    _currentXhr = req;
    let reported = 0;
    req.open("POST", apiUrl("upload-chunk", params), true);
    req.setRequestHeader("X-STWebSRV", "1");
    req.setRequestHeader("Content-Type", "application/octet-stream");
    req.timeout = 180000;
    req.upload.onprogress = (e) => {
      Transfer.sent += e.loaded - reported;
      reported = e.loaded;
      item.progress = offset + e.loaded;
      renderTransfer(item);
    };
    const settle = () => {
      Transfer.sent -= reported; // counted again once the chunk is accepted
      _currentXhr = null;
    };
    req.onload = () => {
      settle();
      let body = {};
      try {
        body = JSON.parse(req.responseText);
      } catch {
        body = { error: req.responseText };
      }
      resolve({ status: req.status, body, sent: bytes.length });
    };
    req.onerror = req.ontimeout = () => {
      settle();
      reject(new Resync("network"));
    };
    req.onabort = () => {
      settle();
      reject(new Cancelled());
    };
    req.send(bytes);
  });
}

/**
 * One attempt at sending a file from wherever the server stands.
 * `known` maps chunk boundaries to the CRC32 of the file up to there, so a
 * resync after a network error does not re-read what was already checked.
 */
async function uploadPass(item, known) {
  const file = item.file;
  const base = { drive: item.drive, path: item.folder, name: item.name };
  let start = await uploadCall("upload-start", { ...base, size: file.size, mtime: file.lastModified });
  if (start.status !== 200) throw new Error(start.body.error || `HTTP ${start.status}`);

  let offset = start.body.offset;
  let crc = 0;
  if (offset > 0) {
    // Same name, size and date: check the last chunk the server kept against this file.
    const last = start.body.last;
    const lastOk =
      last && last.offset + last.length === offset && crc32(await readSlice(file, last.offset, offset)) === last.crc;
    if (!lastOk) {
      start = await uploadCall("upload-start", { ...base, size: file.size, mtime: file.lastModified, reset: "1" });
      if (start.status !== 200) throw new Error(start.body.error || `HTTP ${start.status}`);
      offset = 0;
    } else {
      // Whole-file CRC up to the resume point, from the closest boundary already computed.
      let from = 0;
      for (const boundary of known.keys()) if (boundary <= offset && boundary > from) from = boundary;
      crc = known.get(from) || 0;
      for (let pos = from; pos < offset; pos += UPLOAD_CHUNK) {
        if (_cancelUpload) throw new Cancelled();
        const end = Math.min(pos + UPLOAD_CHUNK, offset);
        crc = crc32(await readSlice(file, pos, end), crc);
        known.set(end, crc);
        item.status = L.verifying(Math.floor((end / offset) * 100));
        item.progress = offset;
        renderTransfer(item);
      }
      item.status = "";
    }
  }
  known.set(offset, crc);
  item.progress = offset;

  while (offset < file.size) {
    if (_cancelUpload) throw new Cancelled();
    const end = Math.min(offset + UPLOAD_CHUNK, file.size);
    const bytes = await readSlice(file, offset, end);
    const chunkCrc = crc32(bytes);
    let attempts = 0;
    for (;;) {
      // A network error throws Resync: uploadItem waits, then asks the server where it stands.
      const result = await sendChunk(item, offset, bytes, chunkCrc);
      if (result.status === 200) {
        item.failures = 0;
        break;
      }
      if (result.status === 422 && result.body.error === "crc") {
        attempts++; // damaged on the way: send the same chunk again
        if (attempts >= MAX_ATTEMPTS) throw new Error(L.checksumFailed);
        continue;
      }
      if (result.status === 409 || result.status === 410) throw new Resync("offset");
      throw new Error(result.body.error || `HTTP ${result.status}`);
    }
    crc = crc32(bytes, crc);
    offset = end;
    known.set(offset, crc);
    Transfer.sent += bytes.length;
    item.progress = offset;
    renderTransfer(item);
  }

  item.status = L.finalizing;
  renderTransfer(item, true);
  const finish = await uploadCall("upload-finish", { ...base, crc });
  item.status = "";
  if (finish.status === 200) return;
  if (finish.status === 422) throw new Error(L.checksumFailed);
  if (finish.status === 409 || finish.status === 410) throw new Resync("finish");
  throw new Error(finish.body.error || `HTTP ${finish.status}`);
}

async function uploadItem(item) {
  const known = new Map([[0, 0]]);
  item.failures = 0;
  let stalled = 0; // resyncs in a row without progress
  for (;;) {
    const before = item.progress;
    try {
      return await uploadPass(item, known);
    } catch (error) {
      if (!(error instanceof Resync)) throw error;
      stalled = item.progress > before ? 0 : stalled + 1;
      if (error.message === "network") {
        // Consecutive failures only: any chunk that gets through resets the count.
        item.failures += 1;
        if (item.failures >= MAX_ATTEMPTS) throw new Error(L.networkLost);
        item.status = L.retrying(item.failures, MAX_ATTEMPTS);
        renderTransfer(item, true);
        await sleep(Math.min(1000 * 2 ** item.failures, 30000));
        item.status = "";
        if (_cancelUpload) throw new Cancelled();
      } else if (stalled >= MAX_ATTEMPTS) {
        throw new Error(L.networkLost);
      }
    }
  }
}

async function uploadNext() {
  _runningUpload = true;
  _cancelUpload = false;
  Transfer.samples = [];
  while (_queueUpload.length) {
    const item = _queueUpload.shift();
    Transfer.index += 1;
    try {
      await uploadItem(item);
      item.progress = item.file.size;
      Transfer.done += item.file.size;
      Transfer.doneFiles += 1;
      setRowState(item, `✓ ${humanSize(item.file.size)} · ${L.uploadDone}`, "done");
      document.getElementById(item.id)?.querySelector(".bar")?.style.setProperty("width", "100%");
    } catch (error) {
      if (error instanceof Cancelled || _cancelUpload) {
        await uploadCall("upload-cancel", { drive: item.drive, path: item.folder, name: item.name }).catch(() => {});
        setRowState(item, L.cancelled, "failed");
        for (const rest of _queueUpload.splice(0)) setRowState(rest, L.cancelled, "failed");
        break;
      }
      _uploadFailures++;
      Transfer.total -= item.file.size;
      setRowState(item, `✗ ${error.message}`, "failed");
      console.error("Upload failed", item.name, error);
    }
    renderTransfer(null, true);
  }
  const cancelled = _cancelUpload;
  const summary = $(".dialog.upload .upload-summary");
  summary.textContent = cancelled
    ? L.summaryCancelled(Transfer.doneFiles, humanSize(Transfer.done))
    : L.summaryDone(Transfer.doneFiles, humanSize(Transfer.done), _uploadFailures);
  _runningUpload = false;
  _cancelUpload = false;
  const failures = _uploadFailures;
  _uploadFailures = 0;
  Object.assign(Transfer, { total: 0, done: 0, doneFiles: 0, sent: 0, files: 0, index: 0, samples: [] });
  if (failures || cancelled) {
    // Leave the list visible so the errors can be read; closing it is manual.
    $(".act-cancel-upload").textContent = L.close;
    $(".act-cancel-upload").classList.add("closing");
    if (failures) alert(L.uploadFailed(failures));
  } else {
    $(".dialog.upload .dialog-body").innerHTML = "";
    Dialog.hide();
  }
  fetchSystemInfo().catch(console.error);
  fetchFiles(currentDrive, currentPath);
}

$(".act-cancel-upload").addEventListener("click", () => {
  const button = $(".act-cancel-upload");
  if (button.classList.contains("closing")) {
    button.classList.remove("closing");
    button.textContent = L.cancelUpload;
    $(".dialog.upload .dialog-body").innerHTML = "";
    Dialog.hide();
    return;
  }
  if (!_runningUpload || !confirm(L.confirmCancel)) return;
  _cancelUpload = true;
  _currentXhr?.abort();
});

window.addEventListener("beforeunload", (e) => {
  if (!_runningUpload) return;
  e.preventDefault();
  e.returnValue = "";
});

window.ondragenter = (e) => {
  if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files")) {
    $(".upload-area").classList.remove("hidden");
  }
};
$(".upload-area").ondragleave = () => $(".upload-area").classList.add("hidden");
$(".upload-area").ondragover = (e) => e.preventDefault();
$(".upload-area").ondrop = async (e) => {
  e.preventDefault();
  $(".upload-area").classList.add("hidden");
  const entries = Array.from(e.dataTransfer.items || [])
    .map((i) => i.webkitGetAsEntry && i.webkitGetAsEntry())
    .filter(Boolean);
  const items = [];
  for (const entry of entries) await readDroppedEntry(entry, items);
  if (items.length) queueFiles(items);
};

$$(".inp-uploader").forEach((el) => {
  el.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) queueFiles(files.map((file) => ({ file, name: file.webkitRelativePath || file.name })));
    e.target.value = "";
  });
});

// ------------------------------------------------------------------ editor (from Bruce)

function updateLineNumbers() {
  const textarea = $(".dialog.editor .file-content");
  const lineNumbers = $(".dialog.editor .line-numbers");
  const lineCount = textarea.value.split("\n").length;
  let html = "";
  for (let i = 1; i <= lineCount; i++) html += i + "\n";
  lineNumbers.textContent = html;
}

function syncScrolling() {
  $(".dialog.editor .line-numbers").scrollTop = $(".dialog.editor .file-content").scrollTop;
}

function isModified(target) {
  return target.getAttribute("data-hash") !== calcHash(target.value);
}

async function openEditor(path) {
  const editor = $(".dialog.editor .file-content");
  Dialog.loading.show(L.loading);
  try {
    const text = await (await api("GET", "read", { drive: currentDrive, path })).text();
    $(".dialog.editor .editor-file-name").textContent = path;
    editor.setAttribute("data-path", path);
    editor.value = text;
    editor.setAttribute("data-hash", calcHash(text));
    updateLineNumbers();
    $(".act-save-edit-file").disabled = true;
    Dialog.loading.hide();
    Dialog.show("editor");
    editor.focus();
    editor.setSelectionRange(0, 0);
  } catch (error) {
    Dialog.loading.hide();
    if (error.status === 415 && confirm(L.notText)) startDownload(downloadUrl(currentDrive, path, false));
    else if (error.status === 413 && confirm(L.tooLarge)) startDownload(downloadUrl(currentDrive, path, false));
    else if (error.status !== 415 && error.status !== 413) fail(error);
  }
}

async function saveEditorFile() {
  const editor = $(".dialog.editor .file-content");
  if (!isModified(editor)) return;
  Dialog.loading.show(L.saving);
  try {
    await api("POST", "save", { drive: currentDrive, path: editor.getAttribute("data-path") }, editor.value);
    editor.setAttribute("data-hash", calcHash(editor.value));
    $(".act-save-edit-file").disabled = true;
    Dialog.loading.hide();
  } catch (error) {
    fail(error);
  }
}

function closeEditor() {
  const editor = $(".dialog.editor .file-content");
  if (isModified(editor) && !confirm(L.unsaved)) return;
  Dialog.hide();
  fetchFiles(currentDrive, currentPath);
}

$(".file-content").addEventListener("keydown", function (e) {
  const textarea = this;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const TAB_SIZE = 2;
  const leadingSpacesRegex = /^ */;
  const closingCharRegex = /^[\}\)\]]/;

  const insertText = (text, newStart, newEnd, preserveSelection = true) => {
    textarea.setSelectionRange(start, end);
    document.execCommand("insertText", false, text);
    if (preserveSelection) textarea.setSelectionRange(newStart, newEnd);
    else textarea.setSelectionRange(newStart, newStart);
  };

  const getCurrentLine = (pos) => {
    const lineStart = textarea.value.lastIndexOf("\n", pos - 1) + 1;
    const lineEnd = textarea.value.indexOf("\n", pos);
    const line = textarea.value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    return { line, lineStart, lineEnd: lineEnd === -1 ? textarea.value.length : lineEnd };
  };

  const handleTab = (shift) => {
    if (start === end) {
      const { line, lineStart, lineEnd } = getCurrentLine(start);
      if (shift) {
        const remove = Math.min(line.match(leadingSpacesRegex)[0].length, TAB_SIZE);
        textarea.setSelectionRange(lineStart, lineEnd);
        document.execCommand("insertText", false, line.slice(remove));
        textarea.setSelectionRange(start - remove, start - remove);
      } else {
        insertText(" ".repeat(TAB_SIZE), start + TAB_SIZE, start + TAB_SIZE, false);
      }
      return;
    }
    const { lineStart: firstLineStart } = getCurrentLine(start);
    const { lineEnd: lastLineEnd } = getCurrentLine(end === start ? end : end - 1);
    const fullLines = textarea.value.slice(firstLineStart, lastLineEnd).split("\n");
    const newTextLines = fullLines.map((line, idx) => {
      if (idx === fullLines.length - 1 && /^\s*$/.test(line)) return line;
      const leadingSpaces = line.match(leadingSpacesRegex)[0].length;
      if (shift) return line.slice(Math.min(leadingSpaces, TAB_SIZE));
      return " ".repeat(TAB_SIZE - (leadingSpaces % TAB_SIZE)) + line;
    });
    textarea.setSelectionRange(firstLineStart, lastLineEnd);
    document.execCommand("insertText", false, newTextLines.join("\n"));
    textarea.setSelectionRange(firstLineStart, firstLineStart + newTextLines.join("\n").length);
  };

  const handleEnter = () => {
    const { line } = getCurrentLine(start);
    const indentation = line.match(leadingSpacesRegex)[0] || "";
    const nextChar = start < textarea.value.length ? textarea.value[start] : "";
    const prevChar = start > 0 ? textarea.value[start - 1] : "";
    const pairs = { "{": "}", "(": ")", "[": "]" };
    if (pairs[prevChar] === nextChar) {
      const extraIndent = " ".repeat(TAB_SIZE);
      const pos = start + indentation.length + extraIndent.length + 1;
      insertText(`\n${indentation + extraIndent}\n${indentation}`, pos, pos);
    } else {
      const closingLine = closingCharRegex.test(nextChar) ? "\n" + indentation : "";
      const pos = start + indentation.length + 1;
      insertText("\n" + indentation + closingLine, pos, pos);
    }
  };

  const handleComment = (commentStr) => {
    const { lineStart: firstLineStart } = getCurrentLine(start);
    const { lineEnd: lastLineEnd } = getCurrentLine(end === start ? end : end - 1);
    const fullLines = textarea.value.slice(firstLineStart, lastLineEnd).split("\n");
    const isCommented = (line) => line.trimStart().startsWith(commentStr);
    const nonEmpty = fullLines.filter((line) => line.trim().length > 0);
    const allCommented = nonEmpty.length > 0 && nonEmpty.every(isCommented);
    const minIndent = Math.min(...nonEmpty.map((line) => line.match(leadingSpacesRegex)[0].length));
    const newTextLines = fullLines.map((line) => {
      if (line.trim().length === 0) return line;
      const indentation = line.match(leadingSpacesRegex)[0];
      const content = line.slice(indentation.length);
      if (allCommented) {
        if (content.startsWith(commentStr + " ")) return indentation + content.slice(commentStr.length + 1);
        return indentation + content.slice(commentStr.length);
      }
      return " ".repeat(minIndent) + commentStr + " " + line.slice(minIndent);
    });
    const text = newTextLines.join("\n");
    textarea.setSelectionRange(firstLineStart, lastLineEnd);
    document.execCommand("insertText", false, text);
    if (start === end) {
      const delta = text.length - (lastLineEnd - firstLineStart);
      textarea.setSelectionRange(start + delta, start + delta);
    } else {
      textarea.setSelectionRange(firstLineStart, firstLineStart + text.length);
    }
  };

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveEditorFile();
    return;
  }
  switch (e.key) {
    case "Tab":
      e.preventDefault();
      handleTab(e.shiftKey);
      return;
    case "Enter":
      e.preventDefault();
      handleEnter();
      return;
    case "/":
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleComment("//");
      }
      return;
    case "#":
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleComment("#");
      }
      return;
  }

  const pairs = { "(": ")", "{": "}", "[": "]", '"': '"', "'": "'", "`": "`" };
  const nextChar = start < textarea.value.length ? textarea.value[start] : "";
  if (Object.values(pairs).includes(e.key) && nextChar === e.key && start === end) {
    e.preventDefault();
    textarea.setSelectionRange(start + 1, start + 1);
    return;
  }
  if (e.key in pairs && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    if (start === end) {
      insertText(e.key + pairs[e.key], start + 1, start + 1, false);
    } else {
      const selected = textarea.value.slice(start, end);
      insertText(e.key + selected + pairs[e.key], start + 1, start + 1 + selected.length, true);
    }
  }
});

$(".file-content").addEventListener("input", function (e) {
  $(".act-save-edit-file").disabled = !isModified(e.target);
  updateLineNumbers();
});
$(".file-content").addEventListener("scroll", syncScrolling);
$(".act-save-edit-file").addEventListener("click", saveEditorFile);
$(".act-close-editor").addEventListener("click", closeEditor);

// ------------------------------------------------------------------ preview

function openPreview(path) {
  const name = path.substring(path.lastIndexOf("/") + 1);
  const src = apiUrl("view", { drive: currentDrive, path });
  const body = $(".preview-body");
  body.innerHTML = "";
  let media;
  if (IMAGE.test(name)) {
    media = document.createElement("img");
    media.alt = name;
  } else if (VIDEO.test(name)) {
    media = document.createElement("video");
    media.controls = true;
    media.autoplay = true;
  } else {
    media = document.createElement("audio");
    media.controls = true;
    media.autoplay = true;
  }
  media.src = src;
  body.appendChild(media);
  $(".preview-name").textContent = name;
  const download = $(".act-preview-download");
  download.href = downloadUrl(currentDrive, path, false);
  download.setAttribute("download", name);
  Dialog.show("preview");
}

function openFile(row) {
  const path = row.getAttribute("data-path");
  const size = parseInt(row.getAttribute("data-size") || "0", 10);
  if (IMAGE.test(path) || VIDEO.test(path) || AUDIO.test(path)) return openPreview(path);
  if (BINARY.test(path)) return startDownload(downloadUrl(currentDrive, path, false));
  if (size > EDIT_LIMIT) {
    if (confirm(L.tooLarge)) startDownload(downloadUrl(currentDrive, path, false));
    return;
  }
  openEditor(path);
}

// ------------------------------------------------------------------ add to Steam (beta)

function openSteamDialog(path) {
  const fileName = path.substring(path.lastIndexOf("/") + 1);
  const kind = launchKind(fileName);
  const dialog = $(".dialog.steam");
  dialog.setAttribute("data-path", path);
  $(".steam-file", dialog).textContent = kind === "native" ? `${path}\n${L.nativeNote}` : path;
  $("#steam-name").value = fileName.replace(/\.[^.]+$/, "");
  $("#steam-proton").checked = kind === "windows";
  $("#steam-options").value = "";
  Dialog.show("steam");
  $("#steam-name").focus();
  $("#steam-name").select();
}

async function addToSteam(force = false) {
  const dialog = $(".dialog.steam");
  const name = $("#steam-name").value.trim();
  if (!name) {
    alert(L.emptyName);
    return;
  }
  const params = {
    drive: currentDrive,
    path: dialog.getAttribute("data-path"),
    name,
    proton: $("#steam-proton").checked ? "1" : "0",
    options: $("#steam-options").value.trim(),
  };
  if (force) params.force = "1";
  Dialog.loading.show(L.steamAdding);
  let result;
  try {
    result = await (await api("POST", "steam", params)).json();
  } catch (error) {
    fail(error);
    return;
  }
  Dialog.loading.hide();
  if (result.ok) {
    Dialog.hide();
    alert(L.steamAdded(result.name, result.tool));
  } else if (result.code === "exists") {
    if (confirm(L.steamExists)) addToSteam(true);
  } else if (result.code === "no_answer" || result.code === "no_steam_client") {
    alert(L.steamNoAnswer);
  } else {
    alert(L.steamFailed(result.detail || result.code));
  }
}

$(".act-add-steam").addEventListener("click", () => addToSteam(false));

// ------------------------------------------------------------------ clicks

document.addEventListener("click", async (e) => {
  const browseAction = e.target.closest(".act-browse");
  if (browseAction && !e.target.closest(".dialog")) {
    e.preventDefault();
    const holder = browseAction.closest("[data-drive]") || browseAction;
    const drive = browseAction.getAttribute("data-drive") || holder.getAttribute("data-drive") || currentDrive;
    const path =
      browseAction.getAttribute("data-path") ||
      browseAction.closest("tr")?.getAttribute("data-path") ||
      "/";
    if (drive === currentDrive && path === currentPath) return;
    fetchFiles(drive, path);
    return;
  }

  const openAction = e.target.closest(".act-open-file");
  if (openAction) {
    e.preventDefault();
    openFile(openAction.closest("tr"));
    return;
  }

  const oActionOInput = e.target.closest(".act-oinput");
  if (oActionOInput) {
    e.preventDefault();
    const action = oActionOInput.getAttribute("data-action");
    if (!action) return;
    if (action.startsWith("rename")) {
      const filePath = oActionOInput.closest("tr").getAttribute("data-path");
      Dialog.showOneInput(action, filePath.substring(filePath.lastIndexOf("/") + 1), `${action}|${filePath}`);
    } else {
      Dialog.showOneInput(action, "", `${action}|${currentPath}`);
    }
    return;
  }

  const actSteam = e.target.closest(".act-steam");
  if (actSteam) {
    e.preventDefault();
    openSteamDialog(actSteam.closest("tr").getAttribute("data-path"));
    return;
  }

  const actDelete = e.target.closest(".act-delete");
  if (actDelete) {
    e.preventDefault();
    const file = actDelete.closest(".file-row").getAttribute("data-path");
    if (!file || !confirm(L.confirmDelete(file))) return;
    Dialog.loading.show(L.deleting);
    try {
      await api("POST", "delete", { drive: currentDrive, path: file });
      Dialog.loading.hide();
    } catch (error) {
      fail(error);
    }
    fetchSystemInfo().catch(console.error);
    fetchFiles(currentDrive, currentPath);
    return;
  }

  if (e.target.matches(".act-dialog-close")) {
    e.preventDefault();
    Dialog.hide();
  }
});

$(".act-save-oinput-file").addEventListener("click", async () => {
  const dialog = $(".dialog.oinput");
  const name = $("#oinput-input").value.trim();
  if (!name) {
    alert(L.emptyName);
    return;
  }
  const [actionType, path] = (dialog.getAttribute("data-cache") || "").split("|");
  try {
    if (actionType.startsWith("rename")) {
      Dialog.loading.show(L.renaming);
      await api("POST", "rename", { drive: currentDrive, path, name });
    } else if (actionType === "createFolder") {
      Dialog.loading.show(L.creating);
      await api("POST", "mkdir", { drive: currentDrive, path, name });
    } else if (actionType === "createFile") {
      Dialog.loading.show(L.creating);
      await api("POST", "mkfile", { drive: currentDrive, path, name });
    }
    Dialog.hide();
  } catch (error) {
    fail(error);
    return;
  }
  fetchFiles(currentDrive, currentPath);
});

$(".oinput-text-submit").addEventListener("keyup", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    this.closest(".dialog").querySelector(".btn-default")?.click();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || $(".dialog-background.hidden")) return;
  if (_runningUpload) return; // the upload dialog closes by itself
  if (!$(".dialog.editor.hidden")) return closeEditor();
  Dialog.hide();
});

window.addEventListener("popstate", (event) => {
  const state = event.state || getURLParams();
  if (state.drive) fetchFiles(state.drive, state.path || "/");
});

// ------------------------------------------------------------------ start

(async function () {
  applyI18n();
  try {
    await fetchSystemInfo();
  } catch (error) {
    if (error.message !== "Unauthorized") messageRow(L.failed(error.message));
    return;
  }
  const params = getURLParams();
  const drive = drives.some((d) => d.id === params.drive) ? params.drive : "home";
  await fetchFiles(drive, params.path);
})();
