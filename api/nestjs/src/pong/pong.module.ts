import { Module, Global } from '@nestjs/common';
import { PongService } from './pong.service';
import { PongGateway } from './pong.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import {MatchmakingConsumer} from "./matchmaking/matchmaking.consumer";
import {MatchmakingProducerService} from "./matchmaking/matchmaking.producer.service";
import {BullModule} from "@nestjs/bull";
import { ChatModule } from '../chat/chat.module';

@Global()
@Module({
  providers: [
    PongGateway,
    PongService,
    MatchmakingProducerService,
    MatchmakingConsumer,
  ],
  imports: [ChatModule, PrismaModule, JwtModule.register({}), BullModule.forRoot({
    redis: {
      host: process.env.REDIS_CONTAINER_NAME,
      port: 6379,
      maxRetriesPerRequest: null,
    },
  }),
    BullModule.registerQueue({
      name: 'matchmaking-queue',
    }),],
  exports: [MatchmakingConsumer],
})
export class PongModule {}
