import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { MatchmakingProducerService } from './matchmaking.producer.service';
import { PongGateway } from '../pong.gateway';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {PrismaService} from "../../prisma/prisma.service";
import {ChatService} from "../../chat/chat.service";

enum ladder {
  NEW_PLAYER,
  IRON,
  BRONZE,
  SILVER,
  PLATINUM,
  DIAMOND,
}

interface User {
  nickname: string;
  socketID: string;
  wins: number;
  matchAttempts: number; // NOTE: This should propably be fairly big as otherwise it might go straight to all ladders
}

interface Match {
  player1: User;
  player2: User;
}

interface challenge {
  challenger: string;
  challengerPongId: string;
  target: string;
  targetPongId?: string,
  accepted: boolean;
  timeStamp: number;
};

var MatchMakingLobby = new Array<User>();
var isRunning: boolean = false;

class HandleMatchEvent {
  constructor(private param: { payload: { msg: string } }) {}
  getMsg() {
    return this.param.payload.msg;
  }
}

class HandleChallengeEvent {
  constructor(private param: { payload: { challenger: string, target: string, timeStamp: number } }) {}
  getChallenger() {
    return this.param.payload.challenger;
  }
  getTarget() {
    return this.param.payload.target;
  }
  getTimeStamp() {
    return this.param.payload.timeStamp;
  }
}

class HandleChallengerErrorEvent {
  constructor(private param: { payload: { challengerPongId: string, msg: string } }) {}
  getChallengerPongId() {
    return this.param.payload.challengerPongId;
  }
  getErrorMsg() {
    return this.param.payload.msg;
  }
}

@Injectable()
@Processor('matchmaking-queue')
export class MatchmakingConsumer {
  private challengeList: Array<challenge>;
  constructor(
    private configService: ConfigService,
    private bullService: MatchmakingProducerService,
    private eventEmitter: EventEmitter2,
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {
    this.challengeList = new Array<challenge>();
  }

  @Process('matchmaking-job')
  matchmakingJob(job: Job<{ text: string }>) {
    console.log('job.data -> ', job.data);
    let parts = job.data.text.split(' ');

    let user: User = {
      nickname: parts[1],
      socketID: parts[2],
      wins: parseInt(parts[3]),
      matchAttempts: 0,
    };

    // find user nickname in lobby
    for (let i: number = 0; i < MatchMakingLobby.length; i++) {
      if (MatchMakingLobby[i].nickname == user.nickname) {
        console.log('User already in matchmaking');
        return;
      }
    }

    MatchMakingLobby.push(user);
    console.log(`user: ${user.nickname} added to lobby`);
    if (isRunning === false) this.MatchMakingFromUser();
  }

  emitChallengeError(socketId: string, msg: string)
  {
    this.eventEmitter.emit(
        'challenge.error',
        new HandleChallengerErrorEvent({
          payload: {
            challengerPongId: socketId,
            msg: msg,
          },
        }),
    );
  }

  emitChallengeErrorChat(socketId: string, msg: string)
  {
    this.eventEmitter.emit(
        'challenge.error.chat',
        new HandleChallengerErrorEvent({
          payload: {
            challengerPongId: socketId,
            msg: msg,
          },
        }),
    );
  }

  checkIfChallenging(pongSocketId: string): boolean
  {
    let i: number = 0;
    for (i=0;i < this.challengeList.length;i++)
    {
      if (this.challengeList[i].challengerPongId === pongSocketId)
      {
        return true;
      }
    }
    return false;
  }

  @Process('matchmakingChallenge-job')
  async matchmakingChallengeJob(job: Job<any>) {
    // CHECK IF TARGET USER IS NOT IN GAME
    const user = await this.prisma.user.findUnique({
      where: {
        nickname: job.data.target,
      },
    });
    if (!user || user.status !== 'ONLINE')
    {
      // define error ir target isn't found or is not online or unavailable
      console.log('Target not found or status not online');
      this.emitChallengeError(job.data.socketId, `The player [${job.data.target} is not available or doesn't exist!]`);
      return ;
    }
    console.log(`Target found and online [${job.data.target}] `);
    let i: number = 0;

    // CHECK IF THE USER IS IN MATCHMAKING MODE!
    // find user nickname in lobby
    for (i = 0; i < MatchMakingLobby.length; i++) {
      if (MatchMakingLobby[i].nickname === job.data.target || MatchMakingLobby[i].nickname === job.data.username) {
        console.log('User already in matchmaking');
        this.emitChallengeError(job.data.socketId, `In matchmaking mode!`);
        return;
      }
    }

    for (i=0;i < this.challengeList.length;i++)
    {
      // CHECK IF USER ALREADY IS IN HERE BEING CHALLENGED BY THE SAME PERSON
      if (this.challengeList[i].target === job.data.username && this.challengeList[i].challenger === job.data.target)
      {
        console.log('Target already invited challenger.. match starting soon');
        this.challengeList[i] = { ...this.challengeList[i], targetPongId: job.data.socketId, accepted: true, };
        return ;
      }
      // CHECK IF CHALLENGER IS ALREADY CHALLENGING SOMEONE OR BEING CHALLENGED BY SOMEONE
      if (this.challengeList[i].challenger === job.data.username || this.challengeList[i].target === job.data.username)
      {
        // Define error msg for modal
        this.emitChallengeError(job.data.socketId, 'You are currently busy!');
        console.log(`Challenger[${job.data.username}] is already challenging or being challenged`);
        return ;
      }
      // CHECK IF THE TARGET USER IS ALREADY BEING CHALLENGED OR CHALLENGING SOMEONE ELSE
      if (this.challengeList[i].target === job.data.target || this.challengeList[i].challenger === job.data.target)
      {
        // DEFINE WHAT HAPPENS IF USER IS ALREADY IN INVIDATION MODE
        this.emitChallengeError(job.data.socketId, `The player [${job.data.target} is currently busy with another request!]`);
        console.log(`User being challenged ${job.data.target} is already being challenged or challenging someone`);
        return ;
      }
    }

    let newChallenge = {
      challenger: job.data.username,
      challengerPongId: job.data.socketId,
      target: job.data.target,
      accepted: false,
      timeStamp: Date.now(),
    };
    console.log(newChallenge);
    this.challengeList.push(newChallenge);

    // Send event with challenge request to gateway
    this.eventEmitter.emit(
        'challenge.request',
        new HandleChallengeEvent({
          payload: {
            challenger: newChallenge.challenger,
            target: newChallenge.target,
            timeStamp: newChallenge.timeStamp,
          },
        }),
    );
    // LOOP INTO CHECK FOR ACCEPTED
    setTimeout( () => {
    this.bullService.sendMatchChallengeLoop({challenger: newChallenge.challenger, target: newChallenge.target})}, 1000);
  }

  @Process('matchmakingChallengeLoop-job')
  matchMakingChallengeLoopJob(job: Job<any>){
    let i: number;
    for (i=0;i<this.challengeList.length;i++)
    {
      if (this.challengeList[i].challenger === job.data.challenger && this.challengeList[i].target === job.data.target)
      {
        // CHECK IF TIME IS UP
        if ((Date.now() - this.challengeList[i].timeStamp) > 25000)
        {
          //console.log(`TIMEOUT FOR ${this.challengeList[i].challenger} -> ${this.challengeList[i].target} CHALLENGE INVITE`);
          this.emitChallengeError(this.challengeList[i].challengerPongId, `Player [${this.challengeList[i].target}] didn't respond or declined.`);
          let targetChatId: string = this.chatService.getUserSocket(this.challengeList[i].target);
          if (targetChatId)
          {
            console.log('Finds targetChatId: ', targetChatId);
            this.emitChallengeErrorChat((this.chatService.getUserSocket(this.challengeList[i].target)), 'Timeout');
          }
          this.emitChallengeError(this.challengeList[i].challengerPongId, `Player [${this.challengeList[i].target}] didn't respond or declined.`);
          this.challengeList.splice(i, 1);
          return ;
        }
        else if(this.challengeList[i].accepted === true)
        {
          // DEFINE WHAT HAPPENS IF USER ACCEPTED MATCH
          let challenger: string = this.challengeList[i].challenger;
          let challengerPongId: string = this.challengeList[i].challengerPongId;
          let target: string = this.challengeList[i].target;
          let targetPongId: string = this.challengeList[i].targetPongId;
          this.challengeList.splice(i, 1);
          this.eventEmitter.emit(
              'match.created',
              new HandleMatchEvent({
                payload: {
                  msg: `MATCH ${challenger} ${challengerPongId} ${target} ${targetPongId}`,
                },
              }),
          );
          return ;
        }
      }
    }
    setTimeout( () => {
      this.bullService.sendMatchChallengeLoop({challenger: job.data.challenger, target: job.data.target})}, 1000);
  }


  @Process('matchmakingFromUser-job')
  matchmakingFromUserJob(job: Job<void>) {
    let MatchFound: boolean = false;
    let res: Match = null;
    let searchTop: ladder;
    let searchLower: ladder;

    let i: number = 0;
    let j: number = 0;

    // if (matchMakingSocket.disconnected === true)
    // {
    //     while (matchMakingSocket.disconnected === true)
    //     {
    //         matchMakingSocket.connect();
    //         console.log("Socket is currently disconnected attempting reconnect");
    //     }
    // }

    for (; i < MatchMakingLobby.length; i++) {
      let temp: User = MatchMakingLobby[i];
      let tempLadder: ladder = this.calculateLadder(temp);

      // NOTE: I HATE having to use if's here but it's proven to be the fastest method, switch-range is aobut 1.6-38 times slower :(
      if (temp.matchAttempts < 100) {
        searchTop = tempLadder;
        searchLower = tempLadder;
      } else if (temp.matchAttempts < 300) {
        searchTop < 5 ? (searchTop = tempLadder + 1) : (searchTop = 5);
        searchLower > 0 ? (searchLower = tempLadder - 1) : (searchLower = 0);
      } else if (temp.matchAttempts < 700) {
        searchTop < 5 ? (searchTop = tempLadder + 2) : (searchTop = 5);
        searchLower > 0 ? (searchLower = tempLadder - 2) : (searchLower = 0);
      } else if (temp.matchAttempts < 1200) {
        searchTop < 5 ? (searchTop = tempLadder + 3) : (searchTop = 5);
        searchLower > 0 ? (searchLower = tempLadder - 3) : (searchLower = 0);
      } else if (temp.matchAttempts < 2000) {
        searchTop < 5 ? (searchTop = tempLadder + 4) : (searchTop = 5);
        searchLower > 0 ? (searchLower = tempLadder - 4) : (searchLower = 0);
      } else if (temp.matchAttempts < 3000) {
        searchTop < 5 ? (searchTop = tempLadder + 5) : (searchTop = 5);
        searchLower > 0 ? (searchLower = tempLadder - 5) : (searchLower = 0);
      }

      for (j = 0; j < MatchMakingLobby.length; j++) {
        let temp2: User = MatchMakingLobby[j];
        let temp2Ladder: ladder = this.calculateLadder(temp2);
        if (temp.nickname === temp2.nickname) continue;
        if (tempLadder <= searchTop && tempLadder >= searchLower) {
          res = { player1: temp, player2: temp2 };
          MatchFound = true;
          break;
        }
        temp.matchAttempts = temp.matchAttempts + 1;
        if (MatchFound === true) break;
      }
      if (res !== null) {
        if (i > j) {
          MatchMakingLobby.splice(i, 1);
          MatchMakingLobby.splice(j, 1);
        } else {
          MatchMakingLobby.splice(j, 1);
          MatchMakingLobby.splice(i, 1);
        }
        console.log(
          `Match found: ${res.player1.nickname} (${res.player1.socketID}) vs ${res.player2.nickname} (${res.player2.socketID})`,
        );
        break;
      }
    }
    if (MatchMakingLobby.length > 1) {
      this.bullService.sendMatchFromUser();
      isRunning = true;
    } else if (MatchMakingLobby.length <= 1) isRunning = false;

    if (MatchFound) {
      //this.server.emit(`match`, "test");
      console.log('sending match');
      //matchMakingSocket.emit('match', `MATCH ${res.player1.nickname} ${res.player1.socketID} ${res.player2.nickname} ${res.player2.socketID}`);
      //this.pongGateway.handleMatch(`MATCH ${res.player1.nickname} ${res.player1.socketID} ${res.player2.nickname} ${res.player2.socketID}`);
      this.eventEmitter.emit(
        'match.created',
        new HandleMatchEvent({
          payload: {
            msg: `MATCH ${res.player1.nickname} ${res.player1.socketID} ${res.player2.nickname} ${res.player2.socketID}`,
          },
        }),
      );
    }
  }

  // REMOVE USERNAME
  handleRemove(message: string): void {
    let parts = message.split(' ');

    let i = 0;
    for (; i < MatchMakingLobby.length; i++) {
      if (MatchMakingLobby[i].socketID === parts[1]) {
        break;
      }
    }
    if (i === MatchMakingLobby.length) return;
    MatchMakingLobby.splice(i, 1);
    console.log(`user: ${parts[1]} removed from lobby`);
  }

  calculateLadder(user: User): ladder {
    if (user.wins > 1) return ladder.BRONZE;
    else if (user.wins > 2) return ladder.IRON;
    else if (user.wins > 5) return ladder.SILVER;
    else if (user.wins > 10) return ladder.PLATINUM;
    else if (user.wins > 15) return ladder.DIAMOND;
    return ladder.NEW_PLAYER;
  }

  MatchMakingFromUser(): void {
    let MatchFound: boolean = false;
    let res: Match = null;
    let searchTop: ladder;
    let searchLower: ladder;

    let i: number = 0;
    let j: number = 0;

    // if (matchMakingSocket.disconnected === true)
    // {
    //     while (matchMakingSocket.disconnected === true)
    //     {
    //         matchMakingSocket.connect();
    //         console.log("Socket is currently disconnected attempting reconnect");
    //     }
    // }

    for (; i < MatchMakingLobby.length; i++) {
      let temp: User = MatchMakingLobby[i];
      let tempLadder: ladder = this.calculateLadder(temp);

      // NOTE: I HATE having to use if's here but it's proven to be the fastest method, switch-range is aobut 1.6-38 times slower :(
      if (temp.matchAttempts < 100) {
        searchTop = tempLadder;
        searchLower = tempLadder;
      } else if (temp.matchAttempts < 300) {
        searchTop < 5 ? (searchTop = tempLadder + 1) : (searchTop = 5);
        searchLower > 0 ? (searchLower = tempLadder - 1) : (searchLower = 0);
      } else if (temp.matchAttempts < 700) {
        searchTop < 5 ? (searchTop = tempLadder + 2) : (searchTop = 5);
        searchLower > 0 ? (searchLower = tempLadder - 2) : (searchLower = 0);
      } else if (temp.matchAttempts < 1200) {
        searchTop < 5 ? (searchTop = tempLadder + 3) : (searchTop = 5);
        searchLower > 0 ? (searchLower = tempLadder - 3) : (searchLower = 0);
      } else if (temp.matchAttempts < 2000) {
        searchTop < 5 ? (searchTop = tempLadder + 4) : (searchTop = 5);
        searchLower > 0 ? (searchLower = tempLadder - 4) : (searchLower = 0);
      } else if (temp.matchAttempts < 3000) {
        searchTop < 5 ? (searchTop = tempLadder + 5) : (searchTop = 5);
        searchLower > 0 ? (searchLower = tempLadder - 5) : (searchLower = 0);
      }

      for (j = 0; j < MatchMakingLobby.length; j++) {
        let temp2: User = MatchMakingLobby[j];
        let temp2Ladder: ladder = this.calculateLadder(temp2);
        if (temp.nickname === temp2.nickname) continue;
        if (tempLadder <= searchTop && tempLadder >= searchLower) {
          res = { player1: temp, player2: temp2 };
          MatchFound = true;
          break;
        }
        temp.matchAttempts = temp.matchAttempts + 1;
        if (MatchFound === true) break;
      }
      if (res !== null) {
        if (i > j) {
          MatchMakingLobby.splice(i, 1);
          MatchMakingLobby.splice(j, 1);
        } else {
          MatchMakingLobby.splice(j, 1);
          MatchMakingLobby.splice(i, 1);
        }
        console.log(
          `Match found: ${res.player1.nickname} (${res.player1.socketID}) vs ${res.player2.nickname} (${res.player2.socketID})`,
        );
        break;
      }
    }
    if (MatchMakingLobby.length > 1) {
      this.bullService.sendMatchFromUser();
      isRunning = true;
    } else if (MatchMakingLobby.length <= 1) isRunning = false;

    if (MatchFound) {
      //this.server.emit(`match`, "test");
      console.log('sending match');
      //matchMakingSocket.emit('match', `MATCH ${res.player1.nickname} ${res.player1.socketID} ${res.player2.nickname} ${res.player2.socketID}`);
      //this.pongGateway.handleMatch(`MATCH ${res.player1.nickname} ${res.player1.socketID} ${res.player2.nickname} ${res.player2.socketID}`);
      this.eventEmitter.emit(
        'match.created',
        new HandleMatchEvent({
          payload: {
            msg: `MATCH ${res.player1.nickname} ${res.player1.socketID} ${res.player2.nickname} ${res.player2.socketID}`,
          },
        }),
      );
    }
  }

  async handleChatMatchmakingCheck(message: string): Promise<string> {
    let parts: string[] = message.split(' ');
    let username: string = parts[0];
    let socketid: string = parts[1];

    // loop trough lobby
    for (let i: number = 0; i < MatchMakingLobby.length; i++) {
      if (MatchMakingLobby[i].nickname === username) {
        // matchMakingSocket.emit('chat-matchmaking-check', `OK ${username} ${socketid}`);
        return `OK ${username} ${socketid}`;
      }
    }
    // matchMakingSocket.emit('chat-matchmaking-check', `KO ${username} ${socketid}`);
    return `KO ${username} ${socketid}`;
  }
}
