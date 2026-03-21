import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { FeatureService } from '../../../modules/business/services/feature.service';
import { SubscriptionService } from '../../../modules/subscription/subscription.service';
import { AuthService } from '../../../modules/auth/auth.service';
import { isValidBusinessType } from '@config/business-types.config';
import type { RegisterDto } from '../../dtos/register.dto';

export interface RegisterOutput {
  accessToken: string;
  employeeId: string;
  employeeName: string;
  role: string;
  businessId: string;
  outletId: string;
  businessType: string;
  featuresEnabled: number;
  enabledFeatures: string[];
  emailVerified: boolean;
}

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly featureService: FeatureService,
    private readonly subscriptionService: SubscriptionService,
    private readonly authService: AuthService,
  ) {}

  async execute(dto: RegisterDto): Promise<RegisterOutput> {
    if (dto.pin !== dto.confirmPin) {
      throw new BadRequestException('PIN dan konfirmasi PIN tidak cocok');
    }

    if (!isValidBusinessType(dto.businessType)) {
      throw new BadRequestException(`Tipe bisnis tidak valid: ${dto.businessType}`);
    }

    const existingEmployee = await this.prisma.employee.findFirst({
      where: { email: dto.email },
    });

    if (existingEmployee) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const hashedPin = await bcrypt.hash(dto.pin, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: dto.businessName,
          phone: dto.businessPhone,
          email: dto.email,
          address: dto.businessAddress,
          businessType: dto.businessType,
          businessTypeSetAt: new Date(),
        },
      });

      const outlet = await tx.outlet.create({
        data: {
          businessId: business.id,
          name: dto.outletName,
          code: dto.outletCode || undefined,
          address: dto.outletAddress,
          taxRate: dto.taxRate ?? 11,
        },
      });

      const employee = await tx.employee.create({
        data: {
          businessId: business.id,
          outletId: outlet.id,
          name: dto.ownerName,
          email: dto.email,
          phone: dto.phone,
          pin: hashedPin,
          role: 'owner',
          onboardingCompleted: true,
        },
      });

      return { business, outlet, employee };
    });

    await this.featureService.initializeFeaturesForBusinessType(
      result.business.id,
      dto.businessType,
    );

    // Start 14-day premium trial for new businesses
    try {
      await this.subscriptionService.startTrial(result.business.id);
    } catch (error) {
      this.logger.warn(`Failed to start trial for business ${result.business.id}`, error);
    }

    const enabledFeatures = await this.featureService.getEnabledFeatureKeys(result.business.id);

    const payload = {
      sub: result.employee.id,
      businessId: result.business.id,
      outletId: result.outlet.id,
      role: result.employee.role,
      emailVerified: false,
    };

    const accessToken = this.jwtService.sign(payload);

    // Send verification email (non-blocking)
    this.authService.sendVerificationEmail(result.employee.id).catch((error) => {
      this.logger.warn(
        `Failed to send verification email for employee ${result.employee.id}`,
        error,
      );
    });

    return {
      accessToken,
      employeeId: result.employee.id,
      employeeName: result.employee.name,
      role: result.employee.role,
      businessId: result.business.id,
      outletId: result.outlet.id,
      businessType: dto.businessType,
      featuresEnabled: enabledFeatures.length,
      enabledFeatures,
      emailVerified: false,
    };
  }
}
