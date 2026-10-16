import { SessionCookieService } from './session-cookie.service';
import { RefreshSessionService } from './refresh-session.service';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { durationToSeconds } from '../../config/env.validation';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './mfa/mfa.service';
import { MfaController } from './mfa/mfa.controller';
import { LoginUseCase } from '../../application/use-cases/auth/login.use-case';
import { RegisterUseCase } from '../../application/use-cases/auth/register.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/auth/update-profile.use-case';
import { ChangePinUseCase } from '../../application/use-cases/auth/change-pin.use-case';
import { GetActivityLogUseCase } from '../../application/use-cases/auth/get-activity-log.use-case';
import { LogAuditEventUseCase } from '../../application/use-cases/audit/log-audit-event.use-case';
import { JwtStrategy } from '../../infrastructure/auth/jwt.strategy';
import { PurposeTokenService } from '../../infrastructure/auth/purpose-token.service';
import { MfaSecretCipher } from './mfa/mfa-secret.cipher';
import { LoginAttemptService } from '../../infrastructure/security/login-attempt.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaEmployeeRepository } from '../../infrastructure/repositories/prisma-employee.repository';
import { PrismaAuditRepository } from '../../infrastructure/repositories/prisma-audit.repository';
import { BusinessModule } from '../business/business.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { EmailModule } from '../../infrastructure/notifications/email/email.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('FATAL: JWT_SECRET environment variable is required');
        }
        return {
          secret,
          // Validated (format + upper bound) at boot by config/env.validation.ts
          signOptions: {
            // seconds; a bare numeric string would be read as milliseconds by jsonwebtoken
            expiresIn: durationToSeconds(config.getOrThrow<string>('JWT_EXPIRES_IN')) ?? 3600,
          },
        };
      },
      inject: [ConfigService],
    }),
    BusinessModule,
    SubscriptionModule,
    EmailModule,
  ],
  controllers: [AuthController, MfaController],
  providers: [
    RefreshSessionService,
    SessionCookieService,
    AuthService,
    MfaService,
    LoginUseCase,
    RegisterUseCase,
    UpdateProfileUseCase,
    ChangePinUseCase,
    GetActivityLogUseCase,
    LogAuditEventUseCase,
    JwtStrategy,
    PurposeTokenService,
    MfaSecretCipher,
    LoginAttemptService,
    { provide: REPOSITORY_TOKENS.EMPLOYEE, useClass: PrismaEmployeeRepository },
    { provide: REPOSITORY_TOKENS.AUDIT, useClass: PrismaAuditRepository },
  ],
  exports: [
    RefreshSessionService,
    AuthService,
    JwtStrategy,
    PurposeTokenService,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
