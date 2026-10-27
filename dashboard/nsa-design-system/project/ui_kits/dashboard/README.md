# Management Dashboard UI Kit — NSA

Web app for day-to-day management of the fazenda. Designed at **1440×900** but fluid.

## Components

| File | Role |
|---|---|
| `Sidebar.jsx` | Left nav — deep-green, grouped by area (Pecuária / Agricultura / Operação). |
| `TopBar.jsx` | Breadcrumb + title + search + primary action button. |
| `KPICard.jsx` | Stat card with optional sparkline + delta. |
| `DataTable.jsx` | Zebra table with header strip, optional title+action toolbar. |
| `Sparkline.jsx` | Inline 7-day trend SVG polyline. |
| `DashboardView.jsx` | "Visão geral" — 4 KPIs + activity feed + alert stack. |
| `PiquetesView.jsx` | List of paddocks with capacity, water, salt/feed stock, status filter. |

## Interaction

- Click **Visão geral** or **Piquetes** in the sidebar to switch views.
- Filter pills at top-right of Piquetes are interactive.
- All other nav items are present but unresponsive (placeholders — this is a UI kit, not a product).

## Design notes

- Sidebar is the only deep-green surface; the content area is off-white with white cards — same pattern as Stripe/Linear.
- **Tabular numerals throughout** — columns of numbers align perfectly.
- **1.75 stroke Lucide icons**, 16px in nav / 14px inline.
- Zebra stripes at 2% darker, not a heavier colour — keeps density without noise.
- Buttons: primary is solid deep green + cream text. Secondary is white + 1px grey border.
