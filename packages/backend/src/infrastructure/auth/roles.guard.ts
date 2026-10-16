import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import { AuthUser } from './auth-user.interface';
import { ROLES_KEY } from './roles.decorator';

/**
 * Global role guard (registered as APP_GUARD after JwtAuthGuard).
 * - super_admin passes everything.
 * - owner passes everything except platform routes (@Roles('super_admin') only).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser; method: string; url: string }>();
    const user = request.user;
    if (!user) {
      return false;
    }

    if (user.role === 'super_admin') {
      return true;
    }

    const platformOnly = requiredRoles.length === 1 && requiredRoles[0] === 'super_admin';
    if (user.role === 'owner' && !platformOnly) {
      this.logger.debug(`Role bypass: owner (${user.employeeId}) ${request.method} ${request.url}`);
      return true;
    }

    return requiredRoles.includes(user.role);
  }
}
