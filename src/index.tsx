import {
  ButtonItem,
  DropdownItem,
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
import { useEffect, useMemo, useState } from "react";
import qrcode from "qrcode-generator";

import banner from "../assets/stwebsrv-banner-panel.png";
import icon from "../assets/stwebsrv-icon-128.png";
import { FocusRow } from "./focus";
import { lang, t } from "./i18n";
import type { Settings, State, Update } from "./types";

const getState = callable<[], State>("get_state");
const startServer = callable<[], State>("start_server");
const stopServer = callable<[], State>("stop_server");
const newPassword = callable<[], State>("new_password");
const setSetting = callable<[key: keyof Settings, value: boolean | string | number], State>("set_setting");
const checkUpdate = callable<[], Update | null>("check_update");

const PLUGIN_NAME = "STWebSRV";
const INSTALL_TYPE_UPDATE = 2; // InstallType.UPDATE in Decky Loader
const POLL_MS = 3000;

const muted = { fontSize: "12px", lineHeight: "16px", opacity: 0.7 };

function Icon({ size }: { size: string }) {
  return <img src={icon} style={{ width: size, height: size, borderRadius: "22%" }} />;
}

function openWeb(url: string) {
  Navigation.NavigateToExternalWeb(url);
  Navigation.CloseSideMenus();
}

function qrDataUrl(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createDataURL(4, 2);
}

async function installUpdate(update: Update) {
  // Same call as Decky's own store: Decky shows its install prompt, checks the
  // SHA-256 of the zip, then reloads the plugin.
  const backend = (window as any).DeckyBackend;
  if (!backend?.call) {
    openWeb(update.url);
    return;
  }
  await backend.call(
    "utilities/install_plugin",
    update.zip_url,
    PLUGIN_NAME,
    update.latest,
    update.zip_sha256,
    INSTALL_TYPE_UPDATE,
  );
  // Decky installs the files but can leave this panel mounted on the old code:
  // ask its loader for the new build, then close the menu so reopening mounts it.
  const loader = (window as any).DeckyPluginLoader;
  try {
    await (loader?.importPlugin?.(PLUGIN_NAME, update.latest) ??
      loader?.loadPlugin?.(PLUGIN_NAME) ??
      Promise.resolve());
  } catch (e) {
    console.error("[STWebSRV] plugin reload failed", e);
  }
  toaster.toast({ title: t.toastUpdated, body: t.toastUpdatedBody, logo: <Icon size="100%" /> });
  Navigation.CloseSideMenus();
}

function UpdateRows({ update }: { update: Update }) {
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
    <>
      <PanelSectionRow>
        <div style={{ ...muted, opacity: 1 }}>
          {t.updateLine(update.latest, update.current)}
          {update.prerelease && ` [${t.betaTag}]`}
          {update.title && <div style={{ fontWeight: "bold" }}>{update.title}</div>}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={installing} onClick={onInstall}>
          {installing ? t.installing : update.available ? t.updateTo(update.latest) : t.rollbackTo(update.latest)}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => openWeb(update.url)}>
          {t.seeChanges}
        </ButtonItem>
      </PanelSectionRow>
    </>
  );
}

function ServerDetails({ state, onNewPassword }: { state: State; onNewPassword: () => void }) {
  const url = state.urls[0];
  const qr = useMemo(() => (url ? qrDataUrl(url) : ""), [url]);

  return (
    <>
      <PanelSectionRow>
        <FocusRow block="center" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          {url ? (
            <>
              <div style={muted}>{t.address}</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", wordBreak: "break-all", textAlign: "center" }}>
                {url}
              </div>
              <img
                src={qr}
                style={{ width: "150px", height: "150px", imageRendering: "pixelated", background: "#fff", borderRadius: "6px", padding: "6px" }}
              />
              {state.urls.slice(1).map((other) => (
                <div key={other} style={muted}>
                  {other}
                </div>
              ))}
            </>
          ) : (
            <div style={{ ...muted, color: "#ffb04a", opacity: 1 }}>{t.noNetwork}</div>
          )}
        </FocusRow>
      </PanelSectionRow>
      <PanelSectionRow>
        <FocusRow block="nearest" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div>{t.login(state.user)}</div>
          <div style={{ fontFamily: "monospace", fontSize: "16px", letterSpacing: "1px" }}>{t.password(state.password)}</div>
        </FocusRow>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onNewPassword}>
          {t.newPassword}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={muted}>
          {state.clients.length ? t.clients(state.clients.join(", ")) : t.noClients}
          {state.stops_in !== null && <div>{t.stopsIn(state.settings.idle_minutes)}</div>}
        </div>
      </PanelSectionRow>
    </>
  );
}

function Content() {
  const [state, setState] = useState<State | null>(null);
  const [switching, setSwitching] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    getState().then(async (s) => {
      setState(s);
      if (s.settings.language !== lang) setState(await setSetting("language", lang));
    });
    const listener = addEventListener<[State]>("stw_state", setState);
    return () => {
      removeEventListener("stw_state", listener);
    };
  }, []);

  // Recent visitors and the idle timer only move while the server runs.
  useEffect(() => {
    if (!state?.running) return;
    const id = setInterval(() => getState().then(setState).catch(console.error), POLL_MS);
    return () => clearInterval(id);
  }, [state?.running]);

  const onToggleServer = async (on: boolean) => {
    setSwitching(true);
    try {
      setState(await (on ? startServer() : stopServer()));
    } finally {
      setSwitching(false);
    }
  };

  const onNewPassword = async () => {
    setState(await newPassword());
    toaster.toast({ title: "STWebSRV", body: t.newPasswordDone, logo: <Icon size="100%" /> });
  };

  const onCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const update = await checkUpdate();
      if (update) setState((s) => (s ? { ...s, update } : s));
      if (!update) {
        toaster.toast({ title: t.toastCheckFailed, body: t.toastCheckFailedBody });
      } else if (update.available || update.rollback) {
        toaster.toast({ title: t.toastUpdateFound(update.latest), body: t.toastUpdateFoundBody, logo: <Icon size="100%" /> });
      } else {
        toaster.toast({ title: t.toastUpToDate, body: t.version(update.current), logo: <Icon size="100%" /> });
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const change = async (key: keyof Settings, value: boolean | string | number) => {
    setState(await setSetting(key, value));
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

  const update = state.update;
  const idleOptions = [0, 5, 15, 30, 60].map((minutes) => ({
    data: minutes,
    label: minutes ? t.idleMinutes(minutes) : t.idleNever,
  }));
  const themeOptions = [
    { data: "steam", label: t.themeSteam },
    { data: "bruce", label: t.themeBruce },
    { data: "hacker", label: t.themeHacker },
  ];

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <FocusRow block="start" style={{ display: "flex", justifyContent: "center" }}>
            <img src={banner} style={{ width: "100%", borderRadius: "6px" }} />
          </FocusRow>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.serverSection}>
        <PanelSectionRow>
          <ToggleField
            label={switching ? t.starting : t.server}
            description={t.serverHelp}
            checked={state.running}
            disabled={switching}
            onChange={onToggleServer}
          />
        </PanelSectionRow>
        {state.error && (
          <PanelSectionRow>
            <div style={{ ...muted, color: "#ff6b6b", opacity: 1 }}>{t.startFailed(state.error)}</div>
          </PanelSectionRow>
        )}
        {state.running && <ServerDetails state={state} onNewPassword={onNewPassword} />}
        <PanelSectionRow>
          <div style={muted}>{t.warning}</div>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.optionsSection}>
        <PanelSectionRow>
          <DropdownItem
            label={t.idle}
            rgOptions={idleOptions}
            selectedOption={state.settings.idle_minutes}
            onChange={(option) => change("idle_minutes", option.data)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label={t.theme}
            rgOptions={themeOptions}
            selectedOption={state.settings.theme}
            onChange={(option) => change("theme", option.data)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.notifications}
            description={t.notificationsHelp}
            checked={state.settings.notify}
            onChange={(v) => change("notify", v)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.beta}
            description={t.betaHelp}
            checked={state.settings.beta}
            onChange={(v) => change("beta", v)}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.updatesSection}>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={checkingUpdate} onClick={onCheckUpdate}>
            {checkingUpdate ? t.searching : t.checkUpdates}
          </ButtonItem>
        </PanelSectionRow>
        {(update?.available || update?.rollback) && <UpdateRows update={update} />}
        <PanelSectionRow>
          <div style={muted}>
            {t.version(state.version)}
            {state.settings.beta && ` · ${t.betaTag}`}
          </div>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}

export default definePlugin(() => {
  const onIdleStop = addEventListener<[minutes: number]>("stw_idle_stop", (minutes) =>
    toaster.toast({ title: t.toastIdleStop, body: t.toastIdleStopBody(minutes), logo: <Icon size="100%" /> }),
  );
  const onUpdate = addEventListener<[version: string, title: string]>("stw_update", (version, title) =>
    toaster.toast({ title: t.toastUpdate(version), body: title || t.toastUpdateBody, logo: <Icon size="100%" /> }),
  );

  return {
    name: PLUGIN_NAME,
    titleView: (
      <div className={staticClasses.Title} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Icon size="24px" />
        STWebSRV
      </div>
    ),
    content: <Content />,
    icon: <Icon size="1em" />,
    onDismount() {
      removeEventListener("stw_idle_stop", onIdleStop);
      removeEventListener("stw_update", onUpdate);
    },
  };
});
