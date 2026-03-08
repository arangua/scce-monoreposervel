# Vista Checklist Electoral

Checklist pre-apertura, apertura, operación y cierre. Patrón enterprise:

- **Gate inyectado**: `ChecklistGate` con S, themeColor, Badge. El estado de checks es local a la vista.
- **Testeable**: se puede probar con un mock de `ChecklistGate` sin montar App.

App construye `checklistGate` y renderiza `<ChecklistViewComponent gate={checklistGate} />` como `ChecklistView`.
