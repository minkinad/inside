import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import type { Request } from 'express';

export type Principal = { id: string; role: 'EMPLOYEE' | 'ADMIN' };
function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('JWT_SECRET must be at least 32 characters');
  return secret;
}
export function tokenFor(user: Principal) {
  return jwt.sign(user, jwtSecret(), { expiresIn: '12h' });
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(PrismaClient) protected readonly db: PrismaClient) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: Principal }>();
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new UnauthorizedException('Войдите в Inside');
    let user: Principal;
    try {
      user = jwt.verify(token, jwtSecret()) as Principal;
      if (!user.id || !['EMPLOYEE', 'ADMIN'].includes(user.role))
        throw new Error('Invalid token');
    } catch {
      throw new UnauthorizedException('Сессия истекла');
    }
    const current = await this.db.employee.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (!current) throw new UnauthorizedException('Сессия истекла');
    req.user = { id: user.id, role: current.role };
    return true;
  }
}
@Injectable()
export class AdminGuard extends AuthGuard {
  constructor(@Inject(PrismaClient) db: PrismaClient) {
    super(db);
  }
  override async canActivate(context: ExecutionContext) {
    await super.canActivate(context);
    const req = context
      .switchToHttp()
      .getRequest<Request & { user: Principal }>();
    if (req.user.role !== 'ADMIN')
      throw new ForbiddenException('Нужны права администратора');
    return true;
  }
}
export const CurrentUser = createParamDecorator(
  (_data, context: ExecutionContext) =>
    context.switchToHttp().getRequest().user as Principal,
);
