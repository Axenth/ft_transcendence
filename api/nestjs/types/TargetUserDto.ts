import { IsNotEmpty, IsString, IsAlphanumeric, Length } from "class-validator";

export class TargetUserDto {
  @IsNotEmpty()
  @IsString()
  @IsAlphanumeric()
  @Length(3, 15)
  target: string;
}
