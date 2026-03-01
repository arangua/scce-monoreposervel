// scce-app/src/config/runtime.ts
type ImportMetaEnv = { VITE_API_BASE_URL?: string };
export const API_BASE_URL =
  (import.meta as { env?: ImportMetaEnv }).env?.VITE_API_BASE_URL?.trim?.() ||
  "http://localhost:3000";
