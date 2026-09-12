export interface Game {
  appid: number;
  subid: number | null;
  name: string;
  type: string;
  image: string;
  original_price: string;
  ends: string;
  owned: boolean;
}

export interface Settings {
  auto_claim: boolean;
  include_dlc: boolean;
  notify: boolean;
  language: string;
  beta: boolean;
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

export interface Claimed {
  appid: number;
  name: string;
  ts: number;
  price_cents?: number;
  currency?: string;
}

export interface State {
  games: Game[];
  last_check: number;
  logged_in: boolean | null;
  error: string;
  checking: boolean;
  settings: Settings;
  claimed: Claimed[];
  totals: { count: number; cents: number; currency: string };
  library: { count: number; cents: number; currency: string; priced: number; ts: number };
  computing_stats: boolean;
  version: string;
  update: Update | null;
}
