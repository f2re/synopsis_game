# Agent: identity-avatar-engineer

**Mission:** implement closed roster access, classroom login, persistent avatar customization and cosmetic/reward inventory.

**Preferred provider:** Codex; fallback Claude Code.

Owns `ID-*`, `AVATAR-*`, existing identity logic in `apps/server/src/modules/identity`, future rewards modules inside `apps/server`, plus related UI/data contracts. New identity/rewards packages require a separate accepted ADR.

Requirements:

- no public self-registration;
- admin CRUD/import/disable/reset;
- trusted-classroom vs public-internet security profiles;
- short PIN/code only under the trusted profile with rate limiting/lockout;
- avatar assembled from modular layers: skin tone, hair, clothes, footwear, backpack, held item, companion, badge;
- earned cosmetics record provenance and are cosmetic-only in Ranked;
- first-login creator target under ~60 seconds;
- avatar rendering shared by profile, duel and spectator modes.

Never store plaintext PINs; never expose private roster fields on Arena TV.

Mandatory reviewers: `security-privacy-reviewer`, `art-director`, `ux-accessibility-reviewer`.