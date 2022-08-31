import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { join } from 'path';

@Module({
    imports: [
      MailerModule.forRoot({
        transport: {
          host: `${process.env.SENDGRID_HOST}`,
          auth: {
            user: `${process.env.SENDGRID_USER}`,
            pass: `${process.env.SENDGRID_PASS}`,
          },
        },
      }),
    ],
    providers: [MailService],
    exports: [MailService], // 👈 export for DI
  })
  export class MailModule {}