import {
	Injectable,
	UnauthorizedException,
	UsePipes,
	ValidationPipe,
  } from "@nestjs/common";
  import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
  } from "@nestjs/websockets";
  import { ChatService } from "./chat.service";
  import { JwtService } from "@nestjs/jwt";
  import { ConfigService } from "@nestjs/config";
  import { PrismaService } from "../prisma/prisma.service";
  import { Socket } from "socket.io";
  import { User } from "@prisma/client";
  import { OnEvent } from "@nestjs/event-emitter";
  import { CreateRoomDto } from "../../types/CreateRoomDto";
  import { ChatChangeStatusDto } from "../../types/ChatChangeStatusDto";
  import { SendMsgDto } from "../../types/SendMsgDto";
  import { JoinRoomDto } from "../../types/JoinRoomDto";
  import { ChangePasswordDto } from "../../types/ChangePasswordDto";
  
  class HandleChallengeEvent {
	constructor(
	  private param: {
		payload: { challenger: string; target: string; timeStamp: number };
	  }
	) {}
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
  
  @Injectable()
  @WebSocketGateway(3002, {
	cors: {
	  origin: "*",
	},
  })
  export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(
	  private readonly chatService: ChatService,
	  private jwt: JwtService,
	  private prisma: PrismaService,
	  private config: ConfigService
	) {}
  
	@WebSocketServer() server;
  
	private disconnect(socket: Socket) {
	  //This error causes polling issue, try manually reconnecting on frontend after OTP or setNickname
	  // cause this might user to seem offline
	  //socket.emit('Error: ', new UnauthorizedException());
	  socket.disconnect();
	}
  
	// Function force called on each connection
	async handleConnection(socket: Socket) {
	  try {
		const token: string = socket.handshake.headers.authorization.replace(
		  "Bearer ",
		  ""
		);
		const decodedToken: any = await this.jwt.verifyAsync(token, {
		  secret: process.env.REFRESH_TOKEN_SECRET,
		});
		if (!decodedToken) {
		  return this.disconnect(socket);
		}
		const user: User = await this.prisma.user.findUnique({
		  where: {
			id: decodedToken.sub,
		  },
		});
		if (user && user.nickname) {
		  // Token is valid.. define behaviour for when user connects with socket.
		  this.chatService.setUserSocket(user.nickname, socket.id);
		  await this.chatService.setUserStatus(user.id, "ONLINE");
		  this.server.emit("update-friends");
		  console.log(
			`New chat connection: ${decodedToken.email}[${user.id}] .. socketId: ${socket.id}`
		  );
		} else {
		  this.server.emit("update-friends");
		  console.log("socket: ", socket.connected);
		  this.disconnect(socket);
		}
	  } catch {
		this.disconnect(socket);
	  }
	}
  
	// Function force called on each disconnect
	async handleDisconnect(socket: Socket) {
	  const token: string = socket.handshake.headers.authorization.replace(
		"Bearer ",
		""
	  );
	  const decodedToken: any = await this.jwt.decode(token);
	  if (decodedToken !== null) {
		const user: User = await this.prisma.user.findUnique({
		  where: {
			id: decodedToken.sub,
		  },
		});
		if (user && user.nickname) {
		  this.chatService.deleteUserSocket(user.nickname);
		  await this.chatService.setUserStatus(user.id, "OFFLINE");
		  this.server.emit("update-friends");
		  console.log(`Chat disconnection: ${decodedToken.email}[${user.id}]`);
		} else {
		  this.server.emit("update-friends");
		}
	  }
	  socket.disconnect();
	}
  
	@OnEvent("challenge.error.chat")
	handleChallengeError(payload: HandleChallengerErrorEvent) {
	  const socketId: string = payload.getChallengerPongId();
	  const msg: string = payload.getErrorMsg();
	  console.log("Event received error through chat socket: ", socketId, msg);
	  this.server.to(socketId).emit("challenge-error-chat", { msg: msg });
	}
  
	@OnEvent("challenge.request")
	handleChallengeEvent(payload: HandleChallengeEvent) {
	  const target: string = payload.getTarget();
	  const challenger: string = payload.getChallenger();
	  const timeStamp: number = payload.getTimeStamp();
	  const socketId: string = this.chatService.getUserSocket(target);
	  console.log(
		"Reached request event..  trying to send to chat ID: ",
		socketId
	  );
	  this.server
		.to(socketId)
		.emit("challenge-sent", { challenger: challenger, timeStamp: timeStamp });
	}
  
	@UsePipes(new ValidationPipe())
	@SubscribeMessage("send-message")
	handleMsg(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() data: SendMsgDto
	): void {
	  try {
		if (data.message && data.message.length > 350) {
		  client.emit("chat-pop-up", "Message too long");
		  return;
		}
		const [roomid, message] = this.chatService.addMessage(
		  client,
		  data.user,
		  data.message
		);
		this.server.to(roomid).emit("receive-message", message);
		this.server.to(roomid).emit("req-last-message", roomid);
	  } catch (e) {
		client.emit("chat-pop-up", e.message);
	  }
	}
  
	@SubscribeMessage("get-last-message")
	async handleLastMsg(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() data: any
	) {
	  let msg;
	  try {
		msg = await this.chatService.getLastMessage(data.roomid, data.user);
	  } catch (e) {
		client.emit("chat-pop-up", e.message);
	  }
	  return msg;
	}
  
	@UsePipes(new ValidationPipe())
	@SubscribeMessage("create-room")
	async handleCreate(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() data: CreateRoomDto
	) {
	  try {
		await this.chatService.createRoom(
		  data.roomid,
		  data.user,
		  data.roomtype,
		  data.password
		);
		client.emit("chat-pop-up", "Created room with id: " + data.roomid);
		data.roomtype === "public"
		  ? this.server.emit(
			  "update-public-room-list",
			  this.chatService.getPublicRooms()
			)
		  : client.emit(
			  "update-private-room-list",
			  this.chatService.getPrivateRooms(data.user)
			);
	  } catch (e) {
		client.emit("chat-pop-up", e.message);
	  }
	}
  
	@UsePipes(new ValidationPipe())
	@SubscribeMessage("join-room")
	async handleJoin(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() data: JoinRoomDto
	) {
	  try {
		await this.chatService.joinRoom(
		  data.roomid,
		  client,
		  data.user,
		  data.password
		);
		client.emit(
		  "chat-pop-up",
		  "Succesfully joined room with name: " + data.roomid
		);
		client.emit(
		  "join-room-client",
		  await this.chatService.getRoomMessages(data.roomid, data.user),
		  data.roomid
		);
		client.emit(
		  "update-private-room-list",
		  this.chatService.getPrivateRooms(data.user)
		);
		this.server
		  .to(data.roomid)
		  .emit("update-room-info", this.chatService.getRoomInfo(data.roomid));
	  } catch (e) {
		client.emit("chat-pop-up", e.message);
	  }
	}
  
	@SubscribeMessage("leave-room")
	handleLeave(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() data: any
	): void {
	  try {
		let ret = this.chatService.leaveRoom(data.roomid, client, data.user);
		client.emit("chat-pop-up", ret);
		client.emit("join-room-client", []);
		this.server
		  .to(data.roomid)
		  .emit("update-room-info", this.chatService.getRoomInfo(data.roomid));
		client.emit(
		  "update-private-room-list",
		  this.chatService.getPrivateRooms(data.user)
		);
		this.server.emit(
		  "update-public-room-list",
		  this.chatService.getPublicRooms()
		);
	  } catch (e) {
		client.emit("chat-pop-up", e.message);
	  }
	}
  
	@SubscribeMessage("join-dm")
	async handleDM(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() data: { user: string; target: string }
	) {
	  try {
		let roomid = this.chatService.joinDM(data.user, data.target, client);
		client.emit(
		  "system-pop-up",
		  "Succesfully joined DM room with: " + data.target
		);
		client.emit(
		  "join-room-client",
		  await this.chatService.getRoomMessages(roomid, data.user),
		  data.target
		);
		this.server
		  .to(roomid)
		  .emit("update-room-info", this.chatService.getRoomInfo(roomid));
	  } catch (e) {
		client.emit("system-pop-up", e.message);
	  }
	}
  
	@SubscribeMessage("toggle-ban")
	async handleBan(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
	  try {
		let ret = this.chatService.toggleBan(data.roomid, data.target, data.user);
		client.emit(
		  "chat-pop-up",
		  "Succesfully " + ret + " " + data.target + " in this room"
		);
		this.server
		  .to(data.roomid)
		  .emit("update-room-info", this.chatService.getRoomInfo(data.roomid));
		await this.handleKick(data.target, data.roomid);
	  } catch (e) {
		client.emit("chat-pop-up", e.message);
	  }
	}
  
	async handleKick(target: string, roomid: string) {
	  const socketId = this.chatService.getUserSocket(target);
	  const connectedSockets = await this.server.in(roomid).fetchSockets();
	  let connectedUsers: string[] = [];
  
	  for (let socket of connectedSockets) {
		connectedUsers.push(socket.id);
	  }
	  if (connectedUsers.includes(socketId)) {
		this.server.to(socketId).emit("join-room-client", []);
		this.server.in(socketId).socketsLeave(roomid);
		this.server.to(socketId).emit("update-room-info");
	  }
	  this.server
		.to(socketId)
		.emit(
		  "chat-pop-up",
		  "You have been banned from the room with name: " + roomid
		);
	}
  
	@SubscribeMessage("toggle-mute")
	handleMute(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() data: any
	): void {
	  try {
		let ret = this.chatService.toggleMute(
		  data.roomid,
		  data.target,
		  data.user
		);
		client.emit(
		  "chat-pop-up",
		  "Succesfully " + ret + " " + data.target + " in this room"
		);
		this.server
		  .to(data.roomid)
		  .emit("update-room-info", this.chatService.getRoomInfo(data.roomid));
	  } catch (e) {
		client.emit("chat-pop-up", e.message);
	  }
	}
  
	@SubscribeMessage("toggle-admin")
	handleAdmin(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() data: any
	): void {
	  try {
		let ret = this.chatService.toggleAdmin(
		  data.roomid,
		  data.target,
		  data.user
		);
		if (ret == "remove-admin")
		  client.emit(
			"chat-pop-up",
			"Succesfully removed " + data.target + " from the admin list!"
		  );
		else if (ret == "add-admin")
		  client.emit(
			"chat-pop-up",
			"Succesfully added " + data.target + " to the admin list!"
		  );
		this.server
		  .to(data.roomid)
		  .emit("update-room-info", this.chatService.getRoomInfo(data.roomid));
	  } catch (e) {
		client.emit("chat-pop-up", e.message);
	  }
	}
  
	@UsePipes(new ValidationPipe())
	@SubscribeMessage("change-password")
	async handleChangePassword(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() data: ChangePasswordDto
	) {
	  try {
		await this.chatService.changePassword(
		  data.roomId,
		  data.password,
		  data.user
		);
		client.emit("chat-pop-up", "Succesfully change password of this room!");
		this.server
		  .to(data.roomId)
		  .emit("update-room-info", this.chatService.getRoomInfo(data.roomId));
	  } catch (e) {
		client.emit("chat-pop-up", e.message);
	  }
	}
  
	@SubscribeMessage("req-public-room-list")
	handlePublicList(@ConnectedSocket() client: Socket): void {
	  client.emit("update-public-room-list", this.chatService.getPublicRooms());
	}
  
	@SubscribeMessage("req-private-room-list")
	handlePrivateRoomList(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() user: string
	): void {
	  client.emit(
		"update-private-room-list",
		this.chatService.getPrivateRooms(user)
	  );
	}
  
	@SubscribeMessage("req-room-info")
	handleGetRoomInfo(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() roomId: string
	): void {
	  this.server
		.to(roomId)
		.emit("update-room-info", this.chatService.getRoomInfo(roomId));
	}
  
	@SubscribeMessage("leave-chat")
	handleLeaveChat(
	  @ConnectedSocket() client: Socket,
	  @MessageBody() roomId: string
	) {
	  this.chatService.leaveSocketRoom(roomId, client);
	}
  
	@SubscribeMessage("change-status")
	async changeStatus(@MessageBody() data: { user: string; status: string }) {
	  console.log(data.user + data.status);
	  if (data.user !== undefined) {
		await this.chatService.setUserStatus(data.user, data.status);
		this.server.emit("update-friends");
	  }
	}
  }
  