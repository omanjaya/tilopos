import { ForbiddenException } from '@nestjs/common';
import { PosController } from './pos.controller';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';

describe('POS held bill outlet policy', () => {
  const execute = jest.fn();
  const assertOutlet = jest.fn();
  let controller: PosController;
  const user: AuthUser = { businessId: 'b', employeeId: 'e', outletId: 'o', role: 'cashier' };
  beforeEach(() => {
    jest.resetAllMocks();
    controller = Object.assign(Object.create(PosController.prototype) as PosController, {
      tenant: { assertOutlet },
      holdBillUseCase: { execute },
      listHeldBillsUseCase: { execute },
      resumeBillUseCase: { execute },
    });
  });
  it('rejects a different outlet before reading or mutating Redis', async () => {
    await expect(controller.listHeldBills({ outletId: 'other' }, user)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(controller.holdBill({ outletId: 'other', items: [] }, user)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(controller.resumeBill({}, 'bill', { outletId: 'other' }, user)).rejects.toThrow(
      ForbiddenException,
    );
    expect(execute).not.toHaveBeenCalled();
  });
  it('verifies an unassigned owner outlet using TenantAccessService', async () => {
    const owner = { ...user, outletId: null, role: 'owner' };
    assertOutlet.mockResolvedValue('owned-outlet');
    await controller.listHeldBills({ outletId: 'owned-outlet', cursor: '17' }, owner);
    expect(assertOutlet).toHaveBeenCalledWith(owner, 'owned-outlet');
    expect(execute).toHaveBeenCalledWith('b', 'owned-outlet', '17');
  });
  it('takes employee and business exclusively from the authenticated user', async () => {
    await controller.holdBill({ outletId: 'o', items: [], clientBillId: 'stable' }, user);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'b',
        employeeId: 'e',
        outletId: 'o',
        clientBillId: 'stable',
        role: 'cashier',
      }),
    );
  });
});
