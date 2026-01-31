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
    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!employee.pin) {
      throw new UnauthorizedException('PIN not configured for this employee');
    }

    const pinValid = await bcrypt.compare(input.pin, employee.pin);
    if (!pinValid) {
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
