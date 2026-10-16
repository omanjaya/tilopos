import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type {
  IEmployeeRepository,
  EmployeeRecord,
} from '@domain/interfaces/repositories/employee.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EmailService } from '@infrastructure/notifications/email/email.service';
import type { GoogleOAuthProfile } from './dto/oauth-login.dto';
import { verifyTotp } from './mfa/totp.util';
import { PurposeTokenService } from '@infrastructure/auth/purpose-token.service';
import { LoginAttemptService } from '@infrastructure/security/login-attempt.service';
import { MfaSecretCipher } from './mfa/mfa-secret.cipher';

/** TOTP codes are accepted for 3 steps of 30s; remember used ones slightly longer. */
const TOTP_REPLAY_TTL_SECONDS = 120;

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
  outletId: string | null;
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
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly purposeTokens: PurposeTokenService,
    private readonly attempts: LoginAttemptService,
    private readonly mfaCipher: MfaSecretCipher,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(clientId);
  }

  /**
   * Resolves the employee for a verified Google identity.
   * - An existing googleId link wins.
   * - Otherwise the e-mail must match exactly one active employee (e-mails are
   *   not unique across tenants); ambiguous matches are refused instead of
   *   picking an arbitrary tenant, and an account already linked to a
   *   different Google identity is never re-linked.
   */
  async validateOAuthUser(profile: GoogleOAuthProfile): Promise<EmployeeRecord> {
    if (!profile.emailVerified) {
      throw new UnauthorizedException('Google account e-mail is not verified');
    }

    const existingByGoogleId = await this.employeeRepo.findByGoogleId(profile.googleId);
    if (existingByGoogleId) {
      return existingByGoogleId;
    }

    const candidates = await this.prisma.employee.findMany({
      where: { email: { equals: profile.email, mode: 'insensitive' }, isActive: true },
      select: { id: true, googleId: true },
      take: 2,
    });

    if (candidates.length > 1) {
      this.logger.warn(`Google login refused: e-mail matches several employees (${profile.email})`);
      throw new UnauthorizedException(
        'This e-mail is used by more than one account. Sign in with your PIN instead.',
      );
    }

    const match = candidates[0];
    if (match && !match.googleId) {
      return this.employeeRepo.update(match.id, {
        googleId: profile.googleId,
        authProvider: 'google',
      });
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
      if (payload.email_verified !== true) {
        throw new UnauthorizedException('Google account e-mail is not verified');
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: true,
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
    const payload = this.purposeTokens.verify<MfaTokenPayload>('mfa_verification', mfaToken);

    // Per-account lockout: a fresh mfaToken per re-login must not reset the budget.
    await this.attempts.assertNotLocked('mfa', payload.sub);

    const employee = await this.employeeRepo.findById(payload.sub);
    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('Employee not found');
    }

    if (!employee.mfaEnabled || !employee.mfaSecret) {
      throw new UnauthorizedException('MFA is not configured for this employee');
    }

    const isValid = verifyTotp(this.mfaCipher.decrypt(employee.mfaSecret), totpToken);
    if (!isValid) {
      await this.attempts.recordFailure('mfa', employee.id);
      throw new UnauthorizedException('Invalid TOTP token');
    }

    // A code stays valid for ~90s (window ±1 step); refuse to accept it twice.
    const fresh = await this.attempts.markCodeUsed(employee.id, totpToken, TOTP_REPLAY_TTL_SECONDS);
    if (!fresh) {
      throw new UnauthorizedException('TOTP token already used');
    }
    await this.attempts.reset('mfa', employee.id);

    // Keep the outlet chosen at the PIN step (already validated by LoginUseCase)
    return this.createLoginResponse(employee, payload.outletId ?? employee.outletId);
  }

  createMfaPendingResponse(employee: EmployeeRecord): MfaPendingResult {
    const mfaToken = this.purposeTokens.sign<MfaTokenPayload>(
      'mfa_verification',
      { sub: employee.id, outletId: employee.outletId },
      '5m',
    );

    return {
      requiresMfa: true,
      mfaToken,
    };
  }

  private createLoginResponse(
    employee: EmployeeRecord,
    outletId: string | null = employee.outletId,
  ): OAuthLoginResult {
    const jwtPayload = {
      sub: employee.id,
      businessId: employee.businessId,
      outletId,
      role: employee.role,
      emailVerified: employee.emailVerified ?? false,
    };

    const accessToken = this.jwtService.sign(jwtPayload);

    return {
      accessToken,
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role,
      businessId: employee.businessId,
      outletId,
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

    // Resolve outlet name
    let outletName: string | null = null;
    if (employee.outletId) {
      const outlet = await this.prisma.outlet.findUnique({
        where: { id: employee.outletId },
        select: { name: true },
      });
      outletName = outlet?.name ?? null;
    }

    return {
      id: employee.id,
      businessId: employee.businessId,
      outletId: employee.outletId,
      outletName,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      profilePhotoUrl: employee.profilePhotoUrl,
      onboardingCompleted: employee.onboardingCompleted ?? false,
      isActive: employee.isActive,
      mfaEnabled: employee.mfaEnabled,
      emailVerified: employee.emailVerified ?? false,
      preferences: employee.preferences ?? {},
      createdAt: employee.createdAt,
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

  /**
   * Send verification email to employee
   */
  async sendVerificationEmail(employeeId: string): Promise<{ success: boolean; message: string }> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new UnauthorizedException('Employee not found');
    }

    if (employee.emailVerified) {
      return { success: true, message: 'Email sudah terverifikasi' };
    }

    if (!employee.email) {
      throw new BadRequestException('Employee does not have an email address');
    }

    const token = this.purposeTokens.sign('email_verification', { sub: employee.id }, '24h');
    const frontendUrl = this.frontendUrl();
    const verificationLink = `${frontendUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

    await this.emailService.send({
      to: employee.email,
      subject: 'Verifikasi Email - TiloPOS',
      template: 'verify-email',
      context: {
        name: employee.name,
        verificationLink,
      },
    });

    return { success: true, message: 'Email verifikasi telah dikirim' };
  }

  /**
   * Verify email using token from email link
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    let payload: { sub: string };
    try {
      payload = this.purposeTokens.verify<{ sub: string }>('email_verification', token);
    } catch {
      throw new BadRequestException('Token verifikasi tidak valid atau sudah kadaluarsa');
    }

    const employee = await this.employeeRepo.findById(payload.sub);
    if (!employee) {
      throw new BadRequestException('Akun tidak ditemukan');
    }

    if (employee.emailVerified) {
      return { success: true, message: 'Email sudah terverifikasi sebelumnya' };
    }

    await this.employeeRepo.update(payload.sub, {
      emailVerified: true,
    });

    return { success: true, message: 'Email berhasil diverifikasi' };
  }

  /** FRONTEND_URL is required in production (env.validation.ts); localhost only in dev. */
  private frontendUrl(): string {
    const url = this.configService.get<string>('FRONTEND_URL');
    if (url) {
      return url;
    }
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new Error('FRONTEND_URL is not configured');
    }
    return 'http://localhost:5173';
  }
}
