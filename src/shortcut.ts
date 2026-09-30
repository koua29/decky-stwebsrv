/**
 * Creates non-Steam game shortcuts for the web page (beta).
 *
 * Only the Steam client can do it, through SteamClient.Apps, the same calls
 * Heroic, NonSteamLaunchers and MoonDeck use. The backend sends a request as
 * an event and waits for the answer given to `shortcut_result`.
 */
import { callable } from "@decky/api";

export interface ShortcutRequest {
  id: string;
  name: string;
  exe: string;
  start_dir: string;
  options: string;
  proton: boolean;
  force: boolean;
  existing: number;
}

export interface ShortcutResult {
  ok: boolean;
  code: string;
  appid?: number;
  tool?: string;
  detail?: string;
}

const sendResult = callable<[id: string, result: ShortcutResult], void>("shortcut_result");

const PREFERRED_TOOL = "proton_experimental";

function shortcutStillExists(appId: number): boolean {
  const store = (window as any).appStore;
  try {
    return Boolean(appId && store?.GetAppOverviewByAppID?.(appId));
  } catch {
    return false;
  }
}

/** Proton Experimental when installed, otherwise the newest Proton, otherwise the first tool. */
async function pickCompatTool(apps: any, appId: number): Promise<{ name: string; label: string }> {
  try {
    const tools: { strToolName: string; strDisplayName: string }[] = (await apps.GetAvailableCompatTools(appId)) || [];
    const preferred = tools.find((tool) => tool.strToolName === PREFERRED_TOOL);
    const proton = tools
      .filter((tool) => /proton/i.test(tool.strToolName))
      .sort((a, b) => b.strToolName.localeCompare(a.strToolName, undefined, { numeric: true }));
    const chosen = preferred || proton[0] || tools[0];
    if (chosen) return { name: chosen.strToolName, label: chosen.strDisplayName || chosen.strToolName };
  } catch (e) {
    console.warn("[STWebSRV] GetAvailableCompatTools failed", e);
  }
  return { name: PREFERRED_TOOL, label: "Proton Experimental" };
}

async function createShortcut(request: ShortcutRequest): Promise<ShortcutResult> {
  const apps = (window as any).SteamClient?.Apps;
  if (!apps?.AddShortcut) return { ok: false, code: "no_steam_client" };

  if (request.existing && !request.force && shortcutStillExists(request.existing)) {
    return { ok: false, code: "exists", appid: request.existing };
  }

  const appId = await apps.AddShortcut(request.name, request.exe, request.start_dir, request.options);
  if (typeof appId !== "number" || appId <= 0) return { ok: false, code: "add_failed" };

  // AddShortcut no longer applies every field by itself on recent clients.
  apps.SetShortcutName(appId, request.name);
  apps.SetShortcutExe(appId, request.exe);
  apps.SetShortcutStartDir(appId, request.start_dir);
  if (request.options) apps.SetAppLaunchOptions(appId, request.options);

  let tool = "";
  if (request.proton) {
    const chosen = await pickCompatTool(apps, appId);
    apps.SpecifyCompatTool(appId, chosen.name);
    tool = chosen.label;
  }
  return { ok: true, code: "added", appid: appId, tool };
}

/** Handles one request from the backend and always answers it. */
export async function handleShortcutRequest(
  request: ShortcutRequest,
  onAdded: (name: string, appId: number) => void,
): Promise<void> {
  let result: ShortcutResult;
  try {
    result = await createShortcut(request);
  } catch (e) {
    console.error("[STWebSRV] shortcut failed", e);
    result = { ok: false, code: "error", detail: String(e) };
  }
  await sendResult(request.id, result);
  if (result.ok && result.appid) onAdded(request.name, result.appid);
}
