import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { InitWalletDto, CreditDto, ChargeDto } from './dto';

@Controller()
export class BillingController {
  constructor(private billing: BillingService) {}

  @Post('wallet/init')
  async init(@Body() dto: InitWalletDto) {
    return this.billing.initWallet(dto.userId);
  }

  @Post('wallet/credit')
  async credit(@Body() dto: CreditDto) {
    const txn = await this.billing.credit(dto.userId, dto.amount);
    return { success: true, txnId: txn.id };
  }

  @Get('wallet/balance')
  async balance(@Query('userId') userId: string) {
    return this.billing.getBalance(userId);
  }

  @Post('wallet/charge')
  async charge(@Body() dto: ChargeDto) {
    const txn = await this.billing.charge(
      dto.userId,
      dto.amount,
      dto.operationId,
    );
    return { txnId: txn.id, status: txn.status };
  }

  @Post('txns/complete')
  async complete(@Body() b: { txnId: string }) {
    const t = await this.billing.completeTransaction(b.txnId);
    return { success: true, txn: t };
  }

  @Post('txns/refund')
  async refund(@Body() b: { txnId: string }) {
    await this.billing.refundTransaction(b.txnId);
    return { success: true };
  }
}
