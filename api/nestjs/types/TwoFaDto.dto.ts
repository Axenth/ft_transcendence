import { IsNotEmpty, IsString } from 'class-validator';

export class TwoFaDto
{
    @IsNotEmpty()
    @IsString()
    otp: string;
}