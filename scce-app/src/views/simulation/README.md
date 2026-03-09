# Vista Simulación (Día de Elección)

Vista de simulación de incidentes para entrenamiento. Patrón enterprise:

- **Gate inyectado**: `SimulationGate` con simCases, simReport, simSurvey, setSimSurvey, runSimulation, loadSimCases, S, themeColor, critColor, Badge.
- **Testeable**: se puede probar con un mock de `SimulationGate` sin montar App.

App construye `simulationGate` y renderiza `<SimulationViewComponent gate={simulationGate} />` como `SimulationView` para la ruta correspondiente.
