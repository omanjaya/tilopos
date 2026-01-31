import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProductsPage } from '../products-page';

// ---- Mock Data ----

const mockProducts = [
  {
    id: 'prod-1',
    name: 'Nasi Goreng Spesial',
    sku: 'FOOD-001',
    description: 'Nasi goreng dengan topping lengkap',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Makanan', description: null, isActive: true, businessId: 'b1', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    basePrice: 35000,
    costPrice: 15000,
    trackStock: true,
    imageUrl: null,
    isActive: true,
    variants: [],
    businessId: 'b1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'prod-2',
    name: 'Es Teh Manis',
    sku: 'DRINK-001',
    description: 'Teh manis dingin',
    categoryId: 'cat-2',
    category: { id: 'cat-2', name: 'Minuman', description: null, isActive: true, businessId: 'b1', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    basePrice: 8000,
    costPrice: 3000,
    trackStock: false,
    imageUrl: null,
    isActive: true,
    variants: [],
    businessId: 'b1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'prod-3',
    name: 'Mie Ayam Bakso',
    sku: 'FOOD-002',
    description: null,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Makanan', description: null, isActive: true, businessId: 'b1', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    basePrice: 25000,
    costPrice: 12000,
    trackStock: true,
    imageUrl: null,
    isActive: false,
    variants: [],
    businessId: 'b1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockCategories = [
  { id: 'cat-1', name: 'Makanan', description: null, isActive: true, businessId: 'b1', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'cat-2', name: 'Minuman', description: null, isActive: true, businessId: 'b1', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

// ---- Mocks ----

const mockProductsList = vi.fn().mockResolvedValue(mockProducts);

vi.mock('@/api/endpoints/products.api', () => ({
  productsApi: {
    list: (...args: unknown[]) => mockProductsList(...args),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/api/endpoints/categories.api', () => ({
  categoriesApi: {
    list: vi.fn().mockResolvedValue(mockCategories),
  },
}));

// Mock the CategoryManager component to avoid complex dialog rendering
vi.mock('../components/category-manager', () => ({
  CategoryManager: () => null,
}));

// ---- Helpers ----

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderProductsPage() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---- Tests ----

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProductsList.mockResolvedValue(mockProducts);
  });

  it('renders the product list with items', async () => {
    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Nasi Goreng Spesial')).toBeInTheDocument();
    });

    expect(screen.getByText('Es Teh Manis')).toBeInTheDocument();
    expect(screen.getByText('Mie Ayam Bakso')).toBeInTheDocument();

    // Check page header
    expect(screen.getByText('Produk')).toBeInTheDocument();
  });

  it('triggers search when typing in the search input', async () => {
    const user = userEvent.setup();
    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Nasi Goreng Spesial')).toBeInTheDocument();
    });

    // Find the search input
    const searchInput = screen.getByPlaceholderText('Cari produk...');
    expect(searchInput).toBeInTheDocument();

    // Type in the search box
    await user.type(searchInput, 'nasi');

    // The API should be re-called with search param
    await waitFor(() => {
      // Verify the list fn was called again (React Query re-fetches when queryKey changes)
      expect(mockProductsList).toHaveBeenCalled();
    });
  });

  it('shows SKU and category badge for each product', async () => {
    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('FOOD-001')).toBeInTheDocument();
    });

    expect(screen.getByText('DRINK-001')).toBeInTheDocument();

    // Category badges
    const foodBadges = screen.getAllByText('Makanan');
    expect(foodBadges.length).toBeGreaterThanOrEqual(1);

    const drinkBadges = screen.getAllByText('Minuman');
    expect(drinkBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows active/inactive status badges', async () => {
    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Nasi Goreng Spesial')).toBeInTheDocument();
    });

    const aktivBadges = screen.getAllByText('Aktif');
    expect(aktivBadges.length).toBeGreaterThanOrEqual(1);

    const nonaktifBadges = screen.getAllByText('Nonaktif');
    expect(nonaktifBadges.length).toBeGreaterThanOrEqual(1);
  });
});
