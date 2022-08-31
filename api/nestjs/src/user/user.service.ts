import {
  ForbiddenException,
  HttpException,
  Injectable,
  HttpStatus,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { AuthService } from 'src/auth/auth.service';
import { MatchmakingConsumer } from '../pong/matchmaking/matchmaking.consumer';
import {ChatService} from '../chat/chat.service';
import {FriendListGateway} from '../friendlist/friendlist.gateway';
import {ConfigService} from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private matchmaking: MatchmakingConsumer,
    private chatService: ChatService,
    private config: ConfigService,
    private friendlist: FriendListGateway,
  ) {}

  async setNick(nickname: string, id: number) {
    console.log(`nickname: ${nickname} | id: ${id} `);

    try {
      const user: User = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      if (user) {
        let oldNickname: string = user.nickname;
        //console.log('Attempting to update isNickSet to true');
        await this.prisma.user.update({
          where: {
            id: id,
          },
          data: {
            nickname: nickname,
            isNickSet: true,
          },
        });
        // chatService function that replaces joined rooms with correct nickname
        this.chatService.patchUserNickname(oldNickname, nickname);
        this.friendlist.updateFriendList();
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
        if (error.code === 'P2002')
        {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
        }
      }
      //console.log('Error in setNick() provider');
      throw error;
    }
  }

  async changeAvatar(id: number, file: any) {
    try {
      let user: User = await this.prisma.user.findUnique({ where: { id: id } });
      if (user) {
        if (user.achievements.includes('missPersonality')) {
          user = await this.prisma.user.update({
            where: {
              id: id,
            },
            data: {
              customAvatar: `${process.env.BACKEND_URL}/srcs/users/${file.filename}`,
            },
          });
          console.log(
            `Changed customAvatar for ${user.nickname}, missPersonality award was already given`,
          );
        } else {
          user = await this.prisma.user.update({
            where: {
              id: id,
            },
            data: {
              customAvatar: `${process.env.BACKEND_URL}/srcs/users/${file.filename}`,
              achievements: {
                push: 'missPersonality',
              },
            },
          });
          console.log(
            `Changed customAvatar for ${user.nickname}, added missPersonality achievements`,
          );
        }
        return {
          avatar: user.customAvatar ? user.customAvatar : user.defaultAvatar,
        };
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('Error trying to change avatar:');
      //console.log(error);
      throw error;
    }
  }

  async removeAvatar(id: number) {
    try {
      const user: User = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      if (!user) {
        throw new ForbiddenException('user not found');
      } else {
        await this.prisma.user.updateMany({
          where: {
            id: id,
            customAvatar: {
              not: null,
            },
          },
          data: {
            customAvatar: null,
          },
        });
        console.log(`Successfully removed avatar for ${user.nickname}`);
        return { avatar: user.defaultAvatar };
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('Error trying to remove avatar:');
      //console.log(error);
      throw error;
    }
  }

  async settings(id: number) {
    try {
      const user: User = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      if (!user) {
        throw new ForbiddenException('user not found');
      } else {
        return {
          nickname: user.nickname,
          email: user.email,
          avatar: user.customAvatar ? user.customAvatar : user.defaultAvatar,
          twoFactorAuth: user.twoFactorAuth,
        };
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('Error trying to get settings:');
      //console.log(error);
      throw error;
    }
  }

  async getprofile(id: number) {
    try {
      // Grabbing User by id.
      const user: User = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });

      // Shouldn't happen because we don't allow user deletion, but just in case we check if user is found.
      if (!user) {
        throw new ForbiddenException('User not found.');
      } else {
        // If a nickname hasn't been set, throw weird exception.
        if (user.isNickSet === false) {
          throw new HttpException('nickname not set', 318);
        }
        const matches = await this.prisma.matchHistory.findMany({
          where: {
            playerId: id,
          },
        });
        // Return relevant data to user for homepage
        return {
          email: user.email,
          nickname: user.nickname,
          avatar: user.customAvatar ? user.customAvatar : user.defaultAvatar,
          wins: user.wins,
          losses: user.losses,
          matches: matches,
          achievements: user.achievements,
        };
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('Error in getprofile() provider:');
      //console.log(error);
      throw error;
    }
  }

  async getprofilebynick(nickname: string) {
    try {
      // Grabbing User by id.
      const user: User = await this.prisma.user.findFirst({
        where: {
          nickname: nickname,
        },
      });

      // Shouldn't happen because we don't allow user deletion, but just in case we check if user is found.
      if (!user) {
        throw new ForbiddenException('User not found.');
      } else {
        const matches = await this.prisma.matchHistory.findMany({
          where: {
            playerId: user.id,
          },
        });
        // Return relevant data to user for homepage
        return {
          email: user.email,
          status: user.status,
          nickname: user.nickname,
          avatar: user.customAvatar ? user.customAvatar : user.defaultAvatar,
          wins: user.wins,
          losses: user.losses,
          matches: matches,
          achievements: user.achievements,
        };
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('Error in getprofile() provider:');
      //console.log(error);
      throw error;
    }
  }

  async getmatchmakingcheck(id: number) {
    try {
      const user: User = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });

      let answer: string;
      let answerParts: string[];
      if (user) {
        answer = await this.matchmaking.handleChatMatchmakingCheck(
          `${user.nickname}`,
        );
        answerParts = answer.split(' ');
      }
      if (answerParts[0] === 'OK') {
        return { inMatchmaking: true };
      } else if (answerParts[0] === 'KO') {
        return { inMatchmaking: false };
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError)
      {
          throw new HttpException("woops", HttpStatus.BAD_REQUEST);
      }
      //console.log('Error in getmatchmakingcheck() provider:');
      //console.log(error);
      throw error;
    }
  }
}
