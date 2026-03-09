# Vista Dashboard (Panel de Operación)

Vista del panel principal de casos. Patrón enterprise:

- **Gate inyectado**: recibe `DashboardGate` con datos (visibleCases, metrics, divergencias, filterState…), callbacks (setView, setSelectedCase, setFilterState, changeStatus, recepcionar…) y componentes de UI (Badge, Tooltip, SlaBadge, RecBadge, IconButton).
- **Componentes internos**: `DivBadge` y `CaseCard` viven dentro de la vista y usan el gate; no se exportan.
- **Testeable**: se puede probar con un mock de `DashboardGate` sin montar App.

App construye `dashboardGate` y renderiza `<DashboardView gate={dashboardGate} />`. `regionsMap` y `metrics` se calculan en App y se pasan por el gate.
