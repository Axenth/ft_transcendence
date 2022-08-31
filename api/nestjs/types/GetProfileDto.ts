import { IsNotEmpty, IsString, IsAlphanumeric, Length } from 'class-validator';

export class GetProfileDto
{
    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    @Length(3, 15)
    nickname: string;
}