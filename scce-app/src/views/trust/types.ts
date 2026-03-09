export interface TrustStatus {
  cryptoAvailable: boolean;
  hasKey: boolean;
  trustedCount: number;
}

export interface TrustEntryWithFp {
  alias: string;
  addedAt: string;
  reason: string;
  publicKeyB64: string;
  fingerprint: string;
}

export interface TrustGate {
  notify: (msg: string, kind: string) => void;
  onTrustKeyAdded: (alias: string, fingerprint: string) => void;
  onTrustKeyRemoved: (alias: string, fingerprint: string) => void;
  currentUser: { id: string; name: string; role?: string } | null;
  UI_TEXT: Record<string, unknown>;
  S: Record<string, unknown>;
  themeColor: (key: string) => string;
  setView: (v: string) => void;
}
