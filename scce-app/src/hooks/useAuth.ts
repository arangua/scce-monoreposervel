/**
 * R-3 — Sesión API: bootstrap tras token y login.
 * Extraído de App.tsx (2026-03-27).
 */
import { useCallback } from "react";
import { apiRequest } from "../domain/apiClient";
import {
  clearSession,
  getActiveMembership,
  setActiveMembership,
  setToken,
  type ApiUser,
  type Membership,
} from "../domain/authSession";
import type { CaseItem } from "../domain/types";
import { appendEvent } from "../domain/audit";
import { useAppStore } from "../store/useAppStore";

export function useAuth() {
  const {
    setAuthToken,
    setApiUser,
    setMemberships,
    setActiveMembershipState,
    setCurrentUser,
    setLoginErr,
    setMembershipScopes,
    setCtxErr,
    setCases,
    setAuthBusy,
    setAuditLog,
    setOperationMode,
    loginForm,
  } = useAppStore();

  const bootstrapSession = useCallback(async (token: string) => {
    const meRes = await apiRequest<{
      user: ApiUser;
      memberships?: Array<{
        id: string;
        regionCode?: string | null;
        regionScopeMode?: string;
        regionScope?: string[];
      }>;
    }>("/me", { token });
    console.log("ME (crudo):", meRes);

    const meMembershipsForLog = meRes.ok ? (meRes.data.memberships ?? []) : [];
    console.log(
      "ME memberships resumido:",
      meMembershipsForLog.map((m: {
        id: string;
        regionCode?: string | null;
        regionScopeMode?: string;
        regionScope?: string[];
      }) => ({
        id: m.id,
        regionCode: m.regionCode,
        regionScopeMode: m.regionScopeMode,
        regionScope: m.regionScope,
      }))
    );

    if (!meRes.ok) {
      clearSession();
      setAuthToken(null);
      setApiUser(null);
      setMemberships([]);
      setActiveMembershipState(null);
      setCurrentUser(null);
      setLoginErr("Sesión inválida o expirada. Inicia sesión nuevamente.");
      return;
    }
    setApiUser(meRes.data.user);
    if (meRes.data.memberships?.length) {
      const map: Record<
        string,
        { regionScopeMode: "ALL" | "LIST"; regionScope: string[]; regionCode?: string | null }
      > = {};
      for (const m of meRes.data.memberships) {
        map[m.id] = {
          regionScopeMode: (m.regionScopeMode === "ALL" ? "ALL" : "LIST") as "ALL" | "LIST",
          regionScope: Array.isArray(m.regionScope) ? m.regionScope : [],
          regionCode: m.regionCode ?? null,
        };
      }
      setMembershipScopes(map);
    }

    const ctxRes = await apiRequest<{ memberships: Membership[] }>("/contexts", { token });
    if (!ctxRes.ok) {
      setCtxErr(ctxRes.error || "No se pudo cargar contextos.");
      setMemberships([]);
      return;
    }
    setCtxErr("");
    setMemberships(ctxRes.data.memberships || []);

    if (!getActiveMembership()) {
      const list = ctxRes.data.memberships || [];

      if (list.length === 1) {
        setActiveMembership(list[0]);
        setActiveMembershipState(list[0]);
      }
    }

    // FASE 2: cargar modo operacional desde API
    const sysRes = await apiRequest<{ operationMode?: string }>("/system/config", { token });
    if (sysRes.ok && sysRes.data.operationMode) {
      const validModes = ["NORMAL", "CONTINGENCIA", "DEGRADADO"];
      if (validModes.includes(sysRes.data.operationMode)) {
        setOperationMode(sysRes.data.operationMode as "NORMAL" | "CONTINGENCIA" | "DEGRADADO");
      }
    }

    const effectiveMembership = getActiveMembership();
    if (token && effectiveMembership) {
      const headers: Record<string, string> = {};
      if (effectiveMembership.id) headers["x-scce-membership-id"] = effectiveMembership.id;
      if (effectiveMembership.contextType && effectiveMembership.contextId) {
        headers["x-scce-context-type"] = effectiveMembership.contextType;
        headers["x-scce-context-id"] = effectiveMembership.contextId;
      }
      const res = await apiRequest<unknown>("/cases", {
        token,
        method: "GET",
        headers: Object.keys(headers).length ? headers : undefined,
      });

      if (res.ok && Array.isArray(res.data)) {
        setCases(res.data as CaseItem[]);
      }
    }
  }, [
    setAuthToken,
    setApiUser,
    setMemberships,
    setActiveMembershipState,
    setCurrentUser,
    setLoginErr,
    setMembershipScopes,
    setCtxErr,
    setCases,
    setOperationMode,
  ]);

  const doLogin = useCallback(async () => {
    setLoginErr("");
    setCtxErr("");
    setAuthBusy(true);
    try {
      const res = await apiRequest<{ token: string }>("/auth/login", {
        method: "POST",
        body: { email: loginForm.email, password: loginForm.password },
      });

      if (!res.ok) {
        setLoginErr(res.error || "No se pudo iniciar sesión.");
        return;
      }

      const token = res.data.token;
      setToken(token);
      setAuthToken(token);

      await bootstrapSession(token);

      setAuditLog((prev) => appendEvent(prev, "LOGIN", "api", "API", null, "Inicio de sesión (API real)"));
    } finally {
      setAuthBusy(false);
    }
  }, [
    bootstrapSession,
    loginForm.email,
    loginForm.password,
    setAuthBusy,
    setToken,
    setAuthToken,
    setAuditLog,
    setCtxErr,
    setLoginErr,
  ]);

  return { bootstrapSession, doLogin };
}
