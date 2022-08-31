import { IsNotEmpty, IsString, IsAlphanumeric, Length } from "class-validator";

export class SendMsgDto {
  @IsNotEmpty()
  @IsString()
  message: string;
  @IsNotEmpty()
  @IsString()
  @IsAlphanumeric()
  @Length(3, 15)
  user: string;
}
