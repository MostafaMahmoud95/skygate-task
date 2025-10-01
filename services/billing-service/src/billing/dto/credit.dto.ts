import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
export class CreditDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;
}
