# Commissions Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat-grid commissions page with a dual-view (nested layout + ReactFlow org chart) that matches the PDF org structure.

**Architecture:** Extract commission data to a shared module, build two view components (list and chart) that consume it, wire them into the existing CommissionOverview with a toggle. ReactFlow chart is code-split via React.lazy.

**Tech Stack:** React 18, @xyflow/react v12, Vitest + RTL, CSS variables for theming

**Spec:** `docs/superpowers/specs/2026-03-23-commissions-page-redesign-design.md`

---

## File Structure

| File                                                              | Responsibility                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/components/commissions/commissions-data.ts`                  | All org data, interfaces, i18n strings. Single source of truth.                          |
| `src/components/commissions/CommissionsListView.tsx`              | Nested layout (Option B). Board directions as containers with commissions nested inside. |
| `src/components/commissions/CommissionsChartView.tsx`             | ReactFlow org chart (Option D). Nodes, edges, layout positions.                          |
| `src/components/commissions/nodes/BoardNode.tsx`                  | Custom ReactFlow node for board members.                                                 |
| `src/components/commissions/nodes/CommissionNode.tsx`             | Custom ReactFlow node for directive commissions.                                         |
| `src/components/commissions/nodes/HorizontalNode.tsx`             | Custom ReactFlow node for horizontal commissions.                                        |
| `src/components/commissions/CommissionOverview.tsx`               | Rebuilt. Toggle pill + conditional mount of list/chart views.                            |
| `tests/unit/components/commissions/CommissionsListView.test.tsx`  | Tests for list view rendering.                                                           |
| `tests/unit/components/commissions/CommissionsChartView.test.tsx` | Tests for chart node/edge generation.                                                    |
| `tests/unit/components/commissions/CommissionOverview.test.tsx`   | Tests for toggle behavior.                                                               |

---

### Task 1: Install @xyflow/react dependency

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install @xyflow/react
```

- [ ] **Step 2: Verify installation**

```bash
ls node_modules/@xyflow/react/package.json && echo "OK"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @xyflow/react dependency for commissions org chart"
```

---

### Task 2: Extract shared data to commissions-data.ts

**Files:**

- Create: `src/components/commissions/commissions-data.ts`

- [ ] **Step 1: Create the data file**

Move all data arrays (`boardMembers`, `directiveCommissions`, `horizontalCommissions`, `parentLabels`), the `Commission` interface, and i18n translations from `CommissionOverview.tsx` to this new file. Export everything as named exports:

```typescript
// Interfaces
export interface Commission { ... }  // existing interface, unchanged
export interface BoardMember { role: string; name: string; icon: string; }

// Data
export const boardMembers: { es: BoardMember[]; en: BoardMember[] } = { ... };
export const directiveCommissions: Commission[] = [ ... ];
export const horizontalCommissions: Commission[] = [ ... ];
export const parentLabels: Record<string, { es: string; en: string }> = { ... };

// Color mapping: parent id → color (used by both views)
export const directionColors: Record<string, string> = {
  presidencia: '#3B82F6',
  secretaria: '#8B5CF6',
  tesoreria: '#F59E0B',
};

// i18n strings used across views
export const commissionsI18n = {
  es: {
    boardTitle: 'Consejo Directivo',
    directiveTitle: 'Comisiones Directivas',
    directiveSubtitle: 'Comisiones que operan bajo una direccion del consejo directivo',
    horizontalTitle: 'Comisiones Horizontales',
    horizontalSubtitle: 'Comisiones transversales que apoyan a toda la organizacion',
    reportsTo: 'Reporta a',
    areas: 'Areas',
    listView: 'Vista detallada',
    chartView: 'Organigrama',
  },
  en: {
    boardTitle: 'Board of Directors',
    directiveTitle: 'Directive Commissions',
    directiveSubtitle: 'Commissions that operate under a board directorate',
    horizontalTitle: 'Horizontal Commissions',
    horizontalSubtitle: 'Cross-cutting commissions that support the entire organization',
    reportsTo: 'Reports to',
    areas: 'Areas',
    listView: 'Detailed view',
    chartView: 'Org chart',
  },
};
```

Copy all data verbatim from the existing `CommissionOverview.tsx` lines 7-270. Do not change any values.

**Important:** The `parentLabels` object maps parent IDs to direction names:

```typescript
export const parentLabels: Record<string, { es: string; en: string }> = {
  presidencia: { es: 'Presidencia', en: 'Presidency' },
  secretaria: { es: 'Secretaria General', en: 'General Secretariat' },
  tesoreria: { es: 'Tesoreria', en: 'Treasury' },
};
```

These are used as **section headers** in the list view (e.g., `'Secretaria General'`). Note this differs from `boardMembers[].role` which has `'Secretario General'` (masculine form, the person's title). The list view uses `parentLabels` for direction container headers and `boardMembers[].name` for the person's name.

- [ ] **Step 2: Verify the file compiles**

```bash
npm run type-check
```

- [ ] **Step 3: Commit**

```bash
git add src/components/commissions/commissions-data.ts
git commit -m "refactor: extract commissions data to shared module"
```

---

### Task 3: Build CommissionsListView (nested layout)

**Files:**

- Create: `tests/unit/components/commissions/CommissionsListView.test.tsx`
- Create: `src/components/commissions/CommissionsListView.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/commissions/CommissionsListView.test.tsx`:

```typescript
// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CommissionsListView from '@/components/commissions/CommissionsListView';

describe('CommissionsListView', () => {
  it('renders all 3 board direction containers', () => {
    render(<CommissionsListView lang="es" />);
    expect(screen.getByText('Presidencia')).toBeInTheDocument();
    expect(screen.getByText('Secretaria General')).toBeInTheDocument();
    expect(screen.getByText('Tesoreria')).toBeInTheDocument();
  });

  it('renders all 4 directive commissions nested under their parents', () => {
    render(<CommissionsListView lang="es" />);
    expect(screen.getByText('Vinculacion y Relaciones Institucionales')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
    expect(screen.getByText('Transparencia y Legalidad')).toBeInTheDocument();
    expect(screen.getByText('Gestion de Recursos')).toBeInTheDocument();
  });

  it('renders all 5 horizontal commissions', () => {
    render(<CommissionsListView lang="es" />);
    expect(screen.getByText('Comite de Etica')).toBeInTheDocument();
    expect(screen.getByText('Desarrollo Profesional')).toBeInTheDocument();
    expect(screen.getByText('Comunicacion y Difusion')).toBeInTheDocument();
    expect(screen.getByText('Cultura y Responsabilidad Social')).toBeInTheDocument();
    expect(screen.getByText('Academica e Innovacion')).toBeInTheDocument();
  });

  it('renders sub-area tags for directive commissions', () => {
    render(<CommissionsListView lang="es" />);
    expect(screen.getByText('Vinculacion con la UNAM')).toBeInTheDocument();
    expect(screen.getByText('Infraestructura y servicios')).toBeInTheDocument();
  });

  it('renders English content when lang=en', () => {
    render(<CommissionsListView lang="en" />);
    expect(screen.getByText('Institutional Relations & Outreach')).toBeInTheDocument();
    expect(screen.getByText('Board of Directors')).toBeInTheDocument();
  });

  it('groups Secretaria commissions (IT + Transparencia) together', () => {
    const { container } = render(<CommissionsListView lang="es" />);
    // Secretaria section should contain both IT and Transparencia
    const secretariaSection = screen.getByText('Secretaria General').closest('[data-direction]');
    expect(secretariaSection).toBeTruthy();
    expect(secretariaSection?.textContent).toContain('IT');
    expect(secretariaSection?.textContent).toContain('Transparencia y Legalidad');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/components/commissions/CommissionsListView.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement CommissionsListView**

Create `src/components/commissions/CommissionsListView.tsx`. This is the nested layout (Option B from the spec):

- Import all data from `commissions-data.ts`
- Accept `{ lang: 'es' | 'en' }` prop
- Render 3 board direction containers (Presidencia, Secretaria, Tesoreria)
- Each container: gradient icon, role name, person name, then nested commission cards with colored left-border
- Commission cards show: name, description, sub-area tags
- Below: horizontal commissions section as a 2-column grid
- Use CSS variables (`--card-bg`, `--color-border`, `--color-text-primary`, etc.) for dark mode support
- Add `data-direction="presidencia"` etc. attributes to direction containers for test accessibility

Style reference: Use the nested mockup from the brainstorming session (Option B). Board directions as `#111` containers with `border: 1px solid #2a2a2a`, commission cards inside with `border-left: 3px solid {color}`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/components/commissions/CommissionsListView.test.tsx
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/components/commissions/CommissionsListView.test.tsx src/components/commissions/CommissionsListView.tsx
git commit -m "feat(commissions): add nested list view component"
```

---

### Task 4: Build custom ReactFlow nodes

**Files:**

- Create: `src/components/commissions/nodes/BoardNode.tsx`
- Create: `src/components/commissions/nodes/CommissionNode.tsx`
- Create: `src/components/commissions/nodes/HorizontalNode.tsx`

**Note:** These node components are presentational wrappers for ReactFlow. They are tested indirectly through `CommissionsChartView.test.tsx` (which mocks ReactFlow and verifies node/edge counts) and visually in Task 7. No dedicated unit tests — they render only inside ReactFlow's viewport which requires DOM measurements not available in jsdom.

- [ ] **Step 1: Create BoardNode**

Create `src/components/commissions/nodes/BoardNode.tsx`:

Custom ReactFlow node component. Receives via `data` prop: `{ role, name, color }`. Renders:

- Gradient header (using `color` prop) with role label and name
- Connection handle (`Position.Bottom`) at the bottom
- Width: 160px, dark background `#111`, border color matching `color`
- Glow shadow: `box-shadow: 0 0 25px ${color}20`

Use `Handle` from `@xyflow/react` and `memo` from React.

- [ ] **Step 2: Create CommissionNode**

Create `src/components/commissions/nodes/CommissionNode.tsx`:

Receives via `data` prop: `{ name, description, color, responsibilities }`. Renders:

- Handle (`Position.Top`) at top for incoming edge
- Title colored by `color`, short description in gray
- Sub-area tags as small pills with `background: ${color}15`
- Width: 140px, border: `1.5px solid ${color}`

- [ ] **Step 3: Create HorizontalNode**

Create `src/components/commissions/nodes/HorizontalNode.tsx`:

Receives via `data` prop: `{ name, responsibilities, color }`. Renders:

- Full-width bar (500px) with colored left accent bar (6px)
- Title and responsibilities as `middot`-separated text
- Background: `#111`, border: `1px solid ${color}30`

- [ ] **Step 4: Verify all three compile**

```bash
npm run type-check
```

- [ ] **Step 5: Commit**

```bash
git add src/components/commissions/nodes/
git commit -m "feat(commissions): add custom ReactFlow node components"
```

---

### Task 5: Build CommissionsChartView (ReactFlow org chart)

**Files:**

- Create: `tests/unit/components/commissions/CommissionsChartView.test.tsx`
- Create: `src/components/commissions/CommissionsChartView.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/commissions/CommissionsChartView.test.tsx`:

```typescript
// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock @xyflow/react since it needs a browser DOM with measurements
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, nodes, edges }: any) => (
    <div data-testid="reactflow" data-node-count={nodes?.length} data-edge-count={edges?.length}>
      {children}
    </div>
  ),
  Background: () => <div data-testid="rf-background" />,
  Controls: () => <div data-testid="rf-controls" />,
  MiniMap: () => <div data-testid="rf-minimap" />,
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  useNodesState: (initial: any) => [initial, vi.fn(), vi.fn()],
  useEdgesState: (initial: any) => [initial, vi.fn(), vi.fn()],
}));

import CommissionsChartView from '@/components/commissions/CommissionsChartView';

describe('CommissionsChartView', () => {
  it('renders ReactFlow with correct node count (12)', () => {
    render(<CommissionsChartView lang="es" />);
    const rf = screen.getByTestId('reactflow');
    expect(rf.getAttribute('data-node-count')).toBe('12');
  });

  it('renders ReactFlow with correct edge count (4)', () => {
    render(<CommissionsChartView lang="es" />);
    const rf = screen.getByTestId('reactflow');
    expect(rf.getAttribute('data-edge-count')).toBe('4');
  });

  it('includes minimap and controls', () => {
    render(<CommissionsChartView lang="es" />);
    expect(screen.getByTestId('rf-minimap')).toBeInTheDocument();
    expect(screen.getByTestId('rf-controls')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/components/commissions/CommissionsChartView.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement CommissionsChartView**

Create `src/components/commissions/CommissionsChartView.tsx`:

- Import data from `commissions-data.ts` and custom nodes from `nodes/`
- Accept `{ lang: 'es' | 'en' }` prop
- Build `nodes` array (12 total): 3 board nodes (type `'board'`, y=0), 4 directive nodes (type `'commission'`, y=180), 5 horizontal nodes (type `'horizontal'`, y=420+)
- Build `edges` array (4 total — one per directive commission to its parent board node): Presidencia → Vinculacion (1 edge), Secretaria → IT (1 edge), Secretaria → Transparencia (1 edge), Tesoreria → Recursos (1 edge). Use `type: 'smoothstep'` with `animated: true` for the pulsing dots effect.
- Register custom node types: `{ board: BoardNode, commission: CommissionNode, horizontal: HorizontalNode }`
- Render `<ReactFlow>` with `<Background variant="dots" />`, `<Controls />`, `<MiniMap />`
- Set `fitView`, `proOptions={{ hideAttribution: true }}`
- Background: dark grid dots via ReactFlow Background component
- Import `@xyflow/react/dist/style.css` for base ReactFlow styles

Hardcoded positions per spec:

- Board: `{x:0,y:0}`, `{x:200,y:0}`, `{x:400,y:0}`
- Directive: `{x:0,y:180}`, `{x:150,y:180}`, `{x:300,y:180}`, `{x:450,y:180}`
- Horizontal: `{x:50,y:420}`, `{x:50,y:480}`, `{x:50,y:540}`, `{x:50,y:600}`, `{x:50,y:660}`

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/components/commissions/CommissionsChartView.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/components/commissions/CommissionsChartView.test.tsx src/components/commissions/CommissionsChartView.tsx
git commit -m "feat(commissions): add ReactFlow org chart view"
```

---

### Task 6: Rebuild CommissionOverview with toggle

**Files:**

- Create: `tests/unit/components/commissions/CommissionOverview.test.tsx`
- Modify: `src/components/commissions/CommissionOverview.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/commissions/CommissionOverview.test.tsx`:

```typescript
// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock the chart view (lazy loaded)
vi.mock('@/components/commissions/CommissionsChartView', () => ({
  default: ({ lang }: any) => <div data-testid="chart-view">Chart: {lang}</div>,
}));

import CommissionOverview from '@/components/commissions/CommissionOverview';

describe('CommissionOverview', () => {
  it('renders list view by default', () => {
    render(<CommissionOverview lang="es" />);
    // List view should be visible (has Presidencia as a board direction container)
    expect(screen.getByText('Presidencia')).toBeInTheDocument();
  });

  it('renders toggle with both options', () => {
    render(<CommissionOverview lang="es" />);
    expect(screen.getByText('Vista detallada')).toBeInTheDocument();
    expect(screen.getByText('Organigrama')).toBeInTheDocument();
  });

  it('switches to chart view when Organigrama is clicked', async () => {
    render(<CommissionOverview lang="es" />);
    fireEvent.click(screen.getByText('Organigrama'));
    await waitFor(() => {
      expect(screen.getByTestId('chart-view')).toBeInTheDocument();
    });
  });

  it('renders English toggle labels when lang=en', () => {
    render(<CommissionOverview lang="en" />);
    expect(screen.getByText('Detailed view')).toBeInTheDocument();
    expect(screen.getByText('Org chart')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- tests/unit/components/commissions/CommissionOverview.test.tsx
```

Expected: FAIL — existing component doesn't have toggle.

- [ ] **Step 3: Rewrite CommissionOverview.tsx**

Gut the existing file. The new component:

- Imports `commissionsI18n` from `commissions-data.ts`
- Imports `CommissionsListView` directly
- Imports `CommissionsChartView` via `React.lazy(() => import('./CommissionsChartView'))`
- `useState<'list' | 'chart'>('list')` for toggle state
- Renders: toggle pill, then a `position: relative` container with both views
- Active view: `opacity: 1; pointer-events: auto`
- Inactive view: `opacity: 0; pointer-events: none; position: absolute; top: 0; left: 0; width: 100%`
- CSS `transition: opacity 300ms ease` on both views
- Chart view wrapped in `<Suspense fallback={<div style={{textAlign:'center',padding:'3rem'}}>Loading...</div>}>` — **Important:** `<Suspense>` must wrap the lazy chart at all times (not conditionally on toggle state), because both views are always mounted. The Suspense fallback spinner will briefly appear behind the (visible, opacity:1) list view on initial page load, which is invisible to the user. The opacity-based hiding handles visual state independently of React's loading state.
- Toggle pill: two buttons in a container with `background: var(--color-surface-alt)`, `border-radius: var(--radius-full)`, active button gets `background: var(--secid-primary)` + white text

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- tests/unit/components/commissions/CommissionOverview.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Run all commission tests together**

```bash
npm run test:unit -- tests/unit/components/commissions/
```

Expected: All 13 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/components/commissions/CommissionOverview.test.tsx src/components/commissions/CommissionOverview.tsx
git commit -m "feat(commissions): rebuild overview with list/chart toggle"
```

---

### Task 7: Verify build and visual check

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 2: Run full test suite**

```bash
npm run test:unit
```

Expected: All tests pass, including the 13 new commission tests.

- [ ] **Step 3: Run dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:4321/es/commissions/` and verify:

- Default view shows nested layout (B) with Presidencia/Secretaria/Tesoreria containers
- Toggle to "Organigrama" shows ReactFlow chart with nodes and edges
- Toggle back returns to list view with crossfade
- Check dark mode (both views)
- Check mobile responsiveness (list view should stack; chart view should be zoomable)

- [ ] **Step 4: Commit any visual tweaks**

If node positions or spacing need adjustment, tweak and commit:

```bash
git add -u
git commit -m "fix(commissions): fine-tune layout and node positions"
```
