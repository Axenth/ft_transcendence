import { Injectable } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { ChatService } from "src/chat/chat.service";

@Injectable()
@WebSocketGateway(3002, {
	cors: {
		origin: true,
		credentials: true,
	},
})
export class FriendListGateway
{
  	@WebSocketServer() server;

	constructor(private readonly chatService: ChatService){}
	updateFriendList(){
		this.server.emit("update-friends");
		this.server.emit("update-pending");
		this.server.emit("update-blocked");
		this.server.emit("update-requests");
	}

	emitToUser(user: string, msg: string){
		const userSocket = this.chatService.getUserSocket(user);

		this.server.to(userSocket).emit('friendlist-pop-up', msg);
	}
}