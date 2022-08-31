import { IsNotEmpty, IsString, IsAlphanumeric, Length } from "class-validator";

export class JoinRoomDto {
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
  password: string | undefined;
}
