/**
 * store/useAppStore.ts
 * Re-exporta useAppStore y AppProvider para que los componentes
 * importen desde una ruta estable en lugar de desde AppContext.tsx.
 *
 * Uso:
 *   import { useAppStore } from "../store/useAppStore";
 *   import { AppProvider }  from "../store/useAppStore";
 */
export { useAppStore, AppProvider } from "./AppContext";
export type { AppStore, User, UiMode, FilterState, Notification,
              BypassFormState, BypassCause, SimReport, MembershipScope } from "./AppContext";
export type { ElectionConfig } from "../domain/types";
