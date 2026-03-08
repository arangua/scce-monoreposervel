# Vista Configuración

Configuración de elección, información del sistema y reset demo. Patrón enterprise:

- **Gate inyectado**: `ConfigGate` con electionConfig, applyConfig, localCatalog, chainResult, divergencias, APP_VERSION, MIN_ELECTION_YEAR, doReset, S, themeColor.
- **Estado local**: draft y confirmYear viven en la vista; applyConfig persiste en App.
- **Testeable**: se puede probar con un mock de `ConfigGate` sin montar App.

App construye `configGate` y renderiza `<ConfigViewComponent gate={configGate} />` como `ConfigView`.
