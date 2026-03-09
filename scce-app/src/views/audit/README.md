# Vista Auditoría (Cadena Hash)

Vista de la cadena de auditoría y verificación de integridad. Patrón enterprise:

- **Gate inyectado**: `AuditGate` con auditLog, chainResult (ok, failIndex), S, themeColor, fmtDate, USERS, UI_TEXT_GOVERNANCE, canDo, currentUser, exportAuditCSV, Badge, Tooltip.
- **Testeable**: se puede probar con un mock de `AuditGate` sin montar App.

App construye `auditGate` y renderiza `<AuditViewComponent gate={auditGate} />` como `AuditView` para la ruta `view==="audit"`.
