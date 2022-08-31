import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  providers: [ChatGateway, ChatService],
  imports: [PrismaModule, JwtModule.register({})],
  exports: [ChatService],
})

export class ChatModule {}
