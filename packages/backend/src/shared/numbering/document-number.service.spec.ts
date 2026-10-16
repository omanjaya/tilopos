import { DocumentNumberService } from './document-number.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';

function mockClient(values: number[]) {
  const queue = [...values];
  const $queryRaw = jest.fn(async () => [{ last_value: queue.shift() }]);
  return { client: { $queryRaw } as unknown as PrismaService, $queryRaw };
}

/** Joins the tagged-template call back into SQL text + params for assertions. */
function sqlOf(call: unknown[]): { text: string; params: unknown[] } {
  const [strings, ...params] = call as [TemplateStringsArray, ...unknown[]];
  return { text: strings.join('?').replace(/\s+/g, ' ').trim(), params };
}

describe('DocumentNumberService', () => {
  const service = new DocumentNumberService();
  const businessId = '11111111-1111-1111-1111-111111111111';
  // 2026-09-27 01:30 WIB == 2026-09-26 18:30 UTC -> business day 20260927
  const date = new Date('2026-09-26T18:30:00.000Z');

  it('returns a daily number with the Jakarta business date and 4-digit counter', async () => {
    const { client } = mockClient([1]);
    await expect(service.next(client, businessId, 'TRX', { date })).resolves.toBe(
      'TRX-20260927-0001',
    );
  });

  it('returns a non-daily number with a 6-digit counter and empty date key', async () => {
    const { client, $queryRaw } = mockClient([123]);
    await expect(service.next(client, businessId, 'INV', { daily: false })).resolves.toBe(
      'INV-000123',
    );
    const { params } = sqlOf($queryRaw.mock.calls[0]);
    expect(params).toEqual([businessId, 'INV', '']);
  });

  it('uses a single atomic upsert keyed by (business_id, prefix, date_key)', async () => {
    const { client, $queryRaw } = mockClient([7]);
    await service.next(client, businessId, 'PO', { date, pad: 3 });
    expect($queryRaw).toHaveBeenCalledTimes(1);
    const { text, params } = sqlOf($queryRaw.mock.calls[0]);
    expect(text).toContain('INSERT INTO document_sequences');
    expect(text).toContain('ON CONFLICT (business_id, prefix, date_key)');
    expect(text).toContain('last_value = document_sequences.last_value + 1');
    expect(text).toContain('RETURNING last_value');
    expect(params).toEqual([businessId, 'PO', '20260927']);
  });

  it('honours custom padding and bigint results', async () => {
    const $queryRaw = jest.fn(async () => [{ last_value: BigInt(42) }]);
    const client = { $queryRaw } as unknown as PrismaService;
    await expect(service.next(client, businessId, 'SO', { date, pad: 2 })).resolves.toBe(
      'SO-20260927-42',
    );
  });

  it('does not truncate counters longer than the padding', async () => {
    const { client } = mockClient([12345]);
    await expect(service.next(client, businessId, 'TRF', { date })).resolves.toBe(
      'TRF-20260927-12345',
    );
  });

  it('rejects invalid prefixes and missing businessId without querying', async () => {
    const { client, $queryRaw } = mockClient([1]);
    await expect(service.next(client, businessId, '')).rejects.toThrow('invalid prefix');
    await expect(service.next(client, businessId, 'BAD PREFIX')).rejects.toThrow('invalid prefix');
    await expect(service.next(client, businessId, 'X'.repeat(21))).rejects.toThrow(
      'invalid prefix',
    );
    await expect(service.next(client, '', 'TRX')).rejects.toThrow('businessId is required');
    expect($queryRaw).not.toHaveBeenCalled();
  });

  it('fails loudly when the upsert returns no row', async () => {
    const $queryRaw = jest.fn(async () => []);
    const client = { $queryRaw } as unknown as PrismaService;
    await expect(service.next(client, businessId, 'TRX')).rejects.toThrow('returned no row');
  });
});
