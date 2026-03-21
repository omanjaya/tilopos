import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { GoogleStrategy } from './strategies/google.strategy';
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
          signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '8h' },
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
    AuthService,
    MfaService,
    LoginUseCase,
    RegisterUseCase,
    UpdateProfileUseCase,
    ChangePinUseCase,
    GetActivityLogUseCase,
    LogAuditEventUseCase,
    JwtStrategy,
    GoogleStrategy,
    { provide: REPOSITORY_TOKENS.EMPLOYEE, useClass: PrismaEmployeeRepository },
    { provide: REPOSITORY_TOKENS.AUDIT, useClass: PrismaAuditRepository },
  ],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
