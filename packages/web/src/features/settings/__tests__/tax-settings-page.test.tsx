import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaxSettingsPage } from '../tax-settings-page';

const { mockTaxConfig, mockGetTaxConfig, mockUpdateTaxConfig } = vi.hoisted(() => {
  const taxConfig = {
    taxEnabled: true,
    taxRate: 11,
    taxName: 'PPN',
    isTaxInclusive: true,
    serviceChargeEnabled: true,
    serviceChargeRate: 5,
  };
  return {
    mockTaxConfig: taxConfig,
    mockGetTaxConfig: vi.fn(),
    mockUpdateTaxConfig: vi.fn().mockResolvedValue(taxConfig),
  };
});

vi.mock('@/api/endpoints/settings.api', () => ({
  settingsApi: {
    getTaxConfig: () => mockGetTaxConfig(),
    updateTaxConfig: (...args: unknown[]) => mockUpdateTaxConfig(...args),
  },
}));

function renderTaxSettingsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TaxSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaxSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTaxConfig.mockResolvedValue(mockTaxConfig);
  });

  it('renders the tax form with values from the API', async () => {
    renderTaxSettingsPage();
    await waitFor(() => {
      expect(screen.getByText('Tarif Pajak & Biaya Layanan')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Tarif PPN (%)')).toHaveValue(11);
    expect(screen.getByLabelText('Biaya Layanan (%)')).toHaveValue(5);
    expect(screen.getByText('Harga Termasuk Pajak')).toBeInTheDocument();
  });

  it('submits only fields accepted by UpdateTaxConfigDto', async () => {
    const user = userEvent.setup();
    renderTaxSettingsPage();
    await waitFor(() => {
      expect(screen.getByLabelText('Tarif PPN (%)')).toHaveValue(11);
    });

    const taxRateInput = screen.getByLabelText('Tarif PPN (%)');
    await user.clear(taxRateInput);
    await user.type(taxRateInput, '12');
    fireEvent.submit(taxRateInput.closest('form')!);

    await waitFor(() => {
      expect(mockUpdateTaxConfig).toHaveBeenCalledWith({
        taxEnabled: true,
        taxRate: 12,
        serviceChargeEnabled: true,
        serviceChargeRate: 5,
        isTaxInclusive: true,
      });
    });
    const payload = mockUpdateTaxConfig.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('taxExemptionRules');
  });

  it('shows an error state instead of default values when loading fails', async () => {
    mockGetTaxConfig.mockRejectedValue(new Error('boom'));
    renderTaxSettingsPage();
    await waitFor(() => {
      expect(screen.getByText('Gagal memuat pengaturan pajak')).toBeInTheDocument();
    });
    expect(screen.queryByLabelText('Tarif PPN (%)')).not.toBeInTheDocument();
  });
});
