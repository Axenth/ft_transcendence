import { IsNotEmpty, IsString, IsAlphanumeric, Length } from 'class-validator';

export class CreateRoomDto
{
    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    @Length(3, 15)
    roomid: string;
    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    @Length(3, 15)
    user: string;
    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    roomtype: string;
    @IsString()
    password: string;
}