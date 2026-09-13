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
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let unit = 0;
  while (n >= 1024 && unit < units.length - 1) {
    n /= 1024;
    unit++;
  }
  return unit === 0 ? `${n} B` : `${n.toFixed(1)} ${units[unit]}`;
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

const IMAGE = /\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/i;
const VIDEO = /\.(mp4|webm|mkv|mov|m4v)$/i;
const AUDIO = /\.(mp3|ogg|oga|opus|wav|flac|m4a|aac)$/i;
const BINARY =
  /\.(zip|7z|rar|gz|tgz|xz|zst|bz2|tar|iso|chd|cso|rvz|wbfs|wua|nsp|xci|3ds|cia|nds|gba|gbc|gb|sfc|smc|nes|n64|z64|md|bin|cue|img|exe|dll|so|appimage|pak|vpk|pkg|deb|rpm|flatpak|jar|apk|pdf|ttf|otf|woff2?|db|sqlite|dat|sav|srm)$/i;
const EDIT_LIMIT = 2 * 1024 * 1024;

// ------------------------------------------------------------------ state and listing

let drives = [];
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

const _queueUpload = [];
let _runningUpload = false;
let _uploadFailures = 0;

function queueFiles(items) {
  // items: [{ file, name }] where name may contain sub-folders
  // Dropped folders merge into existing ones: only same-name files get replaced.
  const existing = new Set(currentEntries.filter((e) => e.type === "file").map((e) => e.name));
  const clashes = items.filter((i) => !i.name.includes("/") && existing.has(i.name)).length;
  if (clashes && !confirm(L.overwrite(clashes))) return;

  Dialog.show("upload");
  const body = $(".dialog.upload .dialog-body");
  for (const item of items) {
    const progress = T.uploadLoading();
    const id = stringToId(item.name);
    progress.querySelector(".upload-name").textContent = item.name;
    progress.querySelector(".bar").setAttribute("id", id);
    body.appendChild(progress);
    _queueUpload.push({ ...item, id, drive: currentDrive, folder: currentPath });
  }
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

function uploadOne(item) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open("POST", apiUrl("upload", { drive: item.drive, path: item.folder, name: item.name }), true);
    req.setRequestHeader("X-STWebSRV", "1");
    req.setRequestHeader("Content-Type", "application/octet-stream");
    req.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const bar = document.getElementById(item.id);
        if (bar) bar.style.width = Math.round((e.loaded / e.total) * 100) + "%";
      }
    };
    req.onload = () => {
      if (req.status === 401) {
        handleAuthError();
        reject(new Error("Unauthorized"));
      } else if (req.status >= 200 && req.status < 300) resolve();
      else reject(new Error(req.responseText || `HTTP ${req.status}`));
    };
    req.onerror = () => reject(new Error("Network error"));
    req.onabort = () => reject(new Error("Aborted"));
    req.send(item.file);
  });
}

async function uploadNext() {
  _runningUpload = true;
  while (_queueUpload.length) {
    const item = _queueUpload.shift();
    try {
      await uploadOne(item);
    } catch (error) {
      _uploadFailures++;
      const bar = document.getElementById(item.id);
      if (bar) bar.parentElement.classList.add("failed");
      console.error("Upload failed", item.name, error);
    }
  }
  _runningUpload = false;
  $(".dialog.upload .dialog-body").innerHTML = "";
  Dialog.hide();
  if (_uploadFailures) alert(L.uploadFailed(_uploadFailures));
  _uploadFailures = 0;
  fetchSystemInfo().catch(console.error);
  fetchFiles(currentDrive, currentPath);
}

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
