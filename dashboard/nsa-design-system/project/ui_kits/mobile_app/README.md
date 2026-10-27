# Mobile App UI Kit — NSA

Field-facing iOS app for the mechanical management workflow (ordens de serviço). Two representative screens shown side-by-side.

## Screens

- **OSListScreen** — segmented header (Abertas / Em andamento / Concluídas) + feed of OS cards with status dots + bottom tab bar.
- **OSDetailScreen** — detail view with diagnosis, assignment metadata, parts list, primary action.

## Design notes

- Uses the brand's deep-green header as a replacement for the default iOS nav bar — makes the app feel owned by NSA without fighting iOS chrome.
- Cards are flat white on off-white with a 1px hairline — no heavy shadows.
- Status pills use the same semantic palette as the dashboard (eaf4ec/faf1dc/eaf0f6) for learned parity.
- Tab bar icons: Lucide 22px, 1.75 stroke, deep-green on active / grey-400 on inactive.
