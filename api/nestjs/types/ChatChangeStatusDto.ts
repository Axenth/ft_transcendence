import { IsNotEmpty, IsString, IsAlphanumeric, Length } from 'class-validator';

export class ChatChangeStatusDto
{
    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    @Length(3, 15)
    user: string;
    @IsNotEmpty()
    @IsString()
    status: string;
}