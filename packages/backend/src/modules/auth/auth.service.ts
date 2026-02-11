import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type {
  IEmployeeRepository,
  EmployeeRecord,
} from '@domain/interfaces/repositories/employee.repository';
import type { GoogleOAuthProfile } from './dto/oauth-login.dto';
import { verifyTotp } from './mfa/totp.util';

export interface OAuthLoginResult {
  accessToken: string;
  employeeId: string;
  employeeName: string;
  role: string;
  businessId: string;
  outletId: string | null;
}

export interface MfaPendingResult {
  requiresMfa: true;
  mfaToken: string;
}

export interface MfaTokenPayload {
  sub: string;
  purpose: 'mfa_verification';
  businessId: string;
  outletId: string | null;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    @Inject(REPOSITORY_TOKENS.EMPLOYEE)
    private readonly employeeRepo: IEmployeeRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(clientId);
  }

  async validateOAuthUser(profile: GoogleOAuthProfile): Promise<EmployeeRecord> {
    const existingByGoogleId = await this.employeeRepo.findByGoogleId(profile.googleId);
    if (existingByGoogleId) {
      return existingByGoogleId;
    }

    const existingByEmail = await this.employeeRepo.findByEmail(profile.email);
    if (existingByEmail) {
      const updated = await this.employeeRepo.update(existingByEmail.id, {
        googleId: profile.googleId,
        authProvider: 'google',
      });
      return updated;
    }

    throw new UnauthorizedException(
      'No employee account found for this Google email. Please contact your administrator.',
    );
  }

  async loginWithOAuth(employee: EmployeeRecord): Promise<OAuthLoginResult | MfaPendingResult> {
    if (!employee.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (employee.mfaEnabled) {
      return this.createMfaPendingResponse(employee);
    }

    return this.createLoginResponse(employee);
  }

  async verifyGoogleIdToken(idToken: string): Promise<GoogleOAuthProfile> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      this.logger.error('GOOGLE_CLIENT_ID not configured — cannot verify Google ID token');
      throw new UnauthorizedException('Google OAuth is not configured');
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid Google ID token payload');
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email,
        picture: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`Google ID token verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Failed to verify Google ID token');
    }
  }

  async verifyMfaAndLogin(mfaToken: string, totpToken: string): Promise<OAuthLoginResult> {
    let payload: MfaTokenPayload;

    try {
      payload = this.jwtService.verify<MfaTokenPayload>(mfaToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }

    if (payload.purpose !== 'mfa_verification') {
      throw new UnauthorizedException('Invalid MFA token purpose');
    }

    const employee = await this.employeeRepo.findById(payload.sub);
    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    if (!employee.mfaEnabled || !employee.mfaSecret) {
      throw new UnauthorizedException('MFA is not configured for this employee');
    }

    const isValid = verifyTotp(employee.mfaSecret, totpToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP token');
    }

    return this.createLoginResponse(employee);
  }

  createMfaPendingResponse(employee: EmployeeRecord): MfaPendingResult {
    const mfaPayload: MfaTokenPayload = {
      sub: employee.id,
      purpose: 'mfa_verification',
      businessId: employee.businessId,
      outletId: employee.outletId,
      role: employee.role,
    };

    const mfaToken = this.jwtService.sign(mfaPayload, { expiresIn: '5m' });

    return {
      requiresMfa: true,
      mfaToken,
    };
  }

  private createLoginResponse(employee: EmployeeRecord): OAuthLoginResult {
    const jwtPayload = {
      sub: employee.id,
      businessId: employee.businessId,
      outletId: employee.outletId,
      role: employee.role,
    };

    const accessToken = this.jwtService.sign(jwtPayload);

    return {
      accessToken,
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role,
      businessId: employee.businessId,
      outletId: employee.outletId,
    };
  }

  /**
   * Get employee profile with full details
   */
  async getEmployeeProfile(employeeId: string) {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    return {
      id: employee.id,
      businessId: employee.businessId,
      outletId: employee.outletId,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      profilePhotoUrl: employee.profilePhotoUrl,
      onboardingCompleted: employee.onboardingCompleted ?? false,
      isActive: employee.isActive,
      mfaEnabled: employee.mfaEnabled,
    };
  }

  /**
   * Mark user's onboarding as completed
   */
  async completeOnboarding(employeeId: string) {
    await this.employeeRepo.update(employeeId, {
      onboardingCompleted: true,
    });

    return { success: true, message: 'Onboarding completed successfully' };
  }
}
