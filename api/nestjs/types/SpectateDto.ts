import { IsNotEmpty, IsString, IsAlphanumeric, Length } from "class-validator";

export class SpectateDto {
  @IsNotEmpty()
  @IsString()
  @IsAlphanumeric()
  @Length(3, 15)
  username: string;
  @IsNotEmpty()
  @IsString()
  socketId;
  @IsNotEmpty()
  @IsString()
  @IsAlphanumeric()
  @Length(3, 15)
  otherUsername: string;
}
