import { IsNotEmpty, IsString, IsAlphanumeric, Length } from "class-validator";

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  @IsAlphanumeric()
  @Length(3, 15)
  roomId: string;
  @IsString()
  password: string;
  @IsNotEmpty()
  @IsString()
  @IsAlphanumeric()
  @Length(3, 15)
  user: string;
}
