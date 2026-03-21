/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

const prisma = new PrismaClient();

const UDSAYAN_DIR = path.resolve(__dirname, '../../../../UDSAYAN');

const OUTLET_FILES = [
  { file: 'MITRA USAHA CANGGU 2025.xlsx', name: 'UD Sayan - Canggu', code: 'UDS-CGU' },
  { file: 'MITRA USAHA SAYAN 2025.xlsx', name: 'UD Sayan - Sayan', code: 'UDS-SYN' },
  { file: 'MITRA USAHA PEJENG 2025.xlsx', name: 'UD Sayan - Pejeng', code: 'UDS-PJG' },
  { file: 'MITRA USAHA SAMPLANGAN 2025.xlsx', name: 'UD Sayan - Samplangan', code: 'UDS-SMP' },
  { file: null, name: 'UD Sayan - Teges', code: 'UDS-TGS' },
];

function categorizeProduct(name: string): string {
  const n = name.toLowerCase();
  if (n.startsWith('andesit')) return 'Andesit';
  if (n.startsWith('candi') || n.includes(' candi')) return 'Candi';
  if (n.includes('green sukabumi')) return 'Green Sukabumi';
  if (n.includes('putih tulang') || n.startsWith('pt ')) return 'Putih Tulang';
  if (n.includes('paras jogja') || n.startsWith('pj ')) return 'Paras Jogja';
  if (n.includes('palimanan')) return 'Palimanan';
  if (n.includes('batu kolam') || n.includes('batu koral') || n.includes('batu sikat'))
    return 'Batu Alam';
  if (n.includes('templek')) return 'Templek';
  if (n.includes('roster')) return 'Roster';
  if (n.includes('copper') || n.includes('tembaga')) return 'Copper';
  if (n.includes('marmo') || n.includes('marble')) return 'Marmo';
  if (n.startsWith('bali green') || n.startsWith('batik green')) return 'Bali Green';
  if (n.includes('ziolit') || n.includes('zeolite') || n.includes('zeolit')) return 'Ziolit';
  if (n.includes('breksi')) return 'Breksi';
  if (n.includes('lavastone') || n.includes('lava stone')) return 'Lavastone';
  if (n.startsWith('pae ') || n.includes('paving') || n.includes('edging'))
    return 'Paving & Edging';
  if (n.includes('stepping') || n.includes('step stone')) return 'Stepping Stone';
  if (n.includes('alur') || n.startsWith('rts')) return 'Alur & RTS';
  if (n.includes('paras cream') || n.includes('paras tulungagung')) return 'Paras';
  if (n.includes('pacito') || n.includes('roso')) return 'Pacito Roso';
  if (n.includes('coating') || n.includes('nat semen') || n.includes('semen')) return 'Aksesoris';
  return 'Lain-lain';
}

function normalizeProductName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => {
      if (/^\d/.test(word) || /^x\d/.test(word.toLowerCase())) return word;
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

interface ProductData {
  name: string;
  costPrice: number;
  basePrice: number;
  outlets: string[];
}

interface CustomerData {
  name: string;
  creditBalance: number;
  outlet: string;
}

async function readProducts(): Promise<Map<string, ProductData>> {
  const productMap = new Map<string, ProductData>();

  for (const outletDef of OUTLET_FILES) {
    if (!outletDef.file) continue;

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(UDSAYAN_DIR, outletDef.file));
    const detailSheet = wb.getWorksheet('DETAIL');
    if (!detailSheet) continue;

    const outletName = outletDef.code;

    for (let r = 6; r <= detailSheet.rowCount; r++) {
      const row = detailSheet.getRow(r);
      const rawName = String(row.getCell(1).value || '').trim();
      if (!rawName || rawName === 'Grand Total' || rawName === '(blank)') continue;

      const hpp = Number(row.getCell(4).value) || 0;
      const hj = Number(row.getCell(5).value) || 0;
      if (hj <= 0) continue;

      const key = rawName.toLowerCase();
      if (!productMap.has(key)) {
        productMap.set(key, {
          name: normalizeProductName(rawName),
          costPrice: hpp,
          basePrice: hj,
          outlets: [outletName],
        });
      } else {
        const existing = productMap.get(key)!;
        if (!existing.outlets.includes(outletName)) {
          existing.outlets.push(outletName);
        }
        if (hpp > 0 && hpp > existing.costPrice) existing.costPrice = hpp;
        if (hj > 0 && hj > existing.basePrice) existing.basePrice = hj;
      }
    }
  }

  return productMap;
}

async function readCustomers(): Promise<CustomerData[]> {
  const customers: CustomerData[] = [];

  for (const outletDef of OUTLET_FILES) {
    if (!outletDef.file) continue;

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(UDSAYAN_DIR, outletDef.file));
    const piutangSheet = wb.getWorksheet('PIUTANG');
    if (!piutangSheet) continue;

    for (let r = 5; r <= piutangSheet.rowCount; r++) {
      const row = piutangSheet.getRow(r);
      const name = String(row.getCell(1).value || '').trim();
      if (!name || name === 'Grand Total' || name === '(blank)' || name === 'Row Labels') continue;

      const utang = Number(row.getCell(2).value) || 0;
      if (utang > 0) {
        customers.push({
          name,
          creditBalance: utang,
          outlet: outletDef.code,
        });
      }
    }
  }

  return customers;
}

async function main() {
  console.log('========================================');
  console.log('SEED UD SAYAN - Natural Stone Distribution');
  console.log('========================================\n');

  // Check if business already exists
  const existing = await prisma.business.findFirst({
    where: { name: 'UD Sayan' },
  });

  if (existing) {
    console.log(`Business "UD Sayan" already exists (${existing.id}). Skipping.`);
    console.log('To re-import, delete the business first.');
    return;
  }

  // 1. Create Business
  console.log('1. Creating business...');
  const business = await prisma.business.create({
    data: {
      name: 'UD Sayan',
      legalName: 'UD Sayan',
      phone: '-',
      email: 'udsayan@tilopos.id',
      address: 'Bali, Indonesia',
      subscriptionPlan: 'premium',
      subscriptionExpiresAt: new Date('2027-12-31'),
      businessType: 'retail',
      settings: {
        currency: 'IDR',
        locale: 'id-ID',
        timezone: 'Asia/Jakarta',
      },
    },
  });
  console.log(`   Business: ${business.name} (${business.id})`);

  // 2. Create Outlets
  console.log('\n2. Creating outlets...');
  const outletMap: Record<string, string> = {};

  for (const outletDef of OUTLET_FILES) {
    const outlet = await prisma.outlet.create({
      data: {
        businessId: business.id,
        name: outletDef.name,
        code: outletDef.code,
        address: `Bali, Indonesia`,
        taxRate: 0,
        serviceCharge: 0,
        receiptHeader: `${outletDef.name}\nBatu Alam & Material`,
        receiptFooter: 'Terima kasih atas kepercayaan Anda!',
        settings: {},
      },
    });
    outletMap[outletDef.code] = outlet.id;
    console.log(`   Outlet: ${outlet.name} (${outlet.id})`);
  }

  // 3. Create Owner Employee
  console.log('\n3. Creating owner employee...');
  const hashedPin = await bcrypt.hash('1234', 12);
  const owner = await prisma.employee.create({
    data: {
      businessId: business.id,
      outletId: outletMap['UDS-SYN'],
      name: 'Owner UD Sayan',
      email: 'udsayan@tilopos.id',
      phone: '-',
      pin: hashedPin,
      role: 'owner',
      permissions: ['all'],
      onboardingCompleted: true,
    },
  });
  console.log(`   Owner: ${owner.name} (${owner.email}, PIN: 1234)`);

  // Create cashiers per outlet
  console.log('\n4. Creating cashier per outlet...');
  for (const outletDef of OUTLET_FILES) {
    const outletShortName = outletDef.name.replace('UD Sayan - ', '').toLowerCase();
    const cashier = await prisma.employee.create({
      data: {
        businessId: business.id,
        outletId: outletMap[outletDef.code],
        name: `Kasir ${outletDef.name.replace('UD Sayan - ', '')}`,
        email: `kasir.${outletShortName}@udsayan.id`,
        pin: hashedPin,
        role: 'cashier',
        permissions: ['pos'],
        onboardingCompleted: true,
      },
    });
    console.log(`   Cashier: ${cashier.name} (${cashier.email})`);
  }

  // 5. Read products from Excel
  console.log('\n5. Reading products from Excel...');
  const productData = await readProducts();
  console.log(`   Found ${productData.size} unique products`);

  // 6. Create Categories
  console.log('\n6. Creating categories...');
  const categoryNames = new Set<string>();
  for (const [, prod] of productData) {
    categoryNames.add(categorizeProduct(prod.name));
  }

  const categoryMap: Record<string, string> = {};
  let sortOrder = 1;
  for (const catName of Array.from(categoryNames).sort()) {
    const cat = await prisma.category.create({
      data: {
        businessId: business.id,
        name: catName,
        sortOrder: sortOrder++,
      },
    });
    categoryMap[catName] = cat.id;
    console.log(`   Category: ${catName} (${cat.id})`);
  }

  // 7. Create Products + OutletProduct + StockLevel
  console.log('\n7. Creating products...');
  let productCount = 0;
  let outletProductCount = 0;

  for (const [, prod] of productData) {
    const catName = categorizeProduct(prod.name);
    const categoryId = categoryMap[catName];

    // Determine sell unit from product name
    let sellUnit = 'm²';
    const n = prod.name.toLowerCase();
    if (
      n.includes('kolam') ||
      n.includes('koral') ||
      n.includes('sikat') ||
      n.includes('coating') ||
      n.includes('nat semen') ||
      n.includes('stepping') ||
      n.includes('roster')
    ) {
      sellUnit = 'pcs';
    }
    if (n.includes('pae ') || n.includes('edging')) {
      sellUnit = 'btg';
    }

    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId,
        name: prod.name,
        costPrice: prod.costPrice,
        basePrice: prod.basePrice,
        sellUnit,
        trackStock: true,
        isActive: true,
      },
    });
    productCount++;

    // Assign to all outlets (product available everywhere)
    for (const outletDef of OUTLET_FILES) {
      await prisma.outletProduct.create({
        data: {
          outletId: outletMap[outletDef.code],
          productId: product.id,
          isActive: prod.outlets.includes(outletDef.code),
        },
      });
      outletProductCount++;

      // Create StockLevel (start at 0)
      await prisma.stockLevel.create({
        data: {
          outletId: outletMap[outletDef.code],
          productId: product.id,
          quantity: 0,
          lowStockAlert: 10,
        },
      });
    }
  }
  console.log(`   Created ${productCount} products`);
  console.log(`   Created ${outletProductCount} outlet-product assignments`);

  // 8. Read & Create Customers
  console.log('\n8. Reading customers from Excel...');
  const customerData = await readCustomers();
  console.log(`   Found ${customerData.length} customer records`);

  // Deduplicate customers: same name across outlets -> merge, sum creditBalance
  const customerMerged = new Map<
    string,
    { name: string; creditBalance: number; outlets: string[] }
  >();
  for (const c of customerData) {
    const key = c.name.toLowerCase().trim();
    if (!customerMerged.has(key)) {
      customerMerged.set(key, {
        name: c.name,
        creditBalance: c.creditBalance,
        outlets: [c.outlet],
      });
    } else {
      const existing = customerMerged.get(key)!;
      existing.creditBalance += c.creditBalance;
      if (!existing.outlets.includes(c.outlet)) {
        existing.outlets.push(c.outlet);
      }
    }
  }

  console.log(`   Unique customers after dedup: ${customerMerged.size}`);

  console.log('\n9. Creating customers...');
  let customerCount = 0;
  for (const [, cust] of customerMerged) {
    await prisma.customer.create({
      data: {
        businessId: business.id,
        name: cust.name,
        creditBalance: cust.creditBalance,
        creditLimit: cust.creditBalance * 2,
        notes: `Outlet: ${cust.outlets.join(', ')}. Piutang dari data Excel.`,
        customerType:
          cust.name.startsWith('CV ') || cust.name.startsWith('PT ') ? 'company' : 'individual',
      },
    });
    customerCount++;
  }
  console.log(`   Created ${customerCount} customers`);

  // Summary
  console.log('\n========================================');
  console.log('UD SAYAN SEED COMPLETED');
  console.log('========================================\n');
  console.log('Login credentials:');
  console.log('┌──────────┬─────────────────────────┬──────┐');
  console.log('│ Role     │ Email                   │ PIN  │');
  console.log('├──────────┼─────────────────────────┼──────┤');
  console.log('│ Owner    │ udsayan@tilopos.id      │ 1234 │');
  console.log('└──────────┴─────────────────────────┴──────┘\n');
  console.log(`Business ID: ${business.id}`);
  console.log('Outlets:');
  for (const outletDef of OUTLET_FILES) {
    console.log(`  ${outletDef.name}: ${outletMap[outletDef.code]}`);
  }
  console.log(`\nProducts: ${productCount}`);
  console.log(`Categories: ${Object.keys(categoryMap).length}`);
  console.log(`Customers: ${customerCount}`);
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('\nSeed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
