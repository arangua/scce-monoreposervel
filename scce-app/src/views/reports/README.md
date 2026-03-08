# Vista Reportes (Respaldos y reportes)

Vista de métricas, respaldos y divergencias. Patrón enterprise:

- **Gate inyectado**: `ReportsGate` con datos (cases, divergencias), helpers (timeDiff, isSlaVencido, critColor), refs de inputs de importación y callbacks de export/import.
- **Testeable**: se puede probar con un mock de `ReportsGate` sin montar App.

App construye `reportsGate` y renderiza `<ReportsViewComponent gate={reportsGate} />` como `Reports` para la ruta `view==="reports"`.
