import { Module } from '@nestjs/common';
import { ChatModule } from 'src/chat/chat.module';
import { ChatService } from 'src/chat/chat.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FriendListController } from './friendlist.controller';
import { FriendListGateway } from './friendlist.gateway';
import { FriendListService } from './friendlist.service';

@Module({
  controllers: [FriendListController],
  providers: [FriendListService, FriendListGateway],
  imports: [PrismaModule, ChatModule],
  exports: [FriendListGateway],
})
export class FriendListModule {}
