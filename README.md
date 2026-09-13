<p align="center"><img src="assets/stwebsrv-banner.png" alt="STWebSRV — Steam Web Server, Decky plugin for SteamOS" width="100%"></p>

<p align="center"><b>English</b> · <a href="README.fr.md">Français</a></p>

# STWebSRV — Steam Web Server

**[Decky Loader](https://decky.xyz/)** plugin for **SteamOS** (Steam Deck, Lenovo Legion Go S / Go 2, Steam Machine…). A toggle in the Quick Access Menu starts a **web file manager** on the console: from the browser of your phone or computer, you browse, download, upload, rename, delete and edit the console's files, without switching to Desktop Mode or installing an SFTP client.

The web page is adapted from the **WebUI of the [Bruce](https://github.com/BruceDevices/firmware) firmware** (LilyGO, M5Stack…), and keeps its look and its editor.

## 📸 Preview

<p align="center"><img src="docs/screenshot-device.jpg" alt="The STWebSRV panel in the Decky menu: server on, address, QR code, username and password" width="45%"></p>

<p align="center"><em>The Decky panel on a Lenovo Legion Go 2 (SteamOS): turn the server on, scan the QR code.</em></p>

<p align="center">
  <img src="docs/screenshot-login.png" alt="STWebSRV login page" width="40%">
  &nbsp;
  <img src="docs/screenshot-files.png" alt="The STWebSRV file explorer in a browser: home folder, SD card, shortcuts" width="56%">
</p>

<p align="center"><em>The login page and the explorer, opened from a computer on the network (French browser).</em></p>

## ✨ Features

### In the Decky menu

- **Web server on demand**: one toggle to start or stop it.
- **Address and QR code**: the address to open (`http://<console-ip>:8088`) and a QR code to scan with your phone. If port 8088 is taken, the server uses the next free one.
- **Username and password** shown in the panel: `deck` and a random 8-character password, created on first use and kept afterwards.
- **Password change**: the "New password" button generates another one and **immediately logs out every open session**.
- **Recent visitors**: the IP addresses connected in the last 5 minutes.
- **Automatic stop**: after 5, 15, 30 or 60 minutes without activity (15 by default), or never. A running transfer counts as activity. A notification tells you when it stops.
- **Web page theme** of your choice: **Steam** (blue, default), **Bruce** (pink, the original colors) or **Hacker** (green).
- **Notifications** can be turned off.

### In the browser

- **Login page** with the logo, username prefilled.
- **Drives**: the home folder, and every mounted **SD card or USB drive**, with used space and capacity.
- **Shortcuts** to useful SteamOS folders, shown only when they exist: Downloads, Desktop, ROMs and BIOS (EmuDeck), Steam, Proton prefixes, Flatpak apps.
- **Clickable breadcrumb** and refresh button; the page address follows the open folder (browser back button, bookmarks).
- **Upload** files or a **whole folder with its tree**, with a button or **drag and drop**, with a progress bar per file and **no size limit**. Confirmation before replacing an existing file.
- **Download** a file (resumable thanks to range requests) or a **whole folder as a .zip**, built on the fly.
- Built-in **text editor**, taken from Bruce: line numbers, indent with Tab / Shift+Tab, automatic closing of brackets and quotes, comments with Ctrl+/ or Ctrl+#, **save with Ctrl+S**, warning when closing without saving. Handy for config files (`.ini`, `.cfg`, `.json`, `.conf`…).
- **Preview** of images, videos and audio files in the page.
- **Rename, delete** (with confirmation), **create a file or a folder**.
- Page **usable on phones** and computers.
- **English or French**, following the browser's language (and Steam's language for the panel).

### Updates

- **Automatic check once a day** on GitHub, and a **Check for updates** button.
- **One-click install** from the panel, with the SHA-256 checksum verified by Decky.
- Optional **beta channel** to get test versions early, and a one-click **return to the stable version**.

## 📥 Installation

Requirement: a SteamOS console with [Decky Loader](https://decky.xyz/) installed.

### From the console, by URL (easiest)

1. Decky → ⚙️ Settings → General → turn on **Developer mode**.
2. Decky → ⚙️ → **Developer** → **Install plugin from URL**, then paste:
   ```
   https://github.com/koua29/decky-stwebsrv/releases/latest/download/STWebSRV.zip
   ```
3. Confirm: **STWebSRV** shows up in the Decky plugin list.

### With the ZIP file

Download `STWebSRV.zip` from the [Releases](https://github.com/koua29/decky-stwebsrv/releases) page, then Decky → ⚙️ → Developer → **Install plugin from ZIP file**.

## 🚀 Usage

1. Open **STWebSRV** in the Decky menu and turn on **Web server**.
2. Scan the QR code with your phone, or type the address shown (for example `http://192.168.1.20:8088`) in a browser connected to the **same network**.
3. Log in with the username and password shown in the panel.
4. When you are done, turn the server off (or let the automatic stop do it).

## 🔒 Security

- The server **only runs when you turn it on**, and stops by itself after the chosen idle time or when the plugin unloads.
- It runs with the console user's rights (`deck`), **never as root**: system files stay out of reach.
- Every path is checked on the server: **you cannot leave the chosen drive**, not even through a symbolic link. Deleting or renaming a link acts on the link, never on its target.
- **Password guessing protection**: after 5 wrong attempts, login is blocked for 30 seconds, and every failure is slowed down.
- Changes require the session (`HttpOnly`, `SameSite=Strict` cookie) and a header specific to the page, which blocks requests forged from another site. Files opened in the browser are served in a sandbox (an uploaded HTML file cannot run anything).
- The password is stored in `~/homebrew/settings/STWebSRV/settings.json`, readable by that user only.
- The connection is **plain HTTP** on the local network, like Bruce's WebUI: only turn the server on over a network you trust (your home Wi-Fi, not a hotel's).

## 🔄 Updates

STWebSRV checks once a day whether a new version is available on GitHub. When there is one, a notification shows up and the panel offers **Update to X.Y.Z**: Decky opens its usual confirmation window, checks the zip's SHA-256 checksum, then reloads the plugin. Settings (including the password) are stored outside the plugin folder, in `~/homebrew/settings/STWebSRV/`, and are left untouched.

You can also check by hand (**Check for updates**, at the bottom of the panel), or reinstall from the URL above, which always points to the latest stable version.

Each version is published in the [Releases](https://github.com/koua29/decky-stwebsrv/releases) with a `vX.Y.Z` tag and its changelog.

### Beta versions

Options → **Beta versions** also looks at test versions (`vX.Y.Z-beta.N` tags, published as *pre-releases* on GitHub). They come earlier and may be unstable; without this option, STWebSRV only offers stable versions. An installed beta turns the option on by itself.

Turning the option off while a beta is installed makes the panel offer to **go back to the latest stable version**.

**Status**: young project (0.x). If something goes wrong, the logs are in `~/homebrew/logs/STWebSRV/`: open an [issue](https://github.com/koua29/decky-stwebsrv/issues) with their content.

## 🛠️ Development

```bash
npm install
./package.sh
```

`package.sh` builds the panel and produces `out/STWebSRV.zip`: a `STWebSRV/` folder with `dist/`, `web/`, `main.py`, `plugin.json`, `package.json`, `LICENSE` and `README.md`.

- `main.py`: HTTP server (Python standard library, in a thread), sessions, file operations, update checks.
- `web/`: the web page (HTML, CSS, JavaScript with no dependency).
- `src/`: the Decky panel (React), with the QR code generated by [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT).

## 🎮 SteamOS accessories

*Amazon affiliate links (amazon.fr): if you buy through these links, the project earns a small commission at no extra cost to you. Accessories for the SteamOS machines STWebSRV runs on.*

<table>
<tr>
<td align="center" width="33%">
  <a href="https://www.amazon.fr/dp/B0C349WPZG?linkCode=ll2&amp;tag=koua29-21&amp;ref_=as_li_ss_tl"><img src="assets/amazon-B0C349WPZG.jpg" width="200" alt="Steam Deck Docking Station"></a><br>
  <b><a href="https://www.amazon.fr/dp/B0C349WPZG?linkCode=ll2&amp;tag=koua29-21&amp;ref_=as_li_ss_tl">Steam Deck Docking Station</a></b><br><sub>Valve's official dock: display, wired network, USB</sub>
</td>
<td align="center" width="33%">
  <a href="https://www.amazon.fr/dp/B0HG8VBXSK?linkCode=ll2&amp;tag=koua29-21&amp;ref_=as_li_ss_tl"><img src="assets/amazon-B0HG8VBXSK.jpg" width="200" alt="Steam Machine dust cover"></a><br>
  <b><a href="https://www.amazon.fr/dp/B0HG8VBXSK?linkCode=ll2&amp;tag=koua29-21&amp;ref_=as_li_ss_tl">Steam Machine dust cover</a></b><br><sub>Keeps dust off the Steam Machine</sub>
</td>
<td align="center" width="33%">
  <a href="https://www.amazon.fr/dp/B0H2JS25Y3?linkCode=ll2&amp;tag=koua29-21&amp;ref_=as_li_ss_tl"><img src="assets/amazon-B0H2JS25Y3.jpg" width="200" alt="Steam Controller"></a><br>
  <b><a href="https://www.amazon.fr/dp/B0H2JS25Y3?linkCode=ll2&amp;tag=koua29-21&amp;ref_=as_li_ss_tl">Steam Controller</a></b><br><sub>Valve's controller, for PC, Steam Deck and Steam Machine</sub>
</td>
</tr>
</table>

<sub>As an Amazon Associate I earn from qualifying purchases. · En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises.</sub>

## ☕ Buy me a coffee

This project is free and open source. If it helps you, you can say thanks
by buying me a coffee — just scan this PayPal QR code. Thank you very much! 🙏

<p align="center">
  <img src="docs/paypal-qr.png" alt="PayPal QR code to buy me a coffee" width="220" />
</p>

## 📜 License and credits

**AGPL-3.0** — see [LICENSE](LICENSE). The web page reuses the code of the WebUI of [Bruce](https://github.com/BruceDevices/firmware) (AGPL-3.0, web interface by [lshaf](https://github.com/lshaf)): thanks to them.

Unofficial project, not affiliated with Valve or Lenovo. Steam, SteamOS, Steam Deck and Steam Machine are trademarks of Valve Corporation.
