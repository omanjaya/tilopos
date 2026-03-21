import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
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
  outletName: string | null;
  onboardingCompleted: boolean;
  emailVerified: boolean;
}

export interface MfaRequiredOutput {
  requiresMfa: true;
  mfaToken: string;
}

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(REPOSITORY_TOKENS.EMPLOYEE)
    private readonly employeeRepo: IEmployeeRepository,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
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
      this.logger.warn(`Failed login attempt for email: ${input.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    let outletId = input.outletId || employee.outletId;

    // Validate that user-supplied outletId belongs to the employee's business
    if (input.outletId && input.outletId !== employee.outletId) {
      // Only Owner, Manager, or Super Admin can override their assigned outlet
      const allowedRoles = ['super_admin', 'owner', 'manager'];
      if (!allowedRoles.includes(employee.role)) {
        throw new UnauthorizedException('Not authorized to switch outlets');
      }

      const outlet = await this.prisma.outlet.findFirst({
        where: { id: input.outletId, businessId: employee.businessId },
      });
      if (!outlet) {
        throw new UnauthorizedException('Invalid credentials');
      }
      outletId = outlet.id;
    }

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

    // Resolve outlet name
    let outletName: string | null = null;
    if (outletId) {
      const outlet = await this.prisma.outlet.findUnique({
        where: { id: outletId },
        select: { name: true },
      });
      outletName = outlet?.name ?? null;
    }

    const payload = {
      sub: employee.id,
      businessId: employee.businessId,
      outletId,
      role: employee.role,
      emailVerified: employee.emailVerified ?? false,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role,
      businessId: employee.businessId,
      outletId,
      outletName,
      onboardingCompleted: employee.onboardingCompleted ?? false,
      emailVerified: employee.emailVerified ?? false,
    };
  }
}
