import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { IEmployeeRepository } from '@domain/interfaces/repositories/employee.repository';

export interface LoginInput {
  email: string;
  pin: string;
  outletId?: string;
}

export interface LoginOutput {
  accessToken: string;
  employeeId: string;
  employeeName: string;
  role: string;
  businessId: string;
  outletId: string | null;
}

export interface MfaRequiredOutput {
  requiresMfa: true;
  mfaToken: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.EMPLOYEE)
    private readonly employeeRepo: IEmployeeRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput | MfaRequiredOutput> {
    const employee = await this.employeeRepo.findByEmail(input.email);

    // Always run bcrypt to prevent timing-based user enumeration.
    // If employee doesn't exist, compare against a dummy hash so the
    // response time is indistinguishable from an invalid-PIN attempt.
    const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012';
    const pinToCompare = employee?.pin || DUMMY_HASH;
    const pinValid = await bcrypt.compare(input.pin, pinToCompare);

    if (!employee || !employee.isActive || !employee.pin || !pinValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const outletId = input.outletId || employee.outletId;

    if (employee.mfaEnabled) {
      const mfaPayload = {
        sub: employee.id,
        purpose: 'mfa_verification' as const,
        businessId: employee.businessId,
        outletId,
        role: employee.role,
      };

      const mfaToken = this.jwtService.sign(mfaPayload, { expiresIn: '5m' });

      return {
        requiresMfa: true,
        mfaToken,
      };
    }

    const payload = {
      sub: employee.id,
      businessId: employee.businessId,
      outletId,
      role: employee.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role,
      businessId: employee.businessId,
      outletId,
    };
  }
}
