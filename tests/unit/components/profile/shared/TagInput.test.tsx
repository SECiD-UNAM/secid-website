import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('@heroicons/react/24/outline', () => {
  const stub = () => null;
  return { XMarkIcon: stub, PlusIcon: stub, PencilIcon: stub, TrashIcon: stub };
});

import { TagInput } from '@/components/profile/shared/TagInput';

describe('TagInput - renders empty state', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-001: shows placeholder when no tags exist', () => {
    /** Verifies: AC-tag-input-render */
    const onChange = vi.fn();
    render(
      <TagInput tags={[]} onChange={onChange} placeholder="Add skills..." />
    );

    const input = screen.getByPlaceholderText('Add skills...');
    expect(input).toBeDefined();
  });
});

describe('TagInput - renders existing tags', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-002: displays provided tags as pill elements', () => {
    /** Verifies: AC-tag-input-render */
    const onChange = vi.fn();
    render(<TagInput tags={['Python', 'SQL']} onChange={onChange} />);

    expect(screen.getByText('Python')).toBeDefined();
    expect(screen.getByText('SQL')).toBeDefined();
  });
});

describe('TagInput - add tag via Enter', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-003: pressing Enter adds the typed text as a new tag', () => {
    /** Verifies: AC-tag-input-add */
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'React' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['React']);
  });
});

describe('TagInput - add tag via comma', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-004: pressing comma adds the typed text as a new tag', () => {
    /** Verifies: AC-tag-input-add */
    const onChange = vi.fn();
    render(<TagInput tags={['Python']} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'SQL' } });
    fireEvent.keyDown(input, { key: ',' });

    expect(onChange).toHaveBeenCalledWith(['Python', 'SQL']);
  });
});

describe('TagInput - remove tag', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-005: clicking X button on a tag removes it', () => {
    /** Verifies: AC-tag-input-remove */
    const onChange = vi.fn();
    render(<TagInput tags={['Python', 'SQL']} onChange={onChange} />);

    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    fireEvent.click(removeButtons[0]!);

    expect(onChange).toHaveBeenCalledWith(['SQL']);
  });
});

describe('TagInput - backspace removes last tag', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-006: pressing Backspace on empty input removes last tag', () => {
    /** Verifies: AC-tag-input-remove */
    const onChange = vi.fn();
    render(<TagInput tags={['Python', 'SQL']} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['Python']);
  });
});

describe('TagInput - prevents duplicate tags', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-007: adding a tag that already exists does not call onChange', () => {
    /** Verifies: AC-tag-input-duplicate */
    const onChange = vi.fn();
    render(<TagInput tags={['Python']} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Python' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('TagInput - max limit', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-008: shows count when max is set', () => {
    /** Verifies: AC-tag-input-max */
    const onChange = vi.fn();
    render(<TagInput tags={['Python', 'SQL']} onChange={onChange} max={5} />);

    expect(screen.getByText('2/5')).toBeDefined();
  });
});

describe('TagInput - max limit prevents adding', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-009: cannot add tags when at max capacity', () => {
    /** Verifies: AC-tag-input-max */
    const onChange = vi.fn();
    render(<TagInput tags={['A', 'B', 'C']} onChange={onChange} max={3} />);

    // Input should not be rendered when at max
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs.length).toBe(0);
  });
});

describe('TagInput - empty string not added', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-010: pressing Enter with empty input does not add a tag', () => {
    /** Verifies: AC-tag-input-add (boundary) */
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('TagInput - suggestions dropdown', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-011: shows filtered suggestions when typing matches', () => {
    /** Verifies: AC-tag-input-suggestions */
    const onChange = vi.fn();
    render(
      <TagInput
        tags={[]}
        onChange={onChange}
        suggestions={['Python', 'PyTorch', 'Pandas']}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Py' } });
    fireEvent.focus(input);

    expect(screen.getByText('Python')).toBeDefined();
    expect(screen.getByText('PyTorch')).toBeDefined();
  });
});

describe('TagInput - suggestions excludes existing tags', () => {
  afterEach(() => cleanup());

  it('TC-tag-input-012: suggestions do not include tags already selected', () => {
    /** Verifies: AC-tag-input-suggestions */
    const onChange = vi.fn();
    render(
      <TagInput
        tags={['Python']}
        onChange={onChange}
        suggestions={['Python', 'PyTorch']}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Py' } });
    fireEvent.focus(input);

    const listItems = screen.getAllByRole('option');
    const texts = listItems.map((li) => li.textContent);
    expect(texts).not.toContain('Python');
    expect(texts).toContain('PyTorch');
  });
});
