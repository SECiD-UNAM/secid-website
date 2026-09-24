import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('@heroicons/react/24/outline', () => {
  const stub = () => null;
  return { PencilIcon: stub, TrashIcon: stub, XMarkIcon: stub, PlusIcon: stub };
});

import { EntryCard } from '@/components/profile/shared/EntryCard';

describe('EntryCard - view mode renders title', () => {
  afterEach(() => cleanup());

  it('TC-entry-card-001: displays title in view mode', () => {
    /** Verifies: AC-entry-card-view */
    render(
      <EntryCard
        title="Software Engineer"
        isEditing={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      >
        <input />
      </EntryCard>
    );

    expect(screen.getByText('Software Engineer')).toBeDefined();
  });
});

describe('EntryCard - view mode renders subtitle and date', () => {
  afterEach(() => cleanup());

  it('TC-entry-card-002: displays subtitle and dateRange in view mode', () => {
    /** Verifies: AC-entry-card-view */
    render(
      <EntryCard
        title="Data Scientist"
        subtitle="Google"
        dateRange="Jan 2020 - Present"
        isEditing={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      >
        <input />
      </EntryCard>
    );

    expect(screen.getByText('Google')).toBeDefined();
    expect(screen.getByText('Jan 2020 - Present')).toBeDefined();
  });
});

describe('EntryCard - view mode has edit button', () => {
  afterEach(() => cleanup());

  it('TC-entry-card-003: clicking edit button calls onEdit', () => {
    /** Verifies: AC-entry-card-edit */
    const onEdit = vi.fn();
    render(
      <EntryCard
        title="Engineer"
        isEditing={false}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      >
        <input />
      </EntryCard>
    );

    const editBtn = screen.getByLabelText('Editar');
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe('EntryCard - delete with confirmation', () => {
  afterEach(() => cleanup());

  it('TC-entry-card-004: clicking delete shows confirmation and calls onDelete when accepted', () => {
    /** Verifies: AC-entry-card-delete */
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <EntryCard
        title="Engineer"
        isEditing={false}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      >
        <input />
      </EntryCard>
    );

    const deleteBtn = screen.getByLabelText('Eliminar');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
  });
});

describe('EntryCard - delete cancelled', () => {
  afterEach(() => cleanup());

  it('TC-entry-card-005: clicking delete does not call onDelete when cancelled', () => {
    /** Verifies: AC-entry-card-delete */
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <EntryCard
        title="Engineer"
        isEditing={false}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      >
        <input />
      </EntryCard>
    );

    const deleteBtn = screen.getByLabelText('Eliminar');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});

describe('EntryCard - edit mode renders children', () => {
  afterEach(() => cleanup());

  it('TC-entry-card-006: displays children (form fields) in edit mode', () => {
    /** Verifies: AC-entry-card-edit-mode */
    render(
      <EntryCard
        title="Engineer"
        isEditing={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      >
        <input data-testid="child-field" />
      </EntryCard>
    );

    expect(screen.getByTestId('child-field')).toBeDefined();
  });
});

describe('EntryCard - edit mode has Save/Cancel', () => {
  afterEach(() => cleanup());

  it('TC-entry-card-007: edit mode shows Save and Cancel buttons', () => {
    /** Verifies: AC-entry-card-edit-mode */
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <EntryCard
        title="Engineer"
        isEditing={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSave={onSave}
        onCancel={onCancel}
      >
        <input />
      </EntryCard>
    );

    const saveBtn = screen.getByText('Guardar');
    const cancelBtn = screen.getByText('Cancelar');

    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);

    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('EntryCard - English labels', () => {
  afterEach(() => cleanup());

  it('TC-entry-card-008: uses English labels when lang=en', () => {
    /** Verifies: AC-entry-card-i18n */
    render(
      <EntryCard
        title="Engineer"
        isEditing={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        lang="en"
      >
        <input />
      </EntryCard>
    );

    expect(screen.getByText('Save')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });
});

describe('EntryCard - English delete confirmation', () => {
  afterEach(() => cleanup());

  it('TC-entry-card-009: shows English confirmation when lang=en', () => {
    /** Verifies: AC-entry-card-i18n */
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <EntryCard
        title="Engineer"
        isEditing={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        lang="en"
      >
        <input />
      </EntryCard>
    );

    const deleteBtn = screen.getByLabelText('Delete');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to delete this item?'
    );

    confirmSpy.mockRestore();
  });
});
