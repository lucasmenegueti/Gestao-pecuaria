# Board Deck UI Kit — NSA

Reusable slide components for Fazenda Nossa Senhora Aparecida board/council meetings. Designed at **1280×720** (16:9).

## Slide archetypes

| Component | Purpose |
|---|---|
| `TitleSlide` | Opens the deck. Dark green, logo top-left, meeting metadata footer. |
| `SectionSlide` | Divider between topics. Cream bg, giant ghost number, green title. |
| `KPISlide` | One hero metric + 4 supporting stats. Good for financial summaries. |
| `TableSlide` | Dense financial/operational table with optional highlight rows. |
| `StrategySlide` | Two-column priorities list (typically Agricultura / Pecuária). |
| `PhotoSlide` | Full-bleed photo with dark overlay and pull quote. |

All slides pull `SlideChrome` for the top mark + slide counter + footer line.

## Design decisions

- **Title on dark green** to establish brand immediately; the rest of the deck stays on off-white for readability and printability.
- **No gradients, no decorative shadows**. Borders and zebra rows do the heavy lifting on tables.
- **Tabular numerals everywhere** so numbers align column-wise.
- **Lora serif** used only for the `N.S.A` wordmark — everywhere else is Inter.
- **Numbers styled as the page's typography**, not turned into infographics — per "Stripe/Linear dashboards, linhas finas, números alinhados à direita".

## To use in a real deck

Wrap in `<deck-stage>` (see `deck_stage.js` starter) for keyboard nav + print-to-PDF, or export slide-by-slide through the project's PPTX tool.
