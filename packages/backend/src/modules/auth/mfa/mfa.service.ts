import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { IEmployeeRepository } from '@domain/interfaces/repositories/employee.repository';
import { generateBase32Secret, generateTotpUri, verifyTotp } from './totp.util';

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
}

@Injectable()
export class MfaService {
  private static readonly ISSUER = 'TILO';

  constructor(
    @Inject(REPOSITORY_TOKENS.EMPLOYEE)
    private readonly employeeRepo: IEmployeeRepository,
  ) {}

  async generateSecret(employeeId: string): Promise<MfaSetupResult> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    if (employee.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled. Disable it first to reconfigure.');
    }

    const secret = generateBase32Secret();
    const accountName = employee.email ?? employee.name;

    await this.employeeRepo.update(employeeId, { mfaSecret: secret });

    const otpauthUrl = generateTotpUri(secret, accountName, MfaService.ISSUER);

    return { secret, otpauthUrl };
  }

  async verifyToken(employeeId: string, token: string): Promise<boolean> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    if (!employee.mfaSecret) {
      throw new BadRequestException('MFA not configured for this employee');
    }

    return verifyTotp(employee.mfaSecret, token);
  }

  async enableMfa(employeeId: string, token: string): Promise<{ enabled: boolean }> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    if (employee.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    if (!employee.mfaSecret) {
      throw new BadRequestException('MFA secret not generated. Call /auth/mfa/setup first.');
    }

    const isValid = verifyTotp(employee.mfaSecret, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    await this.employeeRepo.update(employeeId, { mfaEnabled: true });

    return { enabled: true };
  }

  async disableMfa(employeeId: string, token: string): Promise<{ disabled: boolean }> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    if (!employee.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    if (!employee.mfaSecret) {
      throw new BadRequestException('MFA secret not found');
    }

    const isValid = verifyTotp(employee.mfaSecret, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    await this.employeeRepo.update(employeeId, {
      mfaEnabled: false,
      mfaSecret: null,
    });

    return { disabled: true };
  }
}
