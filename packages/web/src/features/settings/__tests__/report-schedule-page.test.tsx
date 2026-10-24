import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportSchedulePage } from '../report-schedule-page';
import { settingsApi } from '@/api/endpoints/settings.api';

vi.mock('@/api/endpoints/settings.api', () => ({
  settingsApi: { getBusiness: vi.fn().mockResolvedValue({}), listReportSchedules: vi.fn() },
}));
const schedule = {
  id: 's',
  reportType: 'sales',
  frequency: 'daily',
  recipients: ['a@example.com'],
  isActive: true,
  nextSendAt: '2026-10-25T00:00:00Z',
  lastSentAt: null,
  deliveryConfigured: true,
  lastStatus: 'pending',
};
function show() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ReportSchedulePage />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.mocked(settingsApi.listReportSchedules).mockResolvedValue([schedule as never]);
});
describe('report delivery status', () => {
  it('shows missing SMTP honestly instead of promising delivery', async () => {
    vi.mocked(settingsApi.listReportSchedules).mockResolvedValue([
      {
        ...schedule,
        deliveryConfigured: false,
        lastStatus: 'failed',
        lastError: 'NOT_CONFIGURED',
      } as never,
    ]);
    show();
    expect(await screen.findByText(/Email belum dikonfigurasi/)).toBeInTheDocument();
  });
  it('shows an uncertain result and explicitly avoids automatic retries', async () => {
    vi.mocked(settingsApi.listReportSchedules).mockResolvedValue([
      { ...schedule, lastStatus: 'unknown', lastError: 'DELIVERY_UNCONFIRMED' } as never,
    ]);
    show();
    expect(await screen.findByText(/Perlu diperiksa/)).toBeInTheDocument();
    expect(screen.getByText(/tidak diulang otomatis/)).toBeInTheDocument();
  });
  it('shows scheduled time in WIB and the provider-accepted status', async () => {
    vi.mocked(settingsApi.listReportSchedules).mockResolvedValue([
      { ...schedule, lastStatus: 'sent', lastSentAt: '2026-10-24T00:00:00Z' } as never,
    ]);
    show();
    expect(await screen.findByText(/Diterima server email/)).toBeInTheDocument();
    expect(screen.getByText(/Berikutnya:/)).toHaveTextContent('WIB');
  });
  it('renders query failure rather than an empty schedule', async () => {
    vi.mocked(settingsApi.listReportSchedules).mockRejectedValue(new Error('network'));
    show();
    expect(await screen.findByText('Gagal memuat jadwal laporan')).toBeInTheDocument();
  });
});
