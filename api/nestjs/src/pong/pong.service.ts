import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchResult } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class PongService {
  constructor(private prisma: PrismaService) {}

  async updateScores(
    playerOneNickname: string,
    playerOneScore: number,
    playerTwoNickname: string,
    playerTwoScore: number,
  ) {
    try {
      const playerOne = await this.prisma.user.findUnique({
        where: {
          nickname: playerOneNickname,
        },
      });
      const playerTwo = await this.prisma.user.findUnique({
        where: {
          nickname: playerTwoNickname,
        },
      });
      let result: MatchResult;
      let achievements: string[] = new Array<string>();

      // After we have access to both players, their scores, and the result below,
      // we add conditions for achievements related to scores
      if (playerOneScore === playerTwoScore) {
        result = 'TIE';
      } else if (playerOneScore > playerTwoScore) {
        result = 'WINNER';
      } else if (playerOneScore < playerTwoScore) {
        result = 'LOSER';
      }
      const playerOneMatch = await this.prisma.matchHistory.create({
        data: {
          against: playerTwo.nickname,
          playerScore: playerOneScore,
          enemyScore: playerTwoScore,
          result: result,
          playerId: playerOne.id,
        },
      });
      if (result !== 'TIE') {
        if (result === 'WINNER' && playerOne.wins + 1 === 5) {
          achievements.push('wiener');
        }
        if (result === 'WINNER' && playerOne.wins + 1 === 10) {
          achievements.push('l33tPonger');
        }
        if (result === 'LOSER' && playerOne.losses + 1 === 5) {
          achievements.push('n00bLoser');
        }
        if (result === 'LOSER' && playerOne.losses + 1 === 10) {
          achievements.push('proLoser');
        }
        if (playerOne.wins + playerOne.losses + 1 === 20) {
          achievements.push('noLife');
        }
        if (achievements.length > 0) {
          //console.log('achievements length: ', achievements.length);
          //console.log('achievements:', achievements);
          await this.prisma.user.update({
            where: {
              nickname: playerOneNickname,
            },
            data: {
              wins: result === 'WINNER' ? playerOne.wins + 1 : playerOne.wins,
              losses:
                result === 'LOSER' ? playerOne.losses + 1 : playerOne.losses,
              achievements: {
                push: [...achievements],
              },
            },
          });
        } else {
          await this.prisma.user.update({
            where: {
              nickname: playerOneNickname,
            },
            data: {
              wins: result === 'WINNER' ? playerOne.wins + 1 : playerOne.wins,
              losses:
                result === 'LOSER' ? playerOne.losses + 1 : playerOne.losses,
            },
          });
        }
      }


      achievements.splice(0,achievements.length);
      if (playerOneScore === playerTwoScore) {
        result = 'TIE';
      } else if (playerTwoScore > playerOneScore) {
        result = 'WINNER';
      } else if (playerTwoScore < playerOneScore) {
        result = 'LOSER';
      }
      const playerTwoMatch = await this.prisma.matchHistory.create({
        data: {
          against: playerOne.nickname,
          playerScore: playerTwoScore,
          enemyScore: playerOneScore,
          result: result,
          playerId: playerTwo.id,
        },
      });
      if (result !== 'TIE') {

        if (result === 'WINNER' && playerTwo.wins + 1 === 5) {
          achievements.push('wiener');
        }
        if (result === 'WINNER' && playerTwo.wins + 1 === 10) {
          achievements.push('l33tPonger');
        }
        if (result === 'LOSER' && playerTwo.losses + 1 === 5) {
          achievements.push('n00bLoser');
        }
        if (result === 'LOSER' && playerTwo.losses + 1 === 10) {
          achievements.push('proLoser');
        }
        if (playerTwo.wins + playerTwo.losses + 1 === 20) {
          achievements.push('noLife');
        }
        if (achievements.length > 0) {
          //console.log('achievements length: ', achievements.length);
          //console.log('achievements:', achievements);
          await this.prisma.user.update({
            where: {
              nickname: playerTwoNickname,
            },
            data: {
              wins: result === 'WINNER' ? playerTwo.wins + 1 : playerTwo.wins,
              losses:
                result === 'LOSER' ? playerTwo.losses + 1 : playerTwo.losses,
              achievements: {
                push: [...achievements],
              },
            },
          });
        } else {
          await this.prisma.user.update({
            where: {
              nickname: playerTwoNickname,
            },
            data: {
              wins: result === 'WINNER' ? playerTwo.wins + 1 : playerTwo.wins,
              losses:
                result === 'LOSER' ? playerTwo.losses + 1 : playerTwo.losses,
            },
          });
        }
      }
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError)
      {
        console.log('Prisma issue.');
      }
      //console.log('Error trying to updateScores in PongService');
      //console.log(e);
    }
  }
}
