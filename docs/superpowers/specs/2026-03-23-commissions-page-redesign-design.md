# Commissions Page Redesign — B+D Hybrid

## Problem

The commissions page currently shows technical/academic commissions (Analytics, NLP, ML, etc.) that don't match SECiD's actual organizational structure. The real org structure, defined in the "Comisiones SECiD" PDF, has a Board of Directors with Directive Commissions under each seat, plus cross-cutting Horizontal Commissions.

## Design

A dual-view commissions page with a toggle between two representations of the same data:

1. **"Vista detallada" (default)** — Option B nested layout: each board direction (Presidencia, Secretaria, Tesoreria) is a container with its commissions nested inside. Horizontal commissions shown as a grid below.
2. **"Organigrama"** — Option D ReactFlow interactive org chart: draggable nodes, bezier curve edges with animated dots, zoom/pan controls, and a minimap. Board at top, directive commissions in the middle connected by edges, horizontal commissions as full-width bars at the bottom.

A pill toggle below the hero switches between views with a crossfade transition.

## Org Structure (from PDF)

### Consejo Directivo

| Seat               | Name                            |
| ------------------ | ------------------------------- |
| Presidencia        | Jorge Alejandro Ramirez Bondi   |
| Secretaria General | Artemio Santiago Padilla Robles |
| Tesoreria          | Sara Kenia Cisneros             |

### Comisiones Directivas

| Commission                               | Reports To  | Sub-areas                                                                     |
| ---------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| Vinculacion y Relaciones Institucionales | Presidencia | UNAM, Sector privado, Sector publico, Egresados                               |
| IT                                       | Secretaria  | Infraestructura y servicios, Documentacion, Gestion de ordenes del dia / Jira |
| Transparencia y Legalidad                | Secretaria  | Cumplimiento de estatutos, Documentacion interna, Control de minutas          |
| Gestion de Recursos                      | Tesoreria   | Contabilidad y finanzas, Cumplimiento fiscal, Aseguramiento de ingresos       |

### Comisiones Horizontales

| Commission                       | Focus                                                         |
| -------------------------------- | ------------------------------------------------------------- |
| Comite de Etica                  | Codigo de Conducta, denuncias, mediacion, mejoras             |
| Desarrollo Profesional           | Talleres, cursos, mentorias, impacto social                   |
| Comunicacion y Difusion          | Redes sociales, boletines, marketing                          |
| Cultura y Responsabilidad Social | Actividades culturales, sostenibilidad, inclusion             |
| Academica e Innovacion           | Investigacion, innovacion, talleres, oportunidades academicas |

## Architecture

### Components

- **`CommissionOverview.tsx`** — Gutted and rebuilt. The existing data arrays (`directiveCommissions`, `horizontalCommissions`, `boardMembers`, `parentLabels`, `Commission` interface) are extracted to `commissions-data.ts`. The existing flat-grid rendering is replaced entirely. The new component renders only the toggle pill and conditionally mounts `CommissionsListView` or `CommissionsChartView`. The wrapper `CommissionsPage.tsx` is unchanged.
- **`CommissionsListView.tsx`** — New component. The nested layout (Option B) which replaces the current flat grid. Each board direction (Presidencia, Secretaria, Tesoreria) is a container card with its commissions nested inside — this is a different layout than the current flat grid with "reports to" badges. Pure React, no external dependencies.
- **`CommissionsChartView.tsx`** — New component. The ReactFlow interactive org chart (Option D). Uses `@xyflow/react` for the node graph with custom node components, bezier edges, minimap, and controls. Loaded via `React.lazy()`.
- **`commissions-data.ts`** — New file. Migrates all existing data from `CommissionOverview.tsx` (board members, directive commissions, horizontal commissions, parent labels, interfaces, i18n strings). Both views consume this same data.

### Custom ReactFlow Nodes

- **`BoardNode`** — Gradient header with role + name, connection handle at bottom. Width: 160px.
- **`CommissionNode`** — Border colored by parent direction, title + short description, sub-area tags, connection handle at top. Width: 140px.
- **`HorizontalCommissionNode`** — Full-width bar with color accent, title + responsibilities. Width: 500px.

### ReactFlow Layout Strategy

Node positions are hardcoded in `CommissionsChartView.tsx` (not auto-layout). The graph has a fixed conceptual canvas of ~600x700px:

- **Row 1 (y=0)**: 3 board nodes, spaced evenly at x=0, x=200, x=400
- **Row 2 (y=180)**: 4 directive commission nodes at x=0, x=150, x=300, x=450. Each positioned roughly below its parent.
- **Row 3 (y=420)**: 5 horizontal commission nodes stacked vertically (y increments of 60), centered at x=50, full width.

This avoids the complexity of a layout algorithm (dagre/elk) while producing a clean result. Positions can be fine-tuned visually during implementation.

### Data Flow

```
commissions-data.ts (shared)
    ├── CommissionsListView.tsx (reads data, renders nested HTML)
    └── CommissionsChartView.tsx (reads data, generates ReactFlow nodes/edges)
```

Both views are stateless renders of the same data — the toggle just swaps which component is mounted.

### Toggle Behavior

- Default view: "Vista detallada" (list/nested)
- Toggle state stored in React `useState<'list' | 'chart'>`, default `'list'`
- Toggle is a pill-style segmented control below the hero
- **Transition**: Both views are always mounted but the inactive one is hidden with `opacity: 0; pointer-events: none; position: absolute`. CSS transitions handle the 300ms fade. This avoids the complexity of coordinating `React.lazy` with animated unmounting.
- **Code-splitting**: `CommissionsChartView` is loaded via `React.lazy()` with a `<Suspense>` fallback (simple spinner). The lazy load triggers on first mount, so the chart bundle is fetched immediately but doesn't block the list view render. On slow connections, the user sees the list view instantly and the chart loads in the background.

### i18n

All strings live in `commissions-data.ts` with `{ es: string; en: string }` pattern, matching the existing site pattern. Both views receive `lang` prop and index into the data accordingly.

Labels:

- ES: "Vista detallada" / "Organigrama"
- EN: "Detailed view" / "Org chart"

## Dependencies

- **`@xyflow/react`** — ReactFlow v12. ~45KB gzipped. Only loaded when user toggles to org chart view. Can be code-split with `React.lazy()` so the list view (default) has zero additional bundle cost.

## Edge Cases

- **Mobile**: List view (B) is the default and naturally responsive. The org chart view (D) works on mobile with touch zoom/pan, but a small note could suggest landscape mode for best experience.
- **Dark/Light mode**: Both views use CSS variables (`--card-bg`, `--color-text-primary`, `--color-border`, etc.) already defined in the theme system. ReactFlow's background and node styles will use the same variables.
- **Existing commission routes**: Individual commission pages at `/commissions/{id}` currently reference the old technical commissions. These routes and their dashboard components are not modified by this spec — they can be cleaned up separately.

## Testing

- Unit test: `CommissionsListView` renders all 9 commissions with correct parent relationships
- Unit test: `CommissionsChartView` generates correct number of nodes (3 board + 4 directive + 5 horizontal = 12) and edges (4 directive edges)
- Unit test: Toggle switches between views
- Visual: Verify dark mode contrast on both views
- Visual: Verify mobile responsiveness of list view

## Files to Create/Modify

| File                                                  | Action                                      |
| ----------------------------------------------------- | ------------------------------------------- |
| `src/components/commissions/commissions-data.ts`      | Create — shared data + i18n                 |
| `src/components/commissions/CommissionsListView.tsx`  | Create — nested layout (B)                  |
| `src/components/commissions/CommissionsChartView.tsx` | Create — ReactFlow org chart (D)            |
| `src/components/commissions/nodes/BoardNode.tsx`      | Create — custom ReactFlow node              |
| `src/components/commissions/nodes/CommissionNode.tsx` | Create — custom ReactFlow node              |
| `src/components/commissions/nodes/HorizontalNode.tsx` | Create — custom ReactFlow node              |
| `src/components/commissions/CommissionOverview.tsx`   | Modify — add toggle, mount list/chart views |
| `package.json`                                        | Modify — add `@xyflow/react` dependency     |
