import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type Column } from '../data-table';

interface TestRow {
  id: string;
  name: string;
  price: number;
}

const columns: Column<TestRow>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'price', header: 'Price', cell: (row) => `Rp ${row.price.toLocaleString()}` },
];

const sampleData: TestRow[] = [
  { id: '1', name: 'Nasi Goreng', price: 25000 },
  { id: '2', name: 'Mie Ayam', price: 20000 },
  { id: '3', name: 'Es Teh', price: 5000 },
];

describe('DataTable', () => {
  describe('rendering with data', () => {
    it('renders column headers', () => {
      render(<DataTable columns={columns} data={sampleData} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
    });

    it('renders all data rows', () => {
      render(<DataTable columns={columns} data={sampleData} />);

      expect(screen.getByText('Nasi Goreng')).toBeInTheDocument();
      expect(screen.getByText('Mie Ayam')).toBeInTheDocument();
      expect(screen.getByText('Es Teh')).toBeInTheDocument();
    });

    it('renders cell values through the cell renderer', () => {
      render(<DataTable columns={columns} data={sampleData} />);

      expect(screen.getByText('Rp 25,000')).toBeInTheDocument();
      expect(screen.getByText('Rp 20,000')).toBeInTheDocument();
      expect(screen.getByText('Rp 5,000')).toBeInTheDocument();
    });

    it('renders the correct number of rows', () => {
      const { container } = render(<DataTable columns={columns} data={sampleData} />);

      // Header row + 3 data rows
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
    });
  });

  describe('empty state', () => {
    it('shows empty state when data is empty', () => {
      render(<DataTable columns={columns} data={[]} />);

      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
      expect(screen.getByText('Data belum tersedia.')).toBeInTheDocument();
    });

    it('shows custom empty title and description', () => {
      render(
        <DataTable
          columns={columns}
          data={[]}
          emptyTitle="Produk kosong"
          emptyDescription="Belum ada produk yang ditambahkan."
        />,
      );

      expect(screen.getByText('Produk kosong')).toBeInTheDocument();
      expect(screen.getByText('Belum ada produk yang ditambahkan.')).toBeInTheDocument();
    });

    it('still renders column headers when data is empty', () => {
      render(<DataTable columns={columns} data={[]} />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders skeleton rows when loading', () => {
      const { container } = render(
        <DataTable columns={columns} data={[]} isLoading />,
      );

      // Default renders 5 skeleton rows
      const skeletonRows = container.querySelectorAll('tbody tr');
      expect(skeletonRows).toHaveLength(5);
    });

    it('does not render data rows when loading', () => {
      render(
        <DataTable columns={columns} data={sampleData} isLoading />,
      );

      expect(screen.queryByText('Nasi Goreng')).not.toBeInTheDocument();
    });

    it('renders skeletons in each cell', () => {
      const { container } = render(
        <DataTable columns={columns} data={[]} isLoading />,
      );

      // 5 rows * 2 columns = 10 skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(10);
    });
  });

  describe('search filtering', () => {
    it('renders search input when onSearch is provided', () => {
      render(
        <DataTable columns={columns} data={sampleData} onSearch={() => {}} />,
      );

      expect(screen.getByPlaceholderText('Cari...')).toBeInTheDocument();
    });

    it('does not render search input when onSearch is not provided', () => {
      render(<DataTable columns={columns} data={sampleData} />);

      expect(screen.queryByPlaceholderText('Cari...')).not.toBeInTheDocument();
    });

    it('calls onSearch when typing in the search input', async () => {
      const onSearch = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable columns={columns} data={sampleData} onSearch={onSearch} />,
      );

      const input = screen.getByPlaceholderText('Cari...');
      await user.type(input, 'Nasi');

      // onSearch should be called for each character typed
      expect(onSearch).toHaveBeenCalledTimes(4);
      expect(onSearch).toHaveBeenLastCalledWith('Nasi');
    });

    it('renders custom search placeholder', () => {
      render(
        <DataTable
          columns={columns}
          data={sampleData}
          onSearch={() => {}}
          searchPlaceholder="Cari produk..."
        />,
      );

      expect(screen.getByPlaceholderText('Cari produk...')).toBeInTheDocument();
    });
  });

  describe('column rendering', () => {
    it('renders custom cell content from column definition', () => {
      const customColumns: Column<TestRow>[] = [
        {
          key: 'name',
          header: 'Product',
          cell: (row) => <span data-testid={`product-${row.id}`}>{row.name}</span>,
        },
      ];

      render(<DataTable columns={customColumns} data={sampleData} />);

      expect(screen.getByTestId('product-1')).toHaveTextContent('Nasi Goreng');
      expect(screen.getByTestId('product-2')).toHaveTextContent('Mie Ayam');
      expect(screen.getByTestId('product-3')).toHaveTextContent('Es Teh');
    });

    it('renders filters slot when provided', () => {
      render(
        <DataTable
          columns={columns}
          data={sampleData}
          filters={<button>Filter Status</button>}
        />,
      );

      expect(screen.getByText('Filter Status')).toBeInTheDocument();
    });
  });
});
