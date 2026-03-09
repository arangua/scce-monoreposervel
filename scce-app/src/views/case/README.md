# Vista Caso (Case)

Vistas y componentes del flujo de detalle de caso. Patrón enterprise:

- **Presentacionales**: reciben datos por props (o por gate), sin acceso a estado global.
- **Contrato claro**: tipos en `types.ts` (`CaseDetailGate`, `CreateInstructionParams`); dependencias de dominio/config vía imports.
- **Testables**: se pueden probar con mocks de `CaseItem` o del gate sin montar App.

## Componentes

- **CaseProgressSection**, **GovernanceSection**: presentacionales que reciben `CaseItem` y datos derivados.
- **CaseDetailView**: vista completa de detalle; recibe `gate: CaseDetailGate` y `selectedCaseId`. App construye el gate e inyecta callbacks y datos (setView, cases, notify, canDo, etc.). La vista no importa nada de App.
