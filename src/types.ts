export interface Settings {
  port: number;
  user: string;
  idle_minutes: number;
  theme: string;
  notify: boolean;
  language: string;
  beta: boolean;
  address: string;
}

export interface Address {
  iface: string;
  ip: string;
  kind: "ethernet" | "wifi" | "other";
  default: boolean;
  url: string;
}

export interface Update {
  current: string;
  latest: string;
  available: boolean;
  rollback: boolean;
  prerelease: boolean;
  channel: string;
  title: string;
  notes: string;
  url: string;
  zip_url: string;
  zip_sha256: string;
}

export interface State {
  running: boolean;
  port: number;
  urls: string[];
  addresses: Address[];
  hostname: string;
  user: string;
  password: string;
  clients: string[];
  stops_in: number | null;
  error: string;
  settings: Settings;
  version: string;
  update: Update | null;
}
