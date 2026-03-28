import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException("Credenciales inválidas.");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Credenciales inválidas.");

    const token = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { expiresIn: 43200 }
    ); // 12h

    return { token };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true, createdAt: true },
    });

    if (!user) return null;

    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: {
        id: true,
        contextType: true,
        contextId: true,
        regionCode: true,
        regionScopeMode: true,
        regionScope: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return { user, memberships };
  }
}
