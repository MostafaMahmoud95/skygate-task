import { IsString, IsNotEmpty } from 'class-validator';
export class InitWalletDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
