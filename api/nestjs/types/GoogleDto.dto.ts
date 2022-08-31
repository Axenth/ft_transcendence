import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleDto
{
    @IsNotEmpty()
    @IsString()
    token: string;
}