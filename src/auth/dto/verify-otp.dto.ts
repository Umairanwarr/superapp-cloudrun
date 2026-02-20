import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
    @IsEmail()
    email: String;

    @IsString()
    @Length(6, 6)
    otp: String;
}
