import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { User } from "@prisma/client";
import {
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from "@nestjs/websockets";
import { Socket } from "socket.io";

import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { match } from "assert";
import { io } from "socket.io-client";
import { JwtService } from "@nestjs/jwt";
import { PongService } from "./pong.service";
import { MatchmakingProducerService } from "./matchmaking/matchmaking.producer.service";
import { MatchmakingConsumer } from "./matchmaking/matchmaking.consumer";
import { OnEvent } from "@nestjs/event-emitter";
import { ChatService } from "../chat/chat.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { SpectateDto } from "../../types/SpectateDto";

class HandleMatchEvent {
  constructor(private param: { payload: { msg: string } }) {}
  getMsg() {
    return this.param.payload.msg;
  }
}

class HandleChallengerErrorEvent {
  constructor(
    private param: { payload: { challengerPongId: string; msg: string } }
  ) {}
  getChallengerPongId() {
    return this.param.payload.challengerPongId;
  }
  getErrorMsg() {
    return this.param.payload.msg;
  }
}

interface coordinates {
  x: number;
  y: number;
}

interface specatator {
  username: string;
  socket: string;
}

interface room {
  id: string;
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  ballPosX: number;
  ballPosY: number;
  ballVelX: number;
  ballVelY: number;
  player1PosX: number;
  player1PosY: number;
  player2PosX: number;
  player2PosY: number;
  player1Socket: string;
  player2Socket: string;
  spectators: Array<specatator>;
  gameStarted: boolean;
  timeSinceLastScore: number;
}

enum ladder {
  NEW_PLAYER,
  IRON,
  BRONZE,
  SILVER,
  PLATINUM,
  DIAMOND,
}

interface Match {
  player1: string;
  player2: string;
}

var rooms: Array<room> = new Array<room>();

function generateID(): string {
  let values = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  let idLen: number = 3;
  let result: string = "";
  while (idLen--) {
    result = result + values.charAt(Math.random() * values.length);
  }
  return result;
}

@Injectable()
@WebSocketGateway(3003, {
  cors: {
    origin: "*",
  },
})
export class PongGateway implements OnGatewayDisconnect {
  constructor(
    private pongService: PongService,
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
    private bullService: MatchmakingProducerService,
    private matchMaking: MatchmakingConsumer,
    private chatService: ChatService
  ) {}

  @WebSocketServer()
  server;

  private disconnect(socket: Socket) {
    socket.emit("Error: ", new UnauthorizedException());
    socket.disconnect();
  }

  async extractToken(socket: Socket): Promise<string> {
    const token: string = socket.handshake.headers.authorization.replace(
      "Bearer ",
      ""
    );
    return token;
  }

  // Function force called on each connection
  async handleConnection(socket: Socket) {
    try {
      const token: string = await this.extractToken(socket);
      const decodedToken: any = await this.jwt.verifyAsync(token, {
        secret: process.env.REFRESH_TOKEN_SECRET,
        ignoreExpiration: true,
      });
      if (!decodedToken || decodedToken.auth === false) {
        //   return this.disconnect(socket);
      }

      const user: User = await this.prisma.user.findUnique({
        where: {
          id: decodedToken.sub,
        },
      });

      // Token is valid.. define behaviour for when user connects with socket.
      const userId: number = decodedToken.sub;
      console.log(`New pong connection: ${decodedToken.email}[${userId}]`);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.log("Prisma issue.");
      }
    }
  }

  async handleDisconnect(client: Socket) {
    let i: number = 0;
    let arr: Array<number> = Array<number>();
    for (; i < rooms.length; i++) {
      if (rooms[i].player1Socket === client.id) {
        // player 1 is disconnected
        this.server
          .to(rooms[i].player2Socket)
          .emit("dc", `DISCONNECTED ${rooms[i].player1}`);
          this.updateProfile(
            rooms[i].player2,
            rooms[i].player1,
            rooms[i].score2,
            rooms[i].score1
          );
        //this.pongService.updateScores(
        //  rooms[i].player1,
        //  0,
        //  rooms[i].player2,
        //  rooms[i].score2,
        //);
        arr.push(i);
      } else if (rooms[i].player2Socket === client.id) {
        // player 2 is disconnected
        this.server
          .to(rooms[i].player1Socket)
          .emit("dc", `DISCONNECTED ${rooms[i].player2}`);
          this.updateProfile(
            rooms[i].player1,
            rooms[i].player2,
            rooms[i].score1,
            rooms[i].score2
          );
        //this.pongService.updateScores(
        //  rooms[i].player1,
        //  rooms[i].score1,
        //  rooms[i].player2,
        //  0,
        //);
        arr.push(i);
      } else {
        for (let k: number = 0; k < rooms[i].spectators.length; k++) {
          if (rooms[i].spectators[k].socket === client.id) {
            rooms[i].spectators.splice(k, 1);
            break;
          }
        }
      }
    }

    console.log("length of arr: ", arr.length);
    console.log("rooms before splice: ", rooms);
    for (i = 0; i < arr.length; i++) {
      rooms.splice(arr[i], 1);
    }
    console.log("rooms after splice: ", rooms);

    this.removeUserFromMatchmaking(client.id);
    const token: string = client.handshake.headers.authorization.replace(
      "Bearer ",
      ""
    );
    const decodedToken: any = await this.jwt.decode(token);
    if (decodedToken !== null) {
      const userId: number = decodedToken.sub;
      console.log(`Pong disconnection: ${decodedToken.email}[${userId}]`);
    }
    client.disconnect();
  }

  @SubscribeMessage("spectate")
  handleSpectate(@MessageBody() message: string): void {
    // SPECTATE ID USERNAME SOCKET

    let splitMsg: string[] = message.split(" ");
    let i: number = 0;
    for (; i < rooms.length; i++) {
      if (rooms[i].id === splitMsg[1]) {
        break;
      }
    }
    if (rooms[i] === undefined) {
      this.server.to(splitMsg[3]).emit("spectate", "SPECTATE_KO");
      return;
    }

    let spec: specatator = { username: "", socket: "" };

    spec.username = splitMsg[2];
    spec.socket = splitMsg[3];

    rooms[i].spectators.push(spec);

    // this.server.to(rooms[i].player1Socket).emit('spectate', `SPECTATE_OK ${rooms[i].id} ${rooms[i].player1} ${rooms[i].player2}`);
    // this.server.to(rooms[i].player2Socket).emit('spectate' , `SPECTATE_OK ${rooms[i].id} ${rooms[i].player1} ${rooms[i].player2}`);

    this.server
      .to(spec.socket)
      .emit("spectate", `SPECTATE_OK ${rooms[i].id} ${rooms[i].player2}`);

    if (rooms[i].gameStarted === true) {
      // if the game has already started make sure spectators start the game aswell
      this.server.to(spec.socket).emit("start", `START ${rooms[i].id}`);
    }

    // rooms[i].spectators.forEach(element => {
    // 	this.server.to(element.socket).emit('spectate', `SPECTATE_OK ${rooms[i].id}`);
    // })
  }

  @SubscribeMessage("start")
  handleStart(@MessageBody() message: string): void {
    // console.log(message);
    // this.server.emit('message', message);

    // START ID

    let splitMsg: string[] = message.split(" ");
    let i: number = 0;
    for (; i < rooms.length; i++) {
      if (rooms[i].id === splitMsg[1]) {
        break;
      }
    }
    if (rooms[i] === undefined) {
      return;
    }

    console.log("starting");

    this.server
      .to(rooms[i].player1Socket)
      .emit("start", `START ${rooms[i].id}`);
    this.server
      .to(rooms[i].player2Socket)
      .emit("start", `START ${rooms[i].id}`);

    rooms[i].spectators.forEach((element) => {
      this.server.to(element.socket).emit("start", `START ${rooms[i].id}`);
    });
    rooms[i].gameStarted = true;
  }

  @SubscribeMessage("score")
  async handleScore(@MessageBody() message: string) {
    // console.log(message);
    // this.server.emit('message', message);

    // SCORE GameID Username

    let splitMsg: string[] = message.split(" ");
    let i: number = 0;
    for (; i < rooms.length; i++) {
      if (rooms[i].id === splitMsg[1]) {
        break;
      }
    }
    if (rooms[i] === undefined) {
      return;
    }

    let scoreUsername: string;
    if (Date.now() / 1000 >= rooms[i].timeSinceLastScore / 1000 + 1) {
      rooms[i].timeSinceLastScore = Date.now();
      if (splitMsg[2] === rooms[i].player1) {
        rooms[i].score1 = rooms[i].score1 + 1;
        scoreUsername = rooms[i].player1; // la
      } else if (splitMsg[2] === rooms[i].player2) {
        rooms[i].score2 = rooms[i].score2 + 1;
        scoreUsername = rooms[i].player2;
      } else {
        // CHEATS!!!!
      }
      // console.log(`${rooms[i].score1} ${rooms[i].score2}`)

      let p1Score: number = rooms[i].score1;
      let p2Score: number = rooms[i].score2;

      console.log(`${p1Score} ${p2Score}`);

      if (p1Score >= 10 || p2Score >= 10) {
        if (p1Score >= 10) {
          this.updateProfile(
            rooms[i].player1,
            rooms[i].player2,
            rooms[i].score1,
            rooms[i].score2
          );
        } else if (p2Score >= 10) {
          this.updateProfile(
            rooms[i].player2,
            rooms[i].player1,
            rooms[i].score2,
            rooms[i].score1
          );
        }

        this.server.to(rooms[i].player1Socket).emit("game", `FINISHED`);
        this.server.to(rooms[i].player2Socket).emit("game", `FINISHED`);

        //await this.pongService.updateScores(
        //  rooms[i].player1,
        //  rooms[i].score1,
        //  rooms[i].player2,
        //  rooms[i].score2,
        //);

        if (rooms[i].spectators) {
          rooms[i].spectators.forEach((element) => {
            this.server.to(element.socket).emit("game", `FINISHED`);
          });
        }
        rooms.splice(i, 1);
        return;
      }

      this.server
        .to(rooms[i].player1Socket)
        .emit("score", `SCORE ${rooms[i].score1} ${rooms[i].score2}`);
      this.server
        .to(rooms[i].player2Socket)
        .emit("score", `SCORE ${rooms[i].score1} ${rooms[i].score2}`);

      rooms[i].spectators.forEach((element) => {
        this.server
          .to(element.socket)
          .emit("score", `SCORE ${rooms[i].score1} ${rooms[i].score2}`);
      });
    }
  }

  @SubscribeMessage("game")
  handleGame(@MessageBody() message: string): void {
    // console.log(message);
    // this.server.emit('message', message);

    // SCORE GameID SocketID

    let splitMsg: string[] = message.split(" ");
    let i: number = 0;
    for (; i < rooms.length; i++) {
      if (rooms[i].id === splitMsg[1]) {
        break;
      }
    }
    if (rooms[i] === undefined) {
      return;
    }

    if (splitMsg[0] === "BALLPOS") {
      let roomID: number = i;

      rooms[roomID].ballPosX = parseFloat(splitMsg[3]);
      rooms[roomID].ballPosY = parseFloat(splitMsg[4]);

      this.server
        .to(rooms[roomID].player2Socket)
        .emit(
          "game",
          `${rooms[roomID].id} ${rooms[roomID].ballPosX} ${rooms[roomID].ballPosY} ${rooms[roomID].player1PosX} ${rooms[roomID].player1PosY} ${rooms[roomID].player2PosX} ${rooms[roomID].player2PosY}`
        );

      rooms[i].spectators.forEach((element) => {
        this.server
          .to(element.socket)
          .emit(
            "game",
            `${rooms[roomID].id} ${rooms[roomID].ballPosX} ${rooms[roomID].ballPosY} ${rooms[roomID].player1PosX} ${rooms[roomID].player1PosY} ${rooms[roomID].player2PosX} ${rooms[roomID].player2PosY} ${rooms[roomID].score1} ${rooms[roomID].score2}`
          );
      });
    }
  }

  @SubscribeMessage("playerpos")
  handlePlayerPos(@MessageBody() message: string): void {
    // console.log(message);
    // this.server.emit('message', message);

    // SCORE GameID SocketID

    let splitMsg: string[] = message.split(" ");
    let i: number = 0;
    for (; i < rooms.length; i++) {
      if (rooms[i].id === splitMsg[1]) {
        break;
      }
    }
    if (rooms[i] === undefined) {
      return;
    }
    // console.log(message);

    if (splitMsg[2] === rooms[i].player1Socket) {
      rooms[i].player1PosY = parseFloat(splitMsg[3]);
    } else if (splitMsg[2] === rooms[i].player2Socket) {
      rooms[i].player2PosY = parseFloat(splitMsg[3]);
    }

    this.server
      .to(rooms[i].player1Socket)
      .emit("playerpos", `${rooms[i].player2PosY}`);
    this.server
      .to(rooms[i].player2Socket)
      .emit("playerpos", `${rooms[i].player1PosY}`);
  }

  @SubscribeMessage("matchmaking")
  async handleMatchmaking(@MessageBody() message: string) {
    let parts: string[] = message.split(" ");
    let username: string = parts[1];
    let socketID: string = parts[2];

    let user: User = await this.prisma.user.findUnique({
      where: {
        nickname: username,
      },
    });

    if (user === undefined) {
      this.server.to(socketID).emit("matchmaking", `FAILED`);
      return;
    }
    let wins: string = user.wins.toString();
    if (parts[0] === "ADD") {
      this.addUserToMatchmaking(username, socketID, wins);
      this.server.to(socketID).emit("matchmaking", `ENTERED`);
      console.log(`${username} entered matchmaking`);
    } else {
      this.removeUserFromMatchmaking(username);
      this.server.to(socketID).emit("matchmaking", `LEFT`);
      console.log(`${username} left matchmaking`);
    }
  }

  @OnEvent("challenge.error")
  handleChallengeError(payload: HandleChallengerErrorEvent) {
    const socketId: string = payload.getChallengerPongId();
    const msg: string = payload.getErrorMsg();
    //console.log('Event received error: ', socketId, msg);
    this.server.to(socketId).emit("challenge-error", { msg: msg });
  }

  @OnEvent("match.created")
  handleCreatedEvent(payload: HandleMatchEvent) {
    // handle and process event
    const message: string = payload.getMsg();
    console.log("match found");
    let parts: string[] = message.split(" ");
    let player1: string = parts[1];
    let player1SocketID: string = parts[2];
    let player2: string = parts[3];
    let player2SocketID: string = parts[4];

    let newRoom: room = {
      id: generateID(),
      player1: player1,
      player2: player2,
      score1: 0,
      score2: 0,
      ballPosX: 0,
      ballPosY: 0,
      ballVelX: 0.02,
      ballVelY: 0.02,
      player1PosX: 0,
      player1PosY: 0,
      player2PosX: 0,
      player2PosY: 0,
      player1Socket: player1SocketID,
      player2Socket: player2SocketID,
      spectators: new Array<specatator>(),
      gameStarted: true,
      timeSinceLastScore: 0,
    };
    rooms.push(newRoom);

    console.log(player2SocketID);

    this.server.to(player1SocketID).emit("chat-redirect", `OK`);
    this.server.to(player2SocketID).emit("chat-redirect", `OK`);

    // this.server.to(player1SocketID).emit('start-matchmaking', `${newRoom.id} ${player1} ${player1SocketID} ${player2} ${player2SocketID}`);
    // this.server.to(player2SocketID).emit('start-matchmaking', `${newRoom.id} ${player1} ${player1SocketID} ${player2} ${player2SocketID}`);
  }
  handleMatch(message: string): void {
    console.log("match found");
    let parts: string[] = message.split(" ");
    let player1: string = parts[1];
    let player1SocketID: string = parts[2];
    let player2: string = parts[3];
    let player2SocketID: string = parts[4];

    let newRoom: room = {
      id: generateID(),
      player1: player1,
      player2: player2,
      score1: 0,
      score2: 0,
      ballPosX: 0,
      ballPosY: 0,
      ballVelX: 0.02,
      ballVelY: 0.02,
      player1PosX: 0,
      player1PosY: 0,
      player2PosX: 0,
      player2PosY: 0,
      player1Socket: player1SocketID,
      player2Socket: player2SocketID,
      spectators: new Array<specatator>(),
      gameStarted: true,
      timeSinceLastScore: 0,
    };
    rooms.push(newRoom);

    console.log(player2SocketID);

    this.server.to(player1SocketID).emit("chat-redirect", `OK`);
    this.server.to(player2SocketID).emit("chat-redirect", `OK`);

    // this.server.to(player1SocketID).emit('start-matchmaking', `${newRoom.id} ${player1} ${player1SocketID} ${player2} ${player2SocketID}`);
    // this.server.to(player2SocketID).emit('start-matchmaking', `${newRoom.id} ${player1} ${player1SocketID} ${player2} ${player2SocketID}`);
  }

  async updateProfile(
    winner: string,
    loser: string,
    winnerScore: number,
    loserScore: number
  ) {
    // update user table in prisma
    const winnerUser: User = await this.prisma.user.findUnique({
      where: {
        nickname: winner,
      },
    });

    const loserUser: User = await this.prisma.user.findUnique({
      where: {
        nickname: loser,
      },
    });

    if (winnerUser != null && loserUser != null) {
      const winnerMatch = await this.prisma.matchHistory.create({
        data: {
          against: loserUser.nickname,
          playerScore: winnerScore,
          enemyScore: loserScore,
          result: "WINNER",
          playerId: winnerUser.id,
        },
      });
      const loserMatch = await this.prisma.matchHistory.create({
        data: {
          against: winnerUser.nickname,
          playerScore: loserScore,
          enemyScore: winnerScore,
          result: "LOSER",
          playerId: loserUser.id,
        },
      });
      let winnerAchievements: string[] = new Array<string>();
      let loserAchievements: string[] = new Array<string>();

      if (winnerUser.wins + 1 === 5) winnerAchievements.push("wiener");
      if (winnerUser.wins + 1 === 10) winnerAchievements.push("l33tPonger");
      if (winnerUser.wins + 1 + winnerUser.losses === 20)
        winnerAchievements.push("noLife");

      if (loserUser.losses + 1 === 5) loserAchievements.push("n00bLoser");
      if (loserUser.losses + 1 === 10) loserAchievements.push("proLoser");
      if (loserUser.losses + 1 + loserUser.wins === 20)
        loserAchievements.push("noLife");
      await this.prisma.user.update({
        where: {
          nickname: winner,
        },
        data: {
          wins: winnerUser.wins + 1,
          achievements: {
            push: [...winnerAchievements],
          },
        },
      });

      await this.prisma.user.update({
        where: {
          nickname: loser,
        },
        data: {
          losses: loserUser.losses + 1,
          achievements: {
            push: [...loserAchievements],
          },
        },
      });
      //console.log('loserAchieve: ');
      //console.log(loserAchievements);
      //console.log('winnerAchieve: ');
      //console.log(winnerAchievements);
    }
  }

  addUserToMatchmaking(user: string, socketID: string, wins: string): void {
    //matchMakingSocket.emit(`add`, `ADD ${user} ${socketID} ${wins} `);
    this.bullService.sendMatch(`ADD ${user} ${socketID} ${wins} `);
    //this.matchMaking.handleAdd(`ADD ${user} ${socketID} ${wins} `);
  }

  removeUserFromMatchmaking(sockedID: string): void {
    //matchMakingSocket.emit(`remove`, `REMOVE ${sockedID}`);
    this.matchMaking.handleRemove(`REMOVE ${sockedID}`);
  }

  @SubscribeMessage("chat-create")
  async handleChatCreate(@MessageBody() message: string) {
    // NOTE: message is in the form of: "username user_socket"
    let splitMsg: string[] = message.split(" ");

    for (let i: number = 0; i < rooms.length; i++) {
      if (
        rooms[i].player1 === splitMsg[0] ||
        rooms[i].player2 === splitMsg[0]
      ) {
        this.server
          .to(splitMsg[1])
          .emit("chat-create", `CREATE_OK ${rooms[i].id}`);
        console.log(
          `${splitMsg[0]} tried to create a new room but one already existed with ID: ${rooms[i].id}`
        );
        return;
      }
    }

    let newRoom: room = {
      id: generateID(),
      player1: splitMsg[0],
      player2: "",
      score1: 0,
      score2: 0,
      ballPosX: 0,
      ballPosY: 0,
      ballVelX: 0.02,
      ballVelY: 0.02,
      player1PosX: 0,
      player1PosY: 0,
      player2PosX: 0,
      player2PosY: 0,
      player1Socket: splitMsg[1],
      player2Socket: "",
      spectators: new Array<specatator>(),
      gameStarted: false,
      timeSinceLastScore: 0,
    };
    rooms.push(newRoom);
    console.log(
      `Created room with id ${newRoom.id} containing Player1: ${newRoom.player1} Socket: ${newRoom.player1Socket} via chat`
    );
    this.server
      .to(newRoom.player1Socket)
      .emit("chat-create", `CREATE_OK ${newRoom.id}`);
  }

  @SubscribeMessage("chat-join")
  async handleChatJoin(@MessageBody() message: string) {
    // NOTE: message is in the form of: "username user_socket other_username"
    let splitMsg: string[] = message.split(" ");
    let username: string = splitMsg[0];
    let socketID: string = splitMsg[1];
    let otherUsername: string = splitMsg[2];

    // find otherusername in rooms
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].player1 === otherUsername) {
        rooms[i].player2 = username;
        rooms[i].player2Socket = socketID;
        this.server.to(socketID).emit("chat-redirect", `OK`);
        this.server.to(rooms[i].player1Socket).emit("chat-redirect", `OK`);
        console.log(
          `${username} joined room with id ${rooms[i].id} hosted by ${otherUsername}`
        );
        return;
      }
    }
    this.server.to(socketID).emit("chat-redirect", `KO`);
  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage("chat-spectate")
  async handleChatSpecate(@MessageBody() data: SpectateDto) {
    // NOTE: message is in the form of: "username user_socket other_username"

    // find otherusername in rooms
    for (let i = 0; i < rooms.length; i++) {
      if (
        (rooms[i].player1 === data.otherUsername ||
        rooms[i].player2 === data.otherUsername) && rooms[i].player1 !== data.username && rooms[i].player2 !== data.username
      ) {
        let newSpectator: specatator = {
          username: data.username,
          socket: data.socketId,
        };
        rooms[i].spectators.push(newSpectator);
        this.server.to(data.socketId).emit("chat-redirect", `OK`);
        console.log(
          `${data.username} is spectating room with id ${rooms[i].id} played by ${rooms[i].player1} and ${rooms[i].player2}`
        );
        return;
      }
    }
    this.server.to(data.socketId).emit("chat-redirect", `KO`);
  }

  @SubscribeMessage("challenge-user")
  async handleChallengeUser(@MessageBody() challengeUserDto: any) {
    const { username, socketId, target } = challengeUserDto;
    let user: User = await this.prisma.user.findUnique({
      where: {
        nickname: username,
      },
    });
    let targetChatId: string | undefined =
      this.chatService.getUserSocket(target);
    if (user === undefined || !targetChatId || username === target) {
      this.server.to(socketId).emit("chat-matchmaking", `KO`);
      return;
    }
    console.log(
      `pong.gateway - handleChallengeUser: challenger found[${username}] and targetChatId[${targetChatId}] found.. `
    );

    let timeLeft = Date.now();

    this.bullService.sendMatchChallenge({
      ...challengeUserDto,
      targetChatId: targetChatId,
      timeStamp: timeLeft,
    });
  }

  @SubscribeMessage("chat-matchmaking")
  async handleChatMatchmaking(@MessageBody() message: string) {
    // NOTE: message is in the form of: "username user_socket"
    let parts: string[] = message.split(" ");
    let username: string = parts[1];
    let socketID: string = parts[2];

    let user: User = await this.prisma.user.findUnique({
      where: {
        nickname: username,
      },
    });

    if (user === undefined) {
      this.server.to(socketID).emit("chat-matchmaking", `KO`);
      return;
    }
    if (this.matchMaking.checkIfChallenging(socketID)) {
      this.server
        .to(socketID)
        .emit("challenge-error", { msg: "You are busy!" });
      return;
    }
    let wins: string = user.wins.toString();
    if (parts[0] === "ADD") {
      this.addUserToMatchmaking(username, socketID, wins);
      this.server.to(socketID).emit("chat-matchmaking", `OK`);
      console.log(`${username} entered matchmaking`);
    } else {
      this.removeUserFromMatchmaking(username);
      this.server.to(socketID).emit("chat-matchmaking", `LEFT`);
      console.log(`${username} left matchmaking`);
    }
  }

  @SubscribeMessage("chat-findgame")
  async handleChatRedirect(@MessageBody() message: string) {
    // NOTE: message is in the form of: "username socket_id"
    let splitMsg: string[] = message.split(" ");
    for (let i: number = 0; i < rooms.length; i++) {
      if (rooms[i].player1 === splitMsg[0]) {
        console.log(`${splitMsg[0]} redirected to ${rooms[i].id}`);
        this.server
          .to(rooms[i].player1Socket)
          .emit(
            "chat-findgame",
            `REDIRECT_OK ${rooms[i].id} ${rooms[i].player1} ${rooms[i].player2} false`
          );
        this.removeUserFromMatchmaking(rooms[i].player1Socket);
        return;
      }
      if (rooms[i].player2 === splitMsg[0]) {
        console.log(`${splitMsg[0]} redirected to ${rooms[i].id}`);
        this.server
          .to(rooms[i].player2Socket)
          .emit(
            "chat-findgame",
            `REDIRECT_OK ${rooms[i].id} ${rooms[i].player1} ${rooms[i].player2} false`
          );
        this.removeUserFromMatchmaking(rooms[i].player2Socket);
        return;
      }
      for (let j: number = 0; j < rooms[i].spectators.length; j++) {
        if (rooms[i].spectators[j].username === splitMsg[0]) {
          console.log(`${splitMsg[0]} redirected to ${rooms[i].id}`);
          this.server
            .to(rooms[i].spectators[j].socket)
            .emit(
              "chat-findgame",
              `REDIRECT_OK ${rooms[i].id} ${rooms[i].player1} ${rooms[i].player2} true`
            );
          this.removeUserFromMatchmaking(rooms[i].spectators[j].socket);
          return;
        }
      }
    }
    this.server.to(splitMsg[2]).emit("chat-findgame", `REDIRECT_KO`);
  }

  @SubscribeMessage("chat-delete")
  async handleChatDelete(@MessageBody() message: string) {
    // NOTE: message is in the form of: "username socket_id"
    let splitMsg: string[] = message.split(" ");
    for (let i: number = 0; i < rooms.length; i++) {
      if (
        rooms[i].player1 === splitMsg[0] ||
        rooms[i].player1Socket === splitMsg[1]
      ) {
        this.server.to(splitMsg[1]).emit(`chat-delete`, `OK`);
        rooms.splice(i, 1);
        i = 0;
        continue;
      }
    }
  }

  @SubscribeMessage("chat-matchmaking-remove")
  async handleChatMatchmakingRemove(@MessageBody() message: string) {
    this.removeUserFromMatchmaking(message);
  }

  @SubscribeMessage("chat-matchmaking-check")
  async handleChatMatchmakingCheck(@MessageBody() message: string) {
    let parts: string[] = message.split(" ");
    let answer: string;
    let answerParts: string[];
    if (parts[0] === "CHECK") {
      //matchMakingSocket.emit('chat-matchmaking-check', `${parts[1]}`);
      answer = await this.matchMaking.handleChatMatchmakingCheck(`${parts[1]}`);
      answerParts = answer.split(" ");
    }
    if (answerParts[0] === "OK") {
      this.server.to(parts[2]).emit("chat-matchmaking-check", `OK`);
    } else if (answerParts[0] === "KO") {
      this.server.to(parts[2]).emit("chat-matchmaking-check", `KO`);
    }
  }

  @SubscribeMessage("deleteALL")
  async handleDeleteAll(@MessageBody() message: string) {
    console.log("deleting all rooms");
    rooms.splice(0, rooms.length);
  }

  @SubscribeMessage("page-change")
  async handlePageChange(@MessageBody() message: string) {
    let socketid: string = message;
    let i: number = 0;

    this.removeUserFromMatchmaking(socketid);
    for (; i < rooms.length; i++) {
      if (
        rooms[i].player1Socket === socketid ||
        rooms[i].player2Socket === socketid
      ) {
        if (rooms[i].gameStarted === true) {
          if (rooms[i].player1Socket === socketid) {
            this.updateProfile(
              rooms[i].player2,
              rooms[i].player1,
              rooms[i].score2,
              rooms[i].score1
            );
            //this.pongService.updateScores(
            //  rooms[i].player1,
            //  0,
            //  rooms[i].player2,
            //  rooms[i].score2,
            //);
            this.server
              .to(rooms[i].player2Socket)
              .emit("page-change", `${rooms[i].player1}`);
            for (let j: number = 0; j < rooms[i].spectators.length; j++) {
              this.server
                .to(rooms[i].spectators[j].socket)
                .emit("page-change", `${rooms[i].player1}`);
            }
          } else if (rooms[i].player2Socket === socketid) {
            this.updateProfile(
              rooms[i].player1,
              rooms[i].player2,
              rooms[i].score1,
              rooms[i].score2
            );
            //this.pongService.updateScores(
            //  rooms[i].player1,
            //  rooms[i].score1,
            //  rooms[i].player2,
            //  0,
            //);
            this.server
              .to(rooms[i].player1Socket)
              .emit("page-change", `${rooms[i].player2}`);
            for (let j: number = 0; j < rooms[i].spectators.length; j++) {
              this.server
                .to(rooms[i].spectators[j].socket)
                .emit("page-change", `${rooms[i].player2}`);
            }
          } else {
            for (let j: number = 0; j < rooms[i].spectators.length; j++) {
              if (rooms[i].spectators[j].socket === socketid) {
                rooms[i].spectators.slice(j, 1);
                break;
              }
            }
          }
        }
        break;
      }
    }
    if (i === rooms.length) return;
    rooms.splice(i, 1);
  }

  @SubscribeMessage("spectator-start")
  handleSpectateStart(@MessageBody() message: string) {
    // message is in the form of : `gameID socketID`
    let messages: string[] = message.split(" ");
    let id: string = messages[0];
    let socket: string = messages[1];

    for (let i: number = 0; i < rooms.length; i++) {
      if (rooms[i].id === id) {
        if (rooms[i].gameStarted === true) {
          this.server.to(socket).emit("start", `START ${rooms[i].id}`);
          break;
        }
      }
    }
  }
}
