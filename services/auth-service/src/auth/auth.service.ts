import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import bcrypt from 'node_modules/bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email already exists');
    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hash },
    });
    return { id: user.id, email: user.email };
  }

  async validateUser(email: string, plain: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(plain, user.password);
    if (!ok) return null;
    return user;
  }

  async login(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload);
    console.log(user);
    const refreshToken = await this.generateRefreshToken(user.id);
    return { accessToken, refreshToken };
  }

  async generateRefreshToken(userId: string) {
    console.log(userId, 'userid');
    const expiresIn = parseInt(
      process.env.REFRESH_TOKEN_EXPIRES_IN || '604800',
      10,
    );
    const token = this.jwt.sign(
      { sub: userId },
      {
        secret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
        expiresIn: `${expiresIn}s`,
      },
    );

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  async refreshToken(oldToken: string) {
    try {
      const db = await this.prisma.refreshToken.findUnique({
        where: { token: oldToken },
      });
      if (!db) throw new UnauthorizedException('Invalid refresh token');

      const payload: any = this.jwt.verify(oldToken, {
        secret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException();

      await this.prisma.refreshToken.delete({ where: { token: oldToken } });
      const newRefresh = await this.generateRefreshToken(user.id);
      const newAccess = this.jwt.sign({ sub: user.id, email: user.email });

      return { accessToken: newAccess, refreshToken: newRefresh };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.delete({
      where: { token: refreshToken },
    });

    return { message: 'Logged out successfully' };
  }
}
