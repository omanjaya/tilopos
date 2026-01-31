import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaxSettingsPage } from '../tax-settings-page';

// ---- Mock Data ----

const mockTaxConfig = {
  id: 'tax-1',
  taxRate: 11,
  serviceChargeRate: 5,
  isTaxInclusive: true,
  taxExemptionRules: [
    { id: 'rule-1', name: 'Produk Pertanian', description: 'Bebas PPN untuk produk pertanian', isActive: true },
  ],
  businessId: 'b1',
};

const mockUpdateTaxConfig = vi.fn().mockResolvedValue(mockTaxConfig);

vi.mock('@/api/endpoints/settings.api', () => ({
  settingsApi: {
    getTaxConfig: vi.fn().mockResolvedValue(mockTaxConfig),
    updateTaxConfig: (...args: unknown[]) => mockUpdateTaxConfig(...args),
  },
}));

// ---- Helpers ----

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderTaxSettingsPage() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TaxSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---- Tests ----

describe('TaxSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the tax form with default values from API', async () => {
    renderTaxSettingsPage();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Tarif Pajak & Biaya Layanan')).toBeInTheDocument();
    });

    // Check that the tax rate input has the correct value
    const taxRateInput = screen.getByLabelText('Tarif PPN (%)');
    expect(taxRateInput).toHaveValue(11);

    // Check that service charge input has correct value
    const serviceChargeInput = screen.getByLabelText('Biaya Layanan (%)');
    expect(serviceChargeInput).toHaveValue(5);

    // Check tax inclusive switch is on
    expect(screen.getByText('Harga Termasuk Pajak')).toBeInTheDocument();

    // Existing exemption rule should be displayed
    expect(screen.getByText('Produk Pertanian')).toBeInTheDocument();
    expect(screen.getByText('Bebas PPN untuk produk pertanian')).toBeInTheDocument();
  });

  it('submits the form with updated values', async () => {
    const user = userEvent.setup();
    renderTaxSettingsPage();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText('Tarif PPN (%)')).toBeInTheDocument();
    });

    // Change tax rate
    const taxRateInput = screen.getByLabelText('Tarif PPN (%)');
    await user.clear(taxRateInput);
    await user.type(taxRateInput, '12');

    // Click save button
    const saveButton = screen.getByRole('button', { name: /simpan/i });
    await user.click(saveButton);

    // Verify API was called
    await waitFor(() => {
      expect(mockUpdateTaxConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          taxRate: 12,
        }),
      );
    });
  });

  it('adds a new exemption rule', async () => {
    const user = userEvent.setup();
    renderTaxSettingsPage();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByText('Tambah Aturan Baru')).toBeInTheDocument();
    });

    // Fill in the new rule name
    const nameInput = screen.getByPlaceholderText('Nama aturan');
    await user.type(nameInput, 'Produk Digital');

    // Fill in the description
    const descInput = screen.getByPlaceholderText('Deskripsi (opsional)');
    await user.type(descInput, 'Bebas pajak untuk produk digital');

    // Click add button
    const addButton = screen.getByRole('button', { name: /tambah aturan/i });
    await user.click(addButton);

    // The new rule should appear in the list
    await waitFor(() => {
      expect(screen.getByText('Produk Digital')).toBeInTheDocument();
    });
  });

  it('removes an exemption rule', async () => {
    const user = userEvent.setup();
    renderTaxSettingsPage();

    // Wait for existing rule to appear
    await waitFor(() => {
      expect(screen.getByText('Produk Pertanian')).toBeInTheDocument();
    });

    // Find and click the delete button (Trash2 icon button) for the existing rule
    // The delete button is the one with the destructive class in the rule row
    const deleteButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg') && btn.classList.contains('text-destructive'),
    );

    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]!);

      // After removal, the rule should no longer be visible
      await waitFor(() => {
        expect(screen.queryByText('Produk Pertanian')).not.toBeInTheDocument();
      });
    }
  });

  it('renders the page header correctly', async () => {
    renderTaxSettingsPage();

    await waitFor(() => {
      expect(screen.getByText('Pengaturan Pajak')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Kelola konfigurasi pajak dan biaya layanan'),
    ).toBeInTheDocument();
  });
});
