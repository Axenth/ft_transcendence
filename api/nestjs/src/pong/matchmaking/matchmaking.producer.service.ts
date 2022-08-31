import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class MatchmakingProducerService {
  constructor(@InjectQueue('matchmaking-queue') private queue: Queue) {}

  async sendMatch(message: string) {
    await this.queue.add('matchmaking-job', {
      text: message,
    });
  }

  async sendMatchFromUser() {
    await this.queue.add('matchmakingFromUser-job');
  }

  async sendMatchChallenge( challengeUserDto: any ) {
    await this.queue.add('matchmakingChallenge-job', challengeUserDto);
  }

  async sendMatchChallengeLoop( challengeUserDto: any ) {
    await this.queue.add('matchmakingChallengeLoop-job', challengeUserDto);
  }
}
