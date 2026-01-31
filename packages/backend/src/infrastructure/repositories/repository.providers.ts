import { Provider } from '@nestjs/common';
import { REPOSITORY_TOKENS } from './repository.tokens';
import { PrismaProductRepository } from './prisma-product.repository';
import { PrismaTransactionRepository } from './prisma-transaction.repository';
import { PrismaInventoryRepository } from './prisma-inventory.repository';
import { PrismaOrderRepository } from './prisma-order.repository';
import { PrismaCustomerRepository } from './prisma-customer.repository';
import { PrismaEmployeeRepository } from './prisma-employee.repository';
import { PrismaShiftRepository } from './prisma-shift.repository';
import { PrismaAuditRepository } from './prisma-audit.repository';
import { PrismaOnlineStoreRepository } from './prisma-online-store.repository';
import { PrismaNotificationRepository } from './prisma-notification.repository';
import { PrismaSettlementRepository } from './prisma-settlement.repository';

export const repositoryProviders: Provider[] = [
  { provide: REPOSITORY_TOKENS.PRODUCT, useClass: PrismaProductRepository },
  { provide: REPOSITORY_TOKENS.TRANSACTION, useClass: PrismaTransactionRepository },
  { provide: REPOSITORY_TOKENS.INVENTORY, useClass: PrismaInventoryRepository },
  { provide: REPOSITORY_TOKENS.ORDER, useClass: PrismaOrderRepository },
  { provide: REPOSITORY_TOKENS.CUSTOMER, useClass: PrismaCustomerRepository },
  { provide: REPOSITORY_TOKENS.EMPLOYEE, useClass: PrismaEmployeeRepository },
  { provide: REPOSITORY_TOKENS.SHIFT, useClass: PrismaShiftRepository },
  { provide: REPOSITORY_TOKENS.AUDIT, useClass: PrismaAuditRepository },
  { provide: REPOSITORY_TOKENS.ONLINE_STORE, useClass: PrismaOnlineStoreRepository },
  { provide: REPOSITORY_TOKENS.NOTIFICATION, useClass: PrismaNotificationRepository },
  { provide: REPOSITORY_TOKENS.SETTLEMENT, useClass: PrismaSettlementRepository },
];
