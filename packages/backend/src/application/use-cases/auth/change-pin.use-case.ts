import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { IEmployeeRepository } from '@domain/interfaces/repositories/employee.repository';

export interface ChangePinInput {
  employeeId: string;
  currentPin: string;
  newPin: string;
}

@Injectable()
export class ChangePinUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.EMPLOYEE)
    private readonly employeeRepo: IEmployeeRepository,
  ) {}

  async execute(input: ChangePinInput): Promise<{ success: boolean }> {
    const employee = await this.employeeRepo.findById(input.employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee.pin) {
      throw new UnauthorizedException('PIN not configured for this employee');
    }

    // Verify current PIN
    const pinValid = await bcrypt.compare(input.currentPin, employee.pin);
    if (!pinValid) {
      throw new UnauthorizedException('Current PIN is incorrect');
    }

    // Check if new PIN is same as current PIN
    const samePin = await bcrypt.compare(input.newPin, employee.pin);
    if (samePin) {
      throw new UnauthorizedException('New PIN cannot be the same as current PIN');
    }

    // Hash new PIN
    const hashedPin = await bcrypt.hash(input.newPin, 10);

    // Update PIN
    await this.employeeRepo.update(input.employeeId, {
      pin: hashedPin,
    });

    return { success: true };
  }
}
