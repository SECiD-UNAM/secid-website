import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingTable } from '@components/listing/ListingTable';

interface TestItem { id: string; name: string; score: number; }

const items: TestItem[] = [
  { id: '1', name: 'Alice', score: 95 },
  { id: '2', name: 'Bob', score: 80 },
];

const columns = [
  { key: 'name', label: 'Name', accessor: (i: TestItem) => i.name, sortable: true },
  { key: 'score', label: 'Score', accessor: (i: TestItem) => i.score, sortable: true, align: 'right' as const },
];

describe.sequential('ListingTable', () => {
  it('renders headers and rows', () => {
    render(<ListingTable items={items} columns={columns} keyExtractor={(i) => i.id} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('calls onSortChange when sortable header clicked', () => {
    const onSort = vi.fn();
    render(
      <ListingTable
        items={items}
        columns={columns}
        keyExtractor={(i) => i.id}
        sort={{ field: 'name', direction: 'asc' }}
        onSortChange={onSort}
      />
    );
    fireEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith({ field: 'name', direction: 'desc' });
  });

  it('sets aria-sort on active column', () => {
    render(
      <ListingTable
        items={items}
        columns={columns}
        keyExtractor={(i) => i.id}
        sort={{ field: 'name', direction: 'asc' }}
      />
    );
    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });
});
