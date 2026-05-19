import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { MonthYearPicker } from '@/components/profile/shared/MonthYearPicker';

describe('MonthYearPicker - renders with null value', () => {
  afterEach(() => cleanup());

  it('TC-month-year-001: shows placeholder selects when value is null', () => {
    /** Verifies: AC-date-picker-render */
    const onChange = vi.fn();
    render(<MonthYearPicker value={null} onChange={onChange} />);

    const monthSelect = screen.getByLabelText('Mes');
    expect(monthSelect).toBeDefined();
    expect((monthSelect as HTMLSelectElement).value).toBe('');

    const yearInput = screen.getByLabelText('Anio');
    expect(yearInput).toBeDefined();
    expect((yearInput as HTMLInputElement).value).toBe('');
  });
});

describe('MonthYearPicker - renders with existing value', () => {
  afterEach(() => cleanup());

  it('TC-month-year-002: displays the provided month and year', () => {
    /** Verifies: AC-date-picker-value */
    const onChange = vi.fn();
    render(
      <MonthYearPicker value={{ month: 6, year: 2023 }} onChange={onChange} />
    );

    const monthSelect = screen.getByLabelText('Mes');
    expect((monthSelect as HTMLSelectElement).value).toBe('6');

    const yearInput = screen.getByLabelText('Anio');
    expect((yearInput as HTMLInputElement).value).toBe('2023');
  });
});

describe('MonthYearPicker - month change fires onChange', () => {
  afterEach(() => cleanup());

  it('TC-month-year-003: selecting a month calls onChange with month and default year', () => {
    /** Verifies: AC-date-picker-change */
    const onChange = vi.fn();
    render(<MonthYearPicker value={null} onChange={onChange} />);

    const monthSelect = screen.getByLabelText('Mes');
    fireEvent.change(monthSelect, { target: { value: '3' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0]![0];
    expect(arg.month).toBe(3);
    expect(typeof arg.year).toBe('number');
  });
});

describe('MonthYearPicker - year change fires onChange', () => {
  afterEach(() => cleanup());

  it('TC-month-year-004: typing a year calls onChange with year and default month', () => {
    /** Verifies: AC-date-picker-change */
    const onChange = vi.fn();
    render(<MonthYearPicker value={null} onChange={onChange} />);

    const yearInput = screen.getByLabelText('Anio');
    fireEvent.change(yearInput, { target: { value: '2025' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0]![0];
    expect(arg.year).toBe(2025);
    expect(arg.month).toBe(1);
  });
});

describe('MonthYearPicker - clearing month resets to null', () => {
  afterEach(() => cleanup());

  it('TC-month-year-005: selecting empty month option calls onChange with null', () => {
    /** Verifies: AC-date-picker-clear */
    const onChange = vi.fn();
    render(
      <MonthYearPicker value={{ month: 6, year: 2023 }} onChange={onChange} />
    );

    const monthSelect = screen.getByLabelText('Mes');
    fireEvent.change(monthSelect, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('MonthYearPicker - English localization', () => {
  afterEach(() => cleanup());

  it('TC-month-year-006: displays English month names when lang=en', () => {
    /** Verifies: AC-date-picker-i18n */
    const onChange = vi.fn();
    render(<MonthYearPicker value={null} onChange={onChange} lang="en" />);

    const monthSelect = screen.getByLabelText('Month');
    expect(monthSelect).toBeDefined();

    const options = Array.from((monthSelect as HTMLSelectElement).options).map(
      (o) => o.text
    );
    expect(options).toContain('January');
    expect(options).toContain('December');
  });
});

describe('MonthYearPicker - Spanish localization', () => {
  afterEach(() => cleanup());

  it('TC-month-year-007: displays Spanish month names when lang=es', () => {
    /** Verifies: AC-date-picker-i18n */
    const onChange = vi.fn();
    render(<MonthYearPicker value={null} onChange={onChange} lang="es" />);

    const monthSelect = screen.getByLabelText('Mes');
    const options = Array.from((monthSelect as HTMLSelectElement).options).map(
      (o) => o.text
    );
    expect(options).toContain('Enero');
    expect(options).toContain('Diciembre');
  });
});

describe('MonthYearPicker - disabled state', () => {
  afterEach(() => cleanup());

  it('TC-month-year-008: both inputs are disabled when disabled=true', () => {
    /** Verifies: AC-date-picker-disabled */
    const onChange = vi.fn();
    render(
      <MonthYearPicker value={null} onChange={onChange} disabled={true} />
    );

    const monthSelect = screen.getByLabelText('Mes');
    const yearInput = screen.getByLabelText('Anio');
    expect((monthSelect as HTMLSelectElement).disabled).toBe(true);
    expect((yearInput as HTMLInputElement).disabled).toBe(true);
  });
});

describe('MonthYearPicker - preserves existing month when year changes', () => {
  afterEach(() => cleanup());

  it('TC-month-year-009: changing year preserves the existing month value', () => {
    /** Verifies: AC-date-picker-change */
    const onChange = vi.fn();
    render(
      <MonthYearPicker value={{ month: 8, year: 2020 }} onChange={onChange} />
    );

    const yearInput = screen.getByLabelText('Anio');
    fireEvent.change(yearInput, { target: { value: '2024' } });

    expect(onChange).toHaveBeenCalledWith({ month: 8, year: 2024 });
  });
});
