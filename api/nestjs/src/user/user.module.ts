import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PongModule } from '../pong/pong.module';
import { ChatModule } from '../chat/chat.module';
import { FriendListModule } from '../friendlist/friendlist.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [PrismaModule, AuthModule, PongModule, ChatModule, FriendListModule],
})
export class UserModule {}
