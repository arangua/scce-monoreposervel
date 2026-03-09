# Vista Firma y confianza (4.3.b)

Panel de verificación de autoría, llave local y firmantes confiables. Patrón enterprise:

- **Gate inyectado**: `TrustGate` con notify, onTrustKeyAdded, onTrustKeyRemoved, currentUser, UI_TEXT, S, themeColor, setView.
- **Dominio**: la vista importa hasSigningKey, getTrustedEntries, publicKeyFingerprintShort, addTrustedKey, removeTrustedKey desde `domain/signingVault`.
- **Testeable**: se puede mockear el gate y, si se desea, el módulo signingVault.

App construye `trustGate` (con callbacks que registran en auditoría) y renderiza `<TrustViewComponent gate={trustGate} />` como `TrustView`.
