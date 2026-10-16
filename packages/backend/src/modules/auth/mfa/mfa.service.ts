import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { IEmployeeRepository } from '@domain/interfaces/repositories/employee.repository';
import { LoginAttemptService } from '@infrastructure/security/login-attempt.service';
import { generateBase32Secret, generateTotpUri, verifyTotp } from './totp.util';
import { MfaSecretCipher } from './mfa-secret.cipher';

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
    private readonly cipher: MfaSecretCipher,
    private readonly attempts: LoginAttemptService,
  ) {}

  async generateSecret(employeeId: string): Promise<MfaSetupResult> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    // Never overwrite the seed of an active MFA enrolment.
    if (employee.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled. Disable it first to reconfigure.');
    }

    const secret = generateBase32Secret();
    const accountName = employee.email ?? employee.name;

    await this.employeeRepo.update(employeeId, { mfaSecret: this.cipher.encrypt(secret) });

    const otpauthUrl = generateTotpUri(secret, accountName, MfaService.ISSUER);

    return { secret, otpauthUrl };
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

    await this.attempts.assertNotLocked('mfa', employeeId);
    const isValid = verifyTotp(this.cipher.decrypt(employee.mfaSecret), token);
    if (!isValid) {
      await this.attempts.recordFailure('mfa', employeeId);
      throw new UnauthorizedException('Invalid MFA token');
    }
    await this.attempts.reset('mfa', employeeId);

    await this.employeeRepo.update(employeeId, { mfaEnabled: true });

    return { enabled: true };
  }

  /** Disabling MFA needs both a current TOTP and the PIN (re-authentication). */
  async disableMfa(employeeId: string, token: string, pin: string): Promise<{ disabled: boolean }> {
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

    await this.attempts.assertNotLocked('mfa', employeeId);
    const pinValid = !!employee.pin && (await bcrypt.compare(pin, employee.pin));
    const totpValid = verifyTotp(this.cipher.decrypt(employee.mfaSecret), token);
    if (!pinValid || !totpValid) {
      await this.attempts.recordFailure('mfa', employeeId);
      throw new UnauthorizedException(pinValid ? 'Invalid MFA token' : 'Invalid PIN');
    }
    await this.attempts.reset('mfa', employeeId);

    await this.employeeRepo.update(employeeId, {
      mfaEnabled: false,
      mfaSecret: null,
    });

    return { disabled: true };
  }
}
