# Vista Catálogo (Catálogo Maestro de Locales)

Vista del catálogo de locales. Patrón enterprise:

- **Gate inyectado**: recibe `CatalogGate` con datos (localCatalog, divergencias, cases, regionOptions, regionsMap…), callbacks (catalogAddLocal, catalogToggleEleccion, catalogDeactivate, catalogReactivate) y helpers (catalogSelfCheck, fmtDate, Badge).
- **Testeable**: se puede probar con un mock de `CatalogGate` sin montar App.

App construye `catalogGate` y renderiza `<CatalogViewComponent gate={catalogGate} />` como `CatalogView` para la ruta `view==="catalog"`.
