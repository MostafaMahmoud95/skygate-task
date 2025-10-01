import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async ensureWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balance: '0' },
      });
    }
    return wallet;
  }

  async initWallet(userId: string) {
    const wallet = await this.ensureWallet(userId);
    return {
      walletId: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance.toString(),
    };
  }

  async credit(userId: string, amount: number) {
    const wallet = await this.ensureWallet(userId);
    const txn = await this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: amount.toString(),
          type: 'credit',
          status: 'completed',
        },
      });
      const newBal = (parseFloat(wallet.balance.toString()) + amount).toFixed(
        6,
      );
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBal },
      });
      return created;
    });
    return txn;
  }

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return { balance: '0' };
    return { balance: wallet.balance.toString() };
  }

  async charge(userId: string, amount: number, operationId?: string) {
    const wallet = await this.ensureWallet(userId);
    const txn = await this.prisma.$transaction(async (tx) => {
      if (operationId) {
        const existing = await tx.transaction.findUnique({
          where: { operationId },
        });
        if (existing) return existing;
      }
      const w = await tx.wallet.findUnique({ where: { userId } });
      if (!w) throw new NotFoundException('Wallet not found');
      const bal = parseFloat(w.balance.toString());
      if (bal < amount) throw new BadRequestException('Insufficient funds');
      const t = await tx.transaction.create({
        data: {
          walletId: w.id,
          amount: amount.toString(),
          type: 'debit',
          status: 'pending',
          operationId,
        },
      });
      const newBal = (bal - amount).toFixed(6);
      await tx.wallet.update({
        where: { id: w.id },
        data: { balance: newBal },
      });
      return t;
    });
    return txn;
  }

  async completeTransaction(txnId: string) {
    const txn = await this.prisma.transaction.findUnique({
      where: { id: txnId },
    });
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.status === 'completed') return txn;
    return this.prisma.transaction.update({
      where: { id: txnId },
      data: { status: 'completed' },
    });
  }

  async refundTransaction(txnId: string) {
    const txn = await this.prisma.transaction.findUnique({
      where: { id: txnId },
    });
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.status === 'refunded') return txn;
    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { id: txn.walletId },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');
      const newBal = (
        parseFloat(wallet.balance.toString()) +
        parseFloat(txn.amount.toString())
      ).toFixed(6);
      await tx.transaction.update({
        where: { id: txnId },
        data: { status: 'refunded' },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: txn.amount.toString(),
          type: 'credit',
          status: 'completed',
          metadata: { refundFor: txnId },
        },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBal },
      });
      return { refunded: true };
    });
    return result;
  }
}
