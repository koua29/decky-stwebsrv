"""STWebSRV (Steam Web Server) backend.

Starts a small web file manager on the device, on demand, protected by a
password: browse, download, upload, rename, delete and edit files from any
browser on the local network. The web page is adapted from the WebUI of the
Bruce firmware (AGPL-3.0).

The server runs in a background thread with the plugin's own rights (the
Decky user, not root), and every path is kept inside the chosen drive.
"""
import asyncio
import http.server
import json
import os
import re
import secrets
import shutil
import socket
import ssl
import stat
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

import decky

# Decky runs plugins inside its frozen Python, which only ships the modules its
# own code imports: the optional ones must not prevent the plugin from loading.
try:
    import mimetypes
except ImportError:
    mimetypes = None
try:
    import zipfile
except ImportError:
    zipfile = None

PLUGIN_DIR = os.path.dirname(os.path.realpath(__file__))
WEB_DIR = os.path.join(PLUGIN_DIR, "web")
HOME = getattr(decky, "DECKY_USER_HOME", "") or os.path.expanduser("~")
CURRENT_VERSION = getattr(decky, "DECKY_PLUGIN_VERSION", "0.0.0")
IS_PRERELEASE = "-" in CURRENT_VERSION

DEFAULT_PORT = 8088
PORT_TRIES = 10            # 8088 busy: try the next ports
SESSION_TTL = 12 * 3600    # seconds a login stays valid
MAX_FAILS = 5              # wrong passwords before a pause
LOCK_SECONDS = 30
EDIT_LIMIT = 2 * 1024 * 1024
CHUNK = 256 * 1024
IDLE_CHOICES = (0, 5, 15, 30, 60)
THEMES = {
    "bruce": (":root{--color:#ff3ec8;--background:#242424;"
              "--light-color:color-mix(in srgb,var(--color) 20%,gray 20%);}"),
    "steam": (":root{--color:#3a9cff;--background:#05080d;"
              "--light-color:color-mix(in srgb,var(--color) 25%,#05080d 60%);}"),
    "hacker": (":root{--color:#02de02;--background:#050805;"
               "--light-color:color-mix(in srgb,var(--color) 20%,black 50%);}"),
}
PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"  # no 0/o, 1/l/i

# Files the web page can add to Steam as non-Steam games (beta).
LAUNCH_EXT = {
    "windows": [".exe", ".bat", ".cmd", ".msi"],             # run through Proton
    "native": [".sh", ".appimage", ".x86_64", ".x86", ".run"],
}
SHORTCUT_TIMEOUT = 20  # seconds the web request waits for Steam's answer

DEFAULT_SETTINGS = {"port": DEFAULT_PORT, "user": "deck", "password": "", "idle_minutes": 15,
                    "theme": "steam", "notify": True, "language": "en", "beta": IS_PRERELEASE}
SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")
SHORTCUTS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "shortcuts.json")


# --------------------------------------------------------------------------- storage

def _load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def _save(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.chmod(tmp, 0o600)  # holds the web password
    os.replace(tmp, path)


def _new_password():
    return "".join(secrets.choice(PASSWORD_ALPHABET) for _ in range(8))


# --------------------------------------------------------------------------- network

_ips_cache = (0.0, [])


def _lan_ips():
    """IPv4 addresses other devices can reach, the default route's first (cached 15 s)."""
    global _ips_cache
    if time.time() - _ips_cache[0] < 15:
        return _ips_cache[1]
    ips = []
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))  # no packet is sent
            ips.append(s.getsockname()[0])
    except OSError:
        pass
    try:
        out = subprocess.run(["ip", "-4", "-o", "addr", "show", "scope", "global"],
                             capture_output=True, text=True, timeout=3).stdout
        ips += re.findall(r"inet (\d+\.\d+\.\d+\.\d+)/", out)
    except (OSError, subprocess.SubprocessError):
        pass
    seen = []
    for ip in ips:
        if ip not in seen and not ip.startswith("127."):
            seen.append(ip)
    _ips_cache = (time.time(), seen)
    return seen


# --------------------------------------------------------------------------- drives

def _unescape_mount(path):
    return re.sub(r"\\([0-7]{3})", lambda m: chr(int(m.group(1), 8)), path)


def _drives():
    """Home, then every SD card or USB drive SteamOS mounted under /run/media."""
    drives = [{"id": "home", "label": "Home", "root": HOME}]
    try:
        with open("/proc/mounts", encoding="utf-8") as f:
            mounts = [_unescape_mount(line.split()[1]) for line in f if line.startswith("/dev/")]
    except OSError:
        mounts = []
    for mount in sorted(set(mounts)):
        if mount.startswith("/run/media/") and os.path.isdir(mount):
            name = os.path.basename(mount)
            drives.append({"id": "media-" + re.sub(r"[^A-Za-z0-9_.-]", "_", name),
                           "label": name, "root": mount})
    return drives


def _shortcuts():
    """Handy folders of a SteamOS home, shown only when they exist."""
    candidates = [
        ("Downloads", "Downloads"),
        ("Desktop", "Desktop"),
        ("ROMs", "Emulation/roms"),
        ("BIOS", "Emulation/bios"),
        ("Steam", ".local/share/Steam"),
        ("Proton prefixes", ".local/share/Steam/steamapps/compatdata"),
        ("Flatpak apps", ".var/app"),
    ]
    return [{"label": label, "drive": "home", "path": "/" + rel}
            for label, rel in candidates if os.path.isdir(os.path.join(HOME, rel))]


def _human(n):
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n} B"


_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
          ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm",
          ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".txt": "text/plain",
          ".json": "application/json"}


def _content_type(name):
    guess = mimetypes.guess_type(name)[0] if mimetypes else None
    return guess or _TYPES.get(os.path.splitext(name)[1].lower(), "application/octet-stream")


class HttpError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def _drive_root(drive_id):
    drive = next((d for d in _drives() if d["id"] == drive_id), None)
    if drive is None:
        raise HttpError(404, "Unknown drive")
    return os.path.realpath(drive["root"])


def _inside(root, path):
    return path == root or path.startswith(root.rstrip(os.sep) + os.sep)


def _resolve(drive_id, rel, follow=True):
    """Absolute path of `rel` inside the drive. Refuses anything that leaves it.

    follow=False keeps the last component as is, so deleting or renaming a
    symbolic link acts on the link, never on what it points to.
    """
    root = _drive_root(drive_id)
    rel = (rel or "/").replace("\\", "/")
    if "\x00" in rel:
        raise HttpError(400, "Bad path")
    joined = os.path.normpath(os.path.join(root, rel.lstrip("/")))
    if follow:
        full = os.path.realpath(joined)
    else:
        name = os.path.basename(joined)
        full = os.path.join(os.path.realpath(os.path.dirname(joined)), name)
    if not _inside(root, full):
        raise HttpError(403, "Outside the drive")
    return root, full


def _valid_name(name):
    name = (name or "").strip()
    if not name or name in (".", "..") or "/" in name or "\x00" in name:
        raise HttpError(400, "Invalid name")
    return name


def _launch_kind(path):
    """'windows', 'native' or None: how Steam would run this file."""
    lower = path.lower()
    for kind, extensions in LAUNCH_EXT.items():
        if lower.endswith(tuple(extensions)):
            return kind
    return None


def _makedirs_inside(root, directory):
    """os.makedirs, refusing to create anything through a link that leaves the drive."""
    existing = directory
    while not os.path.lexists(existing):
        existing = os.path.dirname(existing)
    if not _inside(root, os.path.realpath(existing)):
        raise HttpError(403, "Outside the drive")
    os.makedirs(directory, exist_ok=True)
    if not _inside(root, os.path.realpath(directory)):
        raise HttpError(403, "Outside the drive")


def _list(drive_id, rel):
    root, full = _resolve(drive_id, rel)
    if not os.path.isdir(full):
        raise HttpError(404, "Not a folder")
    entries = []
    with os.scandir(full) as it:
        for entry in it:
            try:
                is_dir = entry.is_dir()  # follows links, like a file manager
                try:
                    info = entry.stat()
                except OSError:  # broken link
                    info = entry.stat(follow_symlinks=False)
            except OSError:
                continue
            entries.append({
                "name": entry.name,
                "type": "dir" if is_dir else "file",
                "link": entry.is_symlink(),
                "size": 0 if is_dir else info.st_size,
                "mtime": int(info.st_mtime),
            })
    entries.sort(key=lambda e: (e["type"] != "dir", e["name"].lower()))
    path = "/" + os.path.relpath(full, root).replace(os.sep, "/")
    return {"drive": drive_id, "path": "/" if path == "/." else path, "entries": entries}


def _info():
    drives = []
    for d in _drives():
        try:
            usage = shutil.disk_usage(d["root"])
            used, total = usage.used, usage.total
        except OSError:
            used = total = 0
        drives.append({"id": d["id"], "label": d["label"], "used": _human(used), "total": _human(total)})
    return {"version": CURRENT_VERSION, "hostname": socket.gethostname(),
            "drives": drives, "shortcuts": _shortcuts(), "launch_ext": LAUNCH_EXT}


# --------------------------------------------------------------------------- web server

class WebServer:
    """The HTTP server and everything it shares with its request threads."""

    def __init__(self, plugin):
        self.plugin = plugin
        self.httpd = None
        self.thread = None
        self.port = 0
        self.sessions = {}
        self.fails = 0
        self.locked_until = 0
        self.last_activity = 0
        self.clients = {}
        self.lock = threading.Lock()

    # ---- lifecycle

    def start(self, port):
        handler = type("Handler", (_Handler,), {"server_ref": self})
        last_error = None
        for candidate in range(port, port + PORT_TRIES):
            try:
                httpd = http.server.ThreadingHTTPServer(("0.0.0.0", candidate), handler)
                break
            except OSError as e:
                last_error = e
        else:
            raise last_error or OSError("No free port")
        httpd.daemon_threads = True
        self.httpd, self.port = httpd, candidate
        self.last_activity = time.time()
        self.thread = threading.Thread(target=httpd.serve_forever, kwargs={"poll_interval": 0.5},
                                       name="stwebsrv-http", daemon=True)
        self.thread.start()
        decky.logger.info("Web server listening on port %s", candidate)

    def stop(self):
        httpd, self.httpd = self.httpd, None
        if httpd:
            httpd.shutdown()
            httpd.server_close()
            decky.logger.info("Web server stopped")
        with self.lock:
            self.sessions.clear()
            self.clients.clear()

    @property
    def running(self):
        return self.httpd is not None

    # ---- sessions

    def touch(self, ip):
        now = time.time()
        with self.lock:
            self.last_activity = now
            self.clients[ip] = now

    def recent_clients(self, window=300):
        now = time.time()
        with self.lock:
            return sorted(ip for ip, ts in self.clients.items() if now - ts < window)

    def login(self, user, password):
        settings = self.plugin.settings
        with self.lock:
            if time.time() < self.locked_until:
                return None, "locked"
            ok = (secrets.compare_digest(user.encode(), settings["user"].encode()) and
                  secrets.compare_digest(password.encode(), settings["password"].encode()))
            if not ok:
                self.fails += 1
                if self.fails >= MAX_FAILS:
                    self.fails, self.locked_until = 0, time.time() + LOCK_SECONDS
                return None, "failed"
            self.fails = 0
            token = secrets.token_urlsafe(32)
            self.sessions[token] = time.time() + SESSION_TTL
            return token, "ok"

    def logout(self, token):
        with self.lock:
            self.sessions.pop(token, None)

    def valid(self, token):
        with self.lock:
            expiry = self.sessions.get(token or "")
            if expiry and expiry > time.time():
                return True
            self.sessions.pop(token or "", None)
            return False

    def forget_sessions(self):
        with self.lock:
            self.sessions.clear()


class _Handler(http.server.BaseHTTPRequestHandler):
    server_ref = None  # set on the subclass built by WebServer.start
    protocol_version = "HTTP/1.1"

    def version_string(self):
        return "STWebSRV"

    STATIC = {"/index.css": ("index.css", "text/css"),
              "/index.js": ("index.js", "text/javascript"),
              "/favicon.png": ("favicon.png", "image/png"),
              "/logo.png": ("logo.png", "image/png")}

    def log_message(self, fmt, *args):
        decky.logger.debug("web %s - %s", self.client_address[0], fmt % args)

    # ---- helpers

    def _cookie_token(self):
        for part in (self.headers.get("Cookie") or "").split(";"):
            name, _, value = part.strip().partition("=")
            if name == "STWSESSION":
                return value
        return ""

    def _authed(self):
        ok = self.server_ref.valid(self._cookie_token())
        if ok:
            self.server_ref.touch(self.client_address[0])
        return ok

    def _query(self):
        return {k: v[0] for k, v in urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query,
                                                          keep_blank_values=True).items()}

    def _send(self, status, body=b"", content_type="text/plain; charset=utf-8", headers=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, data, status=200):
        self._send(status, json.dumps(data, ensure_ascii=False), "application/json; charset=utf-8")

    def _redirect(self, location, cookie=None):
        headers = {"Location": location}
        if cookie:
            headers["Set-Cookie"] = cookie
        self._send(302, b"", headers=headers)

    def _file(self, name, content_type):
        try:
            with open(os.path.join(WEB_DIR, name), "rb") as f:
                body = f.read()
        except OSError:
            return self._send(404, "Not found")
        self._send(200, body, content_type + ("; charset=utf-8" if content_type.startswith("text") else ""))

    def _read_body(self, limit=None):
        length = int(self.headers.get("Content-Length") or 0)
        if limit is not None and length > limit:
            raise HttpError(413, "Too large")
        self.body_started = True
        return self.rfile.read(length) if length else b""

    def _drain(self):
        """Throws away an unread request body, so the connection stays usable.

        A body already partly read, or a big one, closes the connection instead.
        """
        remaining = int(self.headers.get("Content-Length") or 0)
        if self.body_started or remaining > 1024 * 1024:
            self.close_connection = True
            return
        while remaining > 0:
            chunk = self.rfile.read(min(CHUNK, remaining))
            if not chunk:
                break
            remaining -= len(chunk)

    # ---- dispatch

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")

    def _dispatch(self, method):
        route = urllib.parse.urlsplit(self.path).path
        self.body_started = False
        try:
            if method == "GET" and route in self.STATIC:
                return self._file(*self.STATIC[route])
            if method == "GET" and route == "/theme.css":
                theme = THEMES.get(self.server_ref.plugin.settings.get("theme"), THEMES["steam"])
                return self._send(200, theme, "text/css; charset=utf-8")
            if method == "GET" and route == "/":
                return self._file("index.html" if self._authed() else "login.html", "text/html")
            if method == "POST" and route == "/login":
                return self._login()
            if method == "GET" and route == "/logout":
                self.server_ref.logout(self._cookie_token())
                return self._redirect("/?loggedout", "STWSESSION=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict")
            if not route.startswith("/api/"):
                return self._send(404, "Not found")
            if not self._authed():
                self._drain()
                return self._send(401, "Unauthorized")
            if method == "POST" and self.headers.get("X-STWebSRV") != "1":
                # A page on another site cannot add this header without a CORS preflight we never accept.
                self._drain()
                return self._send(403, "Missing request header")
            handler = getattr(self, f"_api_{method.lower()}_{route[5:]}", None)
            if handler is None:
                self._drain()
                return self._send(404, "Not found")
            handler(self._query())
        except HttpError as e:
            self._drain()
            self._send(e.status, e.message)
        except (BrokenPipeError, ConnectionResetError):
            self.close_connection = True
        except PermissionError as e:
            self._drain()
            self._send(403, f"Permission denied: {e.filename or ''}")
        except FileNotFoundError:
            self._drain()
            self._send(404, "Not found")
        except OSError as e:
            decky.logger.warning("web %s %s: %s", method, route, e)
            self._drain()
            self._send(500, str(e))

    # ---- login

    def _login(self):
        form = urllib.parse.parse_qs(self._read_body(limit=4096).decode("utf-8", "replace"))
        token, status = self.server_ref.login((form.get("username") or [""])[0],
                                              (form.get("password") or [""])[0])
        if token:
            self.server_ref.touch(self.client_address[0])
            return self._redirect("/", f"STWSESSION={token}; Path=/; Max-Age={SESSION_TTL}; HttpOnly; SameSite=Strict")
        time.sleep(1)  # slows password guessing down
        self._redirect("/?locked" if status == "locked" else "/?failed")

    # ---- read

    def _api_get_info(self, q):
        self._json(_info())

    def _api_get_list(self, q):
        self._json(_list(q.get("drive", "home"), q.get("path", "/")))

    def _api_get_read(self, q):
        _, full = _resolve(q.get("drive", "home"), q.get("path"))
        if not os.path.isfile(full):
            raise HttpError(404, "Not a file")
        if os.path.getsize(full) > EDIT_LIMIT:
            raise HttpError(413, "File too large to edit")
        with open(full, "rb") as f:
            data = f.read()
        if b"\x00" in data[:8192]:
            raise HttpError(415, "Binary file")
        self._send(200, data.decode("utf-8", "replace"))

    def _api_get_download(self, q):
        self._stream_file(q, attachment=True)

    def _api_get_view(self, q):
        self._stream_file(q, attachment=False)

    def _stream_file(self, q, attachment):
        _, full = _resolve(q.get("drive", "home"), q.get("path"))
        if not os.path.isfile(full):
            raise HttpError(404, "Not a file")
        size = os.path.getsize(full)
        start, end, status = 0, size - 1, 200
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range") or "")
        if match and size and (match.group(1) or match.group(2)):
            if match.group(1):
                start = int(match.group(1))
                end = min(int(match.group(2)), size - 1) if match.group(2) else size - 1
            else:
                start = max(size - int(match.group(2)), 0)
            if start > end:
                return self._send(416, "", headers={"Content-Range": f"bytes */{size}"})
            status = 206
        name = os.path.basename(full)
        content_type = _content_type(name)
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(end - start + 1 if size else 0))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "sandbox")  # an uploaded HTML file cannot run here
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        disposition = "attachment" if attachment else "inline"
        self.send_header("Content-Disposition",
                         f"{disposition}; filename*=UTF-8''{urllib.parse.quote(name)}")
        self.end_headers()
        if self.command == "HEAD" or not size:
            return
        with open(full, "rb") as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = f.read(min(CHUNK, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)
                self.server_ref.touch(self.client_address[0])

    def _api_get_zip(self, q):
        if zipfile is None:
            raise HttpError(501, "Folder download is not available on this system")
        root, full = _resolve(q.get("drive", "home"), q.get("path"))
        if not os.path.isdir(full):
            raise HttpError(404, "Not a folder")
        name = (os.path.basename(full) or q.get("drive", "home")) + ".zip"
        self.send_response(200)
        self.send_header("Content-Type", "application/zip")
        self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{urllib.parse.quote(name)}")
        self.send_header("Connection", "close")  # length unknown: the end of the stream marks the end
        self.end_headers()
        self.close_connection = True
        writer = _Unseekable(self.wfile, lambda: self.server_ref.touch(self.client_address[0]))
        with zipfile.ZipFile(writer, "w", zipfile.ZIP_STORED, allowZip64=True) as archive:
            for folder, dirs, files in os.walk(full):
                dirs.sort()
                for file_name in sorted(files):
                    path = os.path.join(folder, file_name)
                    if not os.path.isfile(path) or not _inside(root, os.path.realpath(path)):
                        continue
                    try:
                        archive.write(path, os.path.relpath(path, os.path.dirname(full)))
                    except OSError as e:
                        decky.logger.warning("zip skipped %s: %s", path, e)

    # ---- write

    def _api_post_upload(self, q):
        folder_root, folder = _resolve(q.get("drive", "home"), q.get("path", "/"))
        parts = [p for p in (q.get("name") or "").replace("\\", "/").split("/") if p]
        if not parts:
            raise HttpError(400, "Invalid name")
        for part in parts:
            _valid_name(part)
        target = os.path.join(folder, *parts)  # a dropped folder keeps its tree
        _makedirs_inside(folder_root, os.path.dirname(target))
        remaining = int(self.headers.get("Content-Length") or 0)
        tmp = target + ".stwebsrv-part"
        self.body_started = True
        try:
            with open(tmp, "wb") as f:
                while remaining > 0:
                    chunk = self.rfile.read(min(CHUNK, remaining))
                    if not chunk:
                        raise HttpError(400, "Upload interrupted")
                    f.write(chunk)
                    remaining -= len(chunk)
                    self.server_ref.touch(self.client_address[0])
            os.replace(tmp, target)
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)
        self._send(200, "Uploaded")

    def _api_post_save(self, q):
        _, full = _resolve(q.get("drive", "home"), q.get("path"))
        if os.path.isdir(full):
            raise HttpError(400, "Is a folder")
        data = self._read_body(limit=EDIT_LIMIT)
        tmp = full + ".stwebsrv-part"
        with open(tmp, "wb") as f:
            f.write(data)
        if os.path.exists(full):
            shutil.copymode(full, tmp)
        os.replace(tmp, full)
        self._send(200, "Saved")

    def _api_post_mkdir(self, q):
        _, parent = _resolve(q.get("drive", "home"), q.get("path", "/"))
        target = os.path.join(parent, _valid_name(q.get("name")))
        if os.path.lexists(target):
            raise HttpError(409, "Already exists")
        os.mkdir(target)
        self._send(200, "Created")

    def _api_post_mkfile(self, q):
        _, parent = _resolve(q.get("drive", "home"), q.get("path", "/"))
        target = os.path.join(parent, _valid_name(q.get("name")))
        if os.path.lexists(target):
            raise HttpError(409, "Already exists")
        with open(target, "xb"):
            pass
        self._send(200, "Created")

    def _api_post_rename(self, q):
        root, full = _resolve(q.get("drive", "home"), q.get("path"), follow=False)
        if full == root:
            raise HttpError(400, "Cannot rename the drive")
        if not os.path.lexists(full):
            raise HttpError(404, "Not found")
        target = os.path.join(os.path.dirname(full), _valid_name(q.get("name")))
        if os.path.lexists(target):
            raise HttpError(409, "Already exists")
        os.rename(full, target)
        self._send(200, "Renamed")

    def _api_post_delete(self, q):
        root, full = _resolve(q.get("drive", "home"), q.get("path"), follow=False)
        if full == root:
            raise HttpError(400, "Cannot delete the drive")
        if os.path.islink(full) or os.path.isfile(full):
            os.remove(full)
        elif os.path.isdir(full):
            shutil.rmtree(full)
        else:
            raise HttpError(404, "Not found")
        self._send(200, "Deleted")


    def _api_post_steam(self, q):
        """Adds the file to Steam as a non-Steam game, through the Decky panel."""
        _, full = _resolve(q.get("drive", "home"), q.get("path"))
        if not os.path.isfile(full):
            raise HttpError(404, "Not a file")
        kind = _launch_kind(full)
        if kind is None:
            raise HttpError(415, "Steam cannot launch this kind of file")
        if '"' in full:
            raise HttpError(400, "The path contains a double quote")
        name = (q.get("name") or "").strip() or os.path.splitext(os.path.basename(full))[0]
        options = (q.get("options") or "").strip()
        if len(name) > 200 or len(options) > 1000 or "\x00" in name + options:
            raise HttpError(400, "Invalid name or launch options")
        if kind == "native":
            mode = os.stat(full).st_mode
            if not mode & stat.S_IXUSR:  # Steam runs the file itself: it must be executable
                os.chmod(full, mode | stat.S_IXUSR)
        request = {
            "path": full,
            "name": name,
            "exe": f'"{full}"',  # quoted the way Steam stores shortcuts
            "start_dir": f'"{os.path.dirname(full)}"',
            "options": options,
            "proton": q.get("proton", "1" if kind == "windows" else "0") == "1",
            "force": q.get("force") == "1",
        }
        self._json(self.server_ref.plugin.add_steam_shortcut(request))


class _Unseekable:
    """Write-only stream for zipfile: no seek, so it writes data descriptors."""

    def __init__(self, raw, on_write):
        self.raw, self.on_write, self.pos = raw, on_write, 0

    def write(self, data):
        self.raw.write(data)
        self.pos += len(data)
        self.on_write()
        return len(data)

    def tell(self):
        return self.pos

    def flush(self):
        self.raw.flush()


# --------------------------------------------------------------------------- updates

REPO = "koua29/decky-stwebsrv"
ZIP_NAME = "STWebSRV.zip"
UPDATE_INTERVAL = 86400  # one GitHub check per day
USER_AGENT = "STWebSRV (+https://github.com/koua29/decky-stwebsrv)"


def _ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    for path in ("/etc/ssl/certs/ca-certificates.crt",
                 "/etc/ca-certificates/extracted/tls-ca-bundle.pem"):
        if os.path.exists(path):
            return ssl.create_default_context(cafile=path)
    return ssl.create_default_context()


_SSL = _ssl_context()


def _get_json(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT,
                                               "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=timeout, context=_SSL) as resp:
        return json.loads(resp.read().decode("utf-8", "replace"))


_PRERELEASE = re.compile(r"-(?:beta|rc|alpha)\.?(\d+)?", re.I)


def _version_key(version):
    """Sortable version: 0.2.0-beta.2 sits after 0.1.9 but before 0.2.0."""
    numbers = tuple(int(n) for n in re.findall(r"\d+", version.split("-", 1)[0])[:3])
    numbers += (0,) * (3 - len(numbers))
    pre = _PRERELEASE.search(version)
    return numbers + ((0, int(pre.group(1) or 0)) if pre else (1, 0))


def _latest_release(current, beta=False):
    """Newest release of the chosen channel, compared with the installed version."""
    if beta:
        releases = [r for r in _get_json(f"https://api.github.com/repos/{REPO}/releases?per_page=20")
                    if not r.get("draft")]
        release = max(releases, key=lambda r: _version_key(r.get("tag_name", "")), default={})
    else:
        try:
            release = _get_json(f"https://api.github.com/repos/{REPO}/releases/latest")
        except urllib.error.HTTPError as e:
            if e.code != 404:  # 404: only pre-releases so far, nothing stable to offer
                raise
            release = {}
    asset = next((a for a in release.get("assets", []) if a.get("name") == ZIP_NAME), {})
    latest = release.get("tag_name", "").lstrip("v")
    digest = asset.get("digest") or ""
    return {
        "current": current,
        "latest": latest,
        "available": bool(asset) and _version_key(latest) > _version_key(current),
        # Leaving the beta channel while running a beta build: offer the stable one back.
        "rollback": bool(asset) and not beta and _version_key(latest) < _version_key(current),
        "prerelease": bool(release.get("prerelease")),
        "channel": "beta" if beta else "stable",
        "title": release.get("name", ""),
        "notes": (release.get("body") or "")[:800],
        "url": release.get("html_url", ""),
        "zip_url": asset.get("browser_download_url", ""),
        "zip_sha256": digest[7:] if digest.startswith("sha256:") else "",
    }


# --------------------------------------------------------------------------- plugin

class Plugin:
    settings = dict(DEFAULT_SETTINGS)
    server = None
    error = ""
    update = None
    last_update_check = 0
    update_notified = ""
    task = None
    loop = None
    pending = None
    shortcut_lock = None

    async def _main(self):
        self.loop = asyncio.get_running_loop()
        self.pending = {}
        self.shortcut_lock = threading.Lock()
        self.settings = {**DEFAULT_SETTINGS, **_load(SETTINGS_FILE, {})}
        if not self.settings["password"]:
            self.settings["password"] = _new_password()
            _save(SETTINGS_FILE, self.settings)
        self.server = WebServer(self)
        self.task = asyncio.get_event_loop().create_task(self._loop())
        decky.logger.info("STWebSRV %s started", CURRENT_VERSION)

    async def _unload(self):
        if self.task:
            self.task.cancel()
        if self.server and self.server.running:
            await asyncio.to_thread(self.server.stop)

    # ---- called by the frontend

    async def get_state(self):
        return self._snapshot()

    async def start_server(self):
        if not self.server.running:
            try:
                await asyncio.to_thread(self.server.start, int(self.settings["port"]))
                self.error = ""
            except OSError as e:
                decky.logger.exception("Web server failed to start")
                self.error = str(e)
        return self._snapshot()

    async def stop_server(self):
        if self.server.running:
            await asyncio.to_thread(self.server.stop)
        return self._snapshot()

    async def new_password(self):
        self.settings["password"] = _new_password()
        _save(SETTINGS_FILE, self.settings)
        self.server.forget_sessions()  # everyone logs in again
        return self._snapshot()

    async def set_setting(self, key, value):
        if key == "idle_minutes":
            self.settings[key] = int(value) if int(value) in IDLE_CHOICES else 15
        elif key == "theme":
            self.settings[key] = value if value in THEMES else "steam"
        elif key == "language":
            self.settings[key] = "fr" if str(value) == "fr" else "en"
        elif key in ("notify", "beta"):
            self.settings[key] = bool(value)
        else:
            return self._snapshot()
        _save(SETTINGS_FILE, self.settings)
        if key == "beta":
            asyncio.get_event_loop().create_task(self._check_update())
        return self._snapshot()

    async def check_update(self):
        return self.update if await self._check_update() else None

    async def shortcut_result(self, request_id, result):
        """Answer of the Decky panel to a stw_add_shortcut event."""
        waiter = (self.pending or {}).get(request_id)
        if waiter:
            waiter["result"] = result if isinstance(result, dict) else {"ok": False, "code": "error"}
            waiter["event"].set()

    # ---- called from web server threads

    def add_steam_shortcut(self, request):
        """Asks the panel to create the shortcut and waits for its answer.

        Only the frontend can reach SteamClient, so the request travels as an
        event and comes back through shortcut_result. One at a time: Steam
        misbehaves when shortcuts are created concurrently.
        """
        with self.shortcut_lock:
            known = _load(SHORTCUTS_FILE, {})
            request_id = secrets.token_hex(8)
            waiter = {"event": threading.Event(), "result": None}
            self.pending[request_id] = waiter
            payload = {k: v for k, v in request.items() if k != "path"}
            payload.update(id=request_id, existing=int((known.get(request["path"]) or {}).get("appid", 0)))
            try:
                asyncio.run_coroutine_threadsafe(decky.emit("stw_add_shortcut", payload), self.loop)
                answered = waiter["event"].wait(SHORTCUT_TIMEOUT)
            finally:
                self.pending.pop(request_id, None)
            if not answered:
                return {"ok": False, "code": "no_answer"}
            result = waiter["result"]
            if result.get("ok") and result.get("appid"):
                known[request["path"]] = {"appid": int(result["appid"]), "name": request["name"],
                                          "ts": int(time.time())}
                _save(SHORTCUTS_FILE, known)
            decky.logger.info("Steam shortcut %s: %s", request["name"], result)
            return {"ok": bool(result.get("ok")), "code": str(result.get("code") or ""),
                    "appid": int(result.get("appid") or 0), "tool": str(result.get("tool") or ""),
                    "detail": str(result.get("detail") or "")[:300], "name": request["name"]}

    # ---- internals

    def _snapshot(self):
        running = bool(self.server and self.server.running)
        port = self.server.port if running else int(self.settings["port"])
        ips = _lan_ips() if running else []
        idle = int(self.settings["idle_minutes"])
        stops_in = None
        if running and idle:
            stops_in = max(0, int(idle * 60 - (time.time() - self.server.last_activity)))
        return {
            "running": running,
            "port": port,
            "urls": [f"http://{ip}:{port}" for ip in ips],
            "hostname": socket.gethostname(),
            "user": self.settings["user"],
            "password": self.settings["password"],
            "clients": self.server.recent_clients() if running else [],
            "stops_in": stops_in,
            "error": self.error,
            "settings": {k: v for k, v in self.settings.items() if k != "password"},
            "version": CURRENT_VERSION,
            "update": self.update,
        }

    async def _loop(self):
        await asyncio.sleep(45)
        while True:
            try:
                await self._stop_if_idle()
                if time.time() - self.last_update_check >= UPDATE_INTERVAL:
                    await self._check_update()
            except asyncio.CancelledError:
                raise
            except Exception:
                decky.logger.exception("Background job failed")
            await asyncio.sleep(20)

    async def _stop_if_idle(self):
        idle = int(self.settings["idle_minutes"])
        if not (self.server.running and idle):
            return
        if time.time() - self.server.last_activity >= idle * 60:
            await asyncio.to_thread(self.server.stop)
            decky.logger.info("Web server stopped after %s idle minutes", idle)
            if self.settings["notify"]:
                await decky.emit("stw_idle_stop", idle)
            await decky.emit("stw_state", self._snapshot())

    async def _check_update(self):
        self.last_update_check = time.time()
        try:
            self.update = await asyncio.to_thread(_latest_release, CURRENT_VERSION, self.settings["beta"])
        except (OSError, ValueError) as e:
            decky.logger.warning("Update check failed: %s", e)
            return False
        latest = self.update["latest"]
        if self.update["available"] and self.update_notified != latest:
            self.update_notified = latest
            if self.settings["notify"]:
                await decky.emit("stw_update", latest, self.update["title"])
        await decky.emit("stw_state", self._snapshot())
        return True
