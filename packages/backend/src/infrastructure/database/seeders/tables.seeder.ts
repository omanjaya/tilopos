/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

interface SeedTablesParams {
  outletPusatId: string;
  outletCabangId: string;
}

export async function seedTables(prisma: PrismaClient, params: SeedTablesParams) {
  console.log('Creating tables...');
  const tableNames = [
    { name: 'T1', section: 'Indoor', capacity: 2 },
    { name: 'T2', section: 'Indoor', capacity: 4 },
    { name: 'T3', section: 'Indoor', capacity: 4 },
    { name: 'T4', section: 'Indoor', capacity: 6 },
    { name: 'T5', section: 'Indoor', capacity: 6 },
    { name: 'T6', section: 'Outdoor', capacity: 2 },
    { name: 'T7', section: 'Outdoor', capacity: 4 },
    { name: 'T8', section: 'Outdoor', capacity: 4 },
    { name: 'VIP1', section: 'VIP Room', capacity: 8 },
    { name: 'VIP2', section: 'VIP Room', capacity: 10 },
  ];

  const tables: Record<string, { id: string }> = {};
  for (const t of tableNames) {
    const table = await prisma.table.create({
      data: { outletId: params.outletPusatId, name: t.name, section: t.section, capacity: t.capacity },
    });
    tables[t.name] = table;
  }

  // Kemang outlet tables
  for (let i = 1; i <= 6; i++) {
    await prisma.table.create({
      data: {
        outletId: params.outletCabangId,
        name: `K${i}`,
        section: i <= 4 ? 'Indoor' : 'Outdoor',
        capacity: 4,
      },
    });
  }
  console.log(`  Created ${tableNames.length + 6} tables across 2 outlets`);

  console.log('Creating waiting list...');
  await prisma.waitingList.createMany({
    data: [
      {
        outletId: params.outletPusatId,
        customerName: 'Keluarga Surya',
        customerPhone: '081122334455',
        partySize: 6,
        preferredSection: 'Indoor',
        status: 'waiting',
        estimatedWait: 15,
      },
      {
        outletId: params.outletPusatId,
        customerName: 'Ibu Kartini',
        customerPhone: '081998877665',
        partySize: 2,
        preferredSection: 'Outdoor',
        status: 'waiting',
        estimatedWait: 10,
      },
    ],
  });
  console.log(`  Created 2 waiting list entries`);

  return { tables };
}
