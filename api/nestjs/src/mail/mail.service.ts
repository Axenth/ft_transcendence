import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUserConfirmation(email: string, code: string) {

    await this.mailerService.sendMail({
      to: email,
      from: 'ftponghenk@gmail.com',
      subject: '2FA code',
      text: code,
    });
  }
}