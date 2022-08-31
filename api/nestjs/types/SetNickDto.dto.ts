import { IsNotEmpty, IsString, IsAlphanumeric, Length } from 'class-validator';

export class SetNickDto
{
    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    @Length(3, 15)
    nickname: string;
}