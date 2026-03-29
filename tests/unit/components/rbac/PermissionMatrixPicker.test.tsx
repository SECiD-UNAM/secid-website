// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, within, fireEvent } from '@testing-library/react';
import PermissionMatrixPicker from '@/components/rbac/PermissionMatrixPicker';
import { RESOURCES, OPERATIONS } from '@/lib/rbac/types';
import type { PermissionGrant } from '@/lib/rbac/types';

function setup() {
  vi.clearAllMocks();
}

function teardown() {
  cleanup();
  vi.restoreAllMocks();
}

describe('PermissionMatrixPicker: renders all resources as rows', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-matrix-001: renders one row per resource', () => {
    /** Verifies: AC-matrix-rows */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} />
    );
    const view = within(container);

    const table = view.getByRole('table');
    for (const resource of RESOURCES) {
      expect(
        within(table).getByTestId(`resource-row-${resource}`)
      ).toBeDefined();
    }
  });

  it('TC-rbac-matrix-002: displays readable resource labels, not raw IDs', () => {
    /** Verifies: AC-matrix-labels */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} lang="en" />
    );
    const view = within(container);

    expect(view.getByText('Journal Club')).toBeDefined();
    expect(view.getByText('Salary Insights')).toBeDefined();
  });

  it('TC-rbac-matrix-003: displays Spanish labels when lang is es', () => {
    /** Verifies: AC-matrix-i18n */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} lang="es" />
    );
    const view = within(container);

    expect(view.getByText('Club de Revista')).toBeDefined();
    expect(view.getByText('Perspectivas Salariales')).toBeDefined();
  });
});

describe('PermissionMatrixPicker: renders all operations as columns', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-matrix-004: renders one column header per operation', () => {
    /** Verifies: AC-matrix-columns */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} lang="en" />
    );
    const view = within(container);

    const expectedHeaders = [
      'View',
      'Create',
      'Edit',
      'Delete',
      'Publish',
      'Moderate',
      'Export',
      'Assign',
    ];

    for (const header of expectedHeaders) {
      expect(view.getByText(header)).toBeDefined();
    }
  });
});

describe('PermissionMatrixPicker: calls onChange when cell value changes', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-matrix-005: calls onChange with new grant when selecting "all"', () => {
    /** Verifies: AC-matrix-onchange */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} lang="en" />
    );
    const view = within(container);

    const select = view.getByTestId('cell-events-view');
    fireEvent.change(select, { target: { value: 'all' } });

    expect(onChange).toHaveBeenCalledWith([
      { resource: 'events', operation: 'view', scope: 'all', effect: 'allow' },
    ]);
  });

  it('TC-rbac-matrix-006: calls onChange removing grant when selecting "none"', () => {
    /** Verifies: AC-matrix-onchange-remove */
    const onChange = vi.fn();
    const initialGrants: PermissionGrant[] = [
      { resource: 'events', operation: 'view', scope: 'all', effect: 'allow' },
    ];
    const { container } = render(
      <PermissionMatrixPicker
        value={initialGrants}
        onChange={onChange}
        lang="en"
      />
    );
    const view = within(container);

    const select = view.getByTestId('cell-events-view');
    fireEvent.change(select, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe('PermissionMatrixPicker: correctly maps dropdown value to PermissionGrant', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-matrix-007: maps "own" to allow + own scope', () => {
    /** Verifies: AC-matrix-mapping-own */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} lang="en" />
    );
    const view = within(container);

    const select = view.getByTestId('cell-jobs-create');
    fireEvent.change(select, { target: { value: 'own' } });

    expect(onChange).toHaveBeenCalledWith([
      { resource: 'jobs', operation: 'create', scope: 'own', effect: 'allow' },
    ]);
  });

  it('TC-rbac-matrix-008: maps "deny:own" to deny + own scope', () => {
    /** Verifies: AC-matrix-mapping-deny-own */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} lang="en" />
    );
    const view = within(container);

    const select = view.getByTestId('cell-users-edit');
    fireEvent.change(select, { target: { value: 'deny:own' } });

    expect(onChange).toHaveBeenCalledWith([
      { resource: 'users', operation: 'edit', scope: 'own', effect: 'deny' },
    ]);
  });

  it('TC-rbac-matrix-009: maps "deny:all" to deny + all scope', () => {
    /** Verifies: AC-matrix-mapping-deny-all */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} lang="en" />
    );
    const view = within(container);

    const select = view.getByTestId('cell-forums-moderate');
    fireEvent.change(select, { target: { value: 'deny:all' } });

    expect(onChange).toHaveBeenCalledWith([
      {
        resource: 'forums',
        operation: 'moderate',
        scope: 'all',
        effect: 'deny',
      },
    ]);
  });
});

describe('PermissionMatrixPicker: displays current permissions from value prop', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-matrix-010: reflects existing grants in dropdown values', () => {
    /** Verifies: AC-matrix-display-value */
    const onChange = vi.fn();
    const grants: PermissionGrant[] = [
      { resource: 'events', operation: 'view', scope: 'all', effect: 'allow' },
      { resource: 'jobs', operation: 'create', scope: 'own', effect: 'allow' },
      {
        resource: 'users',
        operation: 'delete',
        scope: 'all',
        effect: 'deny',
      },
    ];
    const { container } = render(
      <PermissionMatrixPicker value={grants} onChange={onChange} lang="en" />
    );
    const view = within(container);

    const eventsView = view.getByTestId(
      'cell-events-view'
    ) as HTMLSelectElement;
    expect(eventsView.value).toBe('all');

    const jobsCreate = view.getByTestId(
      'cell-jobs-create'
    ) as HTMLSelectElement;
    expect(jobsCreate.value).toBe('own');

    const usersDelete = view.getByTestId(
      'cell-users-delete'
    ) as HTMLSelectElement;
    expect(usersDelete.value).toBe('deny:all');
  });

  it('TC-rbac-matrix-011: unset cells show empty value', () => {
    /** Verifies: AC-matrix-display-empty */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} lang="en" />
    );
    const view = within(container);

    const select = view.getByTestId(
      'cell-events-view'
    ) as HTMLSelectElement;
    expect(select.value).toBe('');
  });
});

describe('PermissionMatrixPicker: disables all dropdowns when disabled prop is true', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-matrix-012: all selects are disabled', () => {
    /** Verifies: AC-matrix-disabled */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker
        value={[]}
        onChange={onChange}
        disabled
        lang="en"
      />
    );
    const view = within(container);

    const selects = view.getAllByRole('combobox');
    for (const select of selects) {
      expect((select as HTMLSelectElement).disabled).toBe(true);
    }
  });

  it('TC-rbac-matrix-013: all 152 cells are disabled (19 resources x 8 operations)', () => {
    /** Verifies: AC-matrix-disabled-count */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker
        value={[]}
        onChange={onChange}
        disabled
        lang="en"
      />
    );
    const view = within(container);

    const selects = view.getAllByRole('combobox');
    // 19 resources x 8 operations = 152 cells
    expect(selects).toHaveLength(152);
    const disabledCount = selects.filter(
      (s) => (s as HTMLSelectElement).disabled
    ).length;
    expect(disabledCount).toBe(152);
  });
});

describe('PermissionMatrixPicker: visual indicators', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-matrix-014: deny cells have red-tinted background', () => {
    /** Verifies: AC-matrix-deny-highlight */
    const onChange = vi.fn();
    const grants: PermissionGrant[] = [
      {
        resource: 'events',
        operation: 'view',
        scope: 'all',
        effect: 'deny',
      },
    ];
    const { container } = render(
      <PermissionMatrixPicker value={grants} onChange={onChange} lang="en" />
    );
    const view = within(container);

    const select = view.getByTestId('cell-events-view');
    expect(select.className).toMatch(/red/);
  });

  it('TC-rbac-matrix-015: allow cells have green-tinted background', () => {
    /** Verifies: AC-matrix-allow-highlight */
    const onChange = vi.fn();
    const grants: PermissionGrant[] = [
      {
        resource: 'events',
        operation: 'view',
        scope: 'all',
        effect: 'allow',
      },
    ];
    const { container } = render(
      <PermissionMatrixPicker value={grants} onChange={onChange} lang="en" />
    );
    const view = within(container);

    const select = view.getByTestId('cell-events-view');
    expect(select.className).toMatch(/green/);
  });

  it('TC-rbac-matrix-016: unset cells have no color tint', () => {
    /** Verifies: AC-matrix-unset-no-highlight */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} lang="en" />
    );
    const view = within(container);

    const select = view.getByTestId('cell-events-view');
    expect(select.className).not.toMatch(/red|green/);
  });
});

describe('PermissionMatrixPicker: resource grouping', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-matrix-017: renders category group headers', () => {
    /** Verifies: AC-matrix-grouping */
    const onChange = vi.fn();
    const { container } = render(
      <PermissionMatrixPicker value={[]} onChange={onChange} lang="en" />
    );
    const view = within(container);

    expect(view.getByText('Content')).toBeDefined();
    expect(view.getByText('People')).toBeDefined();
    expect(view.getByText('Platform')).toBeDefined();
    expect(view.getByText('RBAC')).toBeDefined();
  });
});

describe('PermissionMatrixPicker: updates existing grant without duplication', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('TC-rbac-matrix-018: changing a cell updates the existing grant instead of adding a duplicate', () => {
    /** Verifies: AC-matrix-update-existing */
    const onChange = vi.fn();
    const initialGrants: PermissionGrant[] = [
      { resource: 'events', operation: 'view', scope: 'own', effect: 'allow' },
      { resource: 'jobs', operation: 'create', scope: 'all', effect: 'allow' },
    ];
    const { container } = render(
      <PermissionMatrixPicker
        value={initialGrants}
        onChange={onChange}
        lang="en"
      />
    );
    const view = within(container);

    const select = view.getByTestId('cell-events-view');
    fireEvent.change(select, { target: { value: 'all' } });

    const result = onChange.mock.calls[0][0] as PermissionGrant[];
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      resource: 'events',
      operation: 'view',
      scope: 'all',
      effect: 'allow',
    });
    expect(result).toContainEqual({
      resource: 'jobs',
      operation: 'create',
      scope: 'all',
      effect: 'allow',
    });
  });
});
