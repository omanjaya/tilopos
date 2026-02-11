/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

interface SeedEmployeesParams {
  businessId: string;
  outletPusatId: string;
  outletCabangId: string;
}

export async function seedEmployees(prisma: PrismaClient, params: SeedEmployeesParams) {
  console.log('Creating employees...');
  const hashedPin = await bcrypt.hash('1234', 10);

  const superAdmin = await prisma.employee.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletPusatId,
      name: 'Super Administrator',
      email: 'superadmin@tilopos.id',
      phone: '081200000000',
      pin: hashedPin,
      role: 'super_admin',
      permissions: ['all'],
      hourlyRate: 0,
    },
  });

  const owner = await prisma.employee.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletPusatId,
      name: 'Budi Santoso',
      email: 'budi@brewbites.id',
      phone: '081234567890',
      pin: hashedPin,
      role: 'owner',
      permissions: ['all'],
      hourlyRate: 0,
    },
  });

  const manager = await prisma.employee.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletPusatId,
      name: 'Siti Rahayu',
      email: 'siti@brewbites.id',
      phone: '081234567891',
      pin: hashedPin,
      role: 'manager',
      permissions: ['pos', 'inventory', 'reports', 'employees', 'customers'],
      hourlyRate: 75000,
    },
  });

  const supervisor = await prisma.employee.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletPusatId,
      name: 'Agus Wijaya',
      email: 'agus@brewbites.id',
      phone: '081234567892',
      pin: hashedPin,
      role: 'supervisor',
      permissions: ['pos', 'inventory', 'reports'],
      hourlyRate: 50000,
    },
  });

  const cashier1 = await prisma.employee.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletPusatId,
      name: 'Dewi Lestari',
      email: 'dewi@brewbites.id',
      phone: '081234567893',
      pin: hashedPin,
      role: 'cashier',
      permissions: ['pos'],
      hourlyRate: 30000,
    },
  });

  const cashier2 = await prisma.employee.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletCabangId,
      name: 'Rina Marlina',
      email: 'rina@brewbites.id',
      phone: '081234567894',
      pin: hashedPin,
      role: 'cashier',
      permissions: ['pos'],
      hourlyRate: 30000,
    },
  });

  const kitchenStaff = await prisma.employee.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletPusatId,
      name: 'Joko Prasetyo',
      email: 'joko@brewbites.id',
      phone: '081234567895',
      pin: hashedPin,
      role: 'kitchen',
      permissions: ['kds'],
      hourlyRate: 25000,
    },
  });

  const inventoryStaff = await prisma.employee.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletPusatId,
      name: 'Hendra Gunawan',
      email: 'hendra@brewbites.id',
      phone: '081234567896',
      pin: hashedPin,
      role: 'inventory',
      permissions: ['inventory'],
      hourlyRate: 28000,
    },
  });

  console.log(`  Super Admin: ${superAdmin.name} (${superAdmin.email})`);
  console.log(`  Owner: ${owner.name} (${owner.email})`);
  console.log(`  Manager: ${manager.name}`);
  console.log(`  Supervisor: ${supervisor.name}`);
  console.log(`  Cashier 1: ${cashier1.name} (Pusat)`);
  console.log(`  Cashier 2: ${cashier2.name} (Kemang)`);
  console.log(`  Kitchen: ${kitchenStaff.name}`);
  console.log(`  Inventory: ${inventoryStaff.name}`);
  console.log('  PIN for all employees: 1234');

  return {
    superAdmin,
    owner,
    manager,
    supervisor,
    cashier1,
    cashier2,
    kitchenStaff,
    inventoryStaff,
  };
}
