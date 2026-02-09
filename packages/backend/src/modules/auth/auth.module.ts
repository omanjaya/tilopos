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
import { JwtStrategy } from '../../infrastructure/auth/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaEmployeeRepository } from '../../infrastructure/repositories/prisma-employee.repository';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '8h' },
      }),
      inject: [ConfigService],
    }),
    BusinessModule,
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
    JwtStrategy,
    GoogleStrategy,
    { provide: REPOSITORY_TOKENS.EMPLOYEE, useClass: PrismaEmployeeRepository },
  ],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
