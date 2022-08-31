import {
  HttpException,
  HttpStatus,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Socket } from 'socket.io';
import { Message, Room, RoomType, Status, Timer, Type } from './chat.interface';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Injectable()
export class ChatService {
  private rooms: Map<string, Room> = new Map<string, Room>();
  private userSocket: Map<string, string> = new Map<string, string>();

  constructor(private prisma: PrismaService) {}
  async createRoom(
    roomid: string,
    user: string,
    roomtype: string,
    password: string,
  ) {
    if (this.roomExists(roomid))
      throw Error('Room with this name already exists');
    this.rooms.set(roomid, {
      owner: user,
      users: [user],
      admins: [user],
      muted: [],
      banned: [],
      messages: [],
      password: password === '' ? password : await this.hashPassword(password),
      type: roomtype === 'private' ? RoomType.PRIVATE : RoomType.PUBLIC,
    });
    console.log(
      user + ' created room with id: ' + roomid + ' and password: ' + password,
    );
  }

  listSockets()
  {
    console.log(this.userSocket);
  }

  patchUserNickname(oldNickname: string, newNickname: string){
    let i: number;
    let tempArray: Array<any>;
    let tempTimer: any;
    for (const [key, value] of this.rooms) {

      for(i=0;i<value.users.length;i++)
      {
        if (value.users[i] === oldNickname)
        {
          tempArray = value.users;
          tempArray[i] = newNickname;
          this.rooms.set(key, {...value, users: tempArray});
        }
      }
      for(i=0;i<value.admins.length;i++)
      {
        if (value.admins[i] === oldNickname)
        {
          tempArray = value.admins;
          tempArray[i] = newNickname;
          this.rooms.set(key, {...value, admins: tempArray});
        }
      }


      for(i=0;i<value.muted.length;i++)
      {
        if (value.muted[i].user === oldNickname)
        {
          tempTimer = value.muted[i];
          tempTimer.user = newNickname;
          tempArray = value.muted;
          tempArray[i] = tempTimer;
          this.rooms.set(key, {...value, muted: tempArray});
        }
      }

      for(i=0;i<value.banned.length;i++)
      {
        if (value.banned[i].user === oldNickname)
        {
          tempTimer = value.banned[i];
          tempTimer.user = newNickname;
          tempArray = value.banned;
          tempArray[i] = tempTimer;
          this.rooms.set(key, {...value, banned: tempArray});
        }
      }

      for(i=0;i<value.messages.length;i++)
      {
        if(value.messages[i].user === oldNickname)
        {
          tempArray = value.messages;
          tempArray[i] = {user: newNickname, message: value.messages[i].message, gameId: value.messages[i].gameId};
          this.rooms.set(key, {...value, messages: tempArray});
        }
      }

      // Unable to modify owner. Doesn't affect anything but shouldn't be like this
      if(value.owner === oldNickname)
      {
        this.rooms.get(key).owner = newNickname;
      }
    }
  }

  async setUserStatus(userId: string | number, status: any) {
    console.log(`[${userId}][${status}]`);
    try {
      if (typeof userId === 'number') {
        await this.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            status: {
              set: status,
            },
          },
        });
      } else {
        await this.prisma.user.update({
          where: {
            nickname: userId,
          },
          data: {
            status: {
              set: status,
            },
          },
        });
      }
    }
    catch (e)
    {
      if (e instanceof PrismaClientKnownRequestError)
      {
        console.log('Prisma issue.');
      }
    }
  }

  setUserSocket(user: string, userSocket: string) {
    this.userSocket.set(user, userSocket);
  }

  getUserSocket(target: string) {
    return this.userSocket.get(target);
  }

  deleteUserSocket(target: string) {
    if (target) this.userSocket.delete(target);
  }

  getPublicRooms() {
    let roomList: string[] = [];

    for (let room of this.rooms.keys()) {
      if (this.rooms.get(room).type === RoomType.PUBLIC) roomList.push(room);
    }
    return roomList;
  }

  getPrivateRooms(user: string) {
    let roomList: string[] = [];

    for (let room of this.rooms.keys()) {
      if (
        this.rooms.get(room).type === RoomType.PRIVATE &&
        this.rooms.get(room).users.includes(user)
      )
        roomList.push(room);
    }
    return roomList;
  }

  getRoomInfo(roomId: string) {
    let room = this.rooms.get(roomId);

    return room;
  }

  roomExists(roomid: string) {
    if (this.rooms.has(roomid)) return true;
    return false;
  }

  leaveSocketRoom(roomid: string, client: Socket) {
    const [socketId, oldRoomId] = client.rooms;

    if (oldRoomId === roomid && this.rooms.get(roomid).type === RoomType.DM)
      throw Error('Already in in this DM room.');
    if (oldRoomId === roomid) throw Error('Already in room with id: ' + roomid);
    client.leave(oldRoomId);
  }

  leaveRoom(roomid: string, client: Socket, user: string) {
    if (roomid === undefined) throw Error("You're not in a room");
    if (this.rooms.get(roomid) === undefined)
      throw Error("Can't leave DM rooms");
    if (!this.roomExists(roomid)) throw Error('Room does not exist');
    client.leave(roomid);
    this.removeUserFromAll(roomid, user);
    if (user === this.rooms.get(roomid).owner) return this.changeOwner(roomid);
    return 'Left room with name: ' + roomid;
  }

  changeOwner(roomid: string) {
    let room = this.rooms.get(roomid);
    if (room.users.length === 0) {
      this.deleteRoom(roomid);
      return 'Succesfully deleted room after you left';
    }
    this.rooms.get(roomid).owner = room.users[0];
    if(!this.isUserIn(Type.ADMINS, roomid, room.users[0]))
    {
      this.addUserTo(Type.ADMINS, roomid, room.users[0]);
    }
    return 'Left room with name: ' + roomid;
  }

  async joinRoom(
    roomid: string,
    client: Socket,
    user: string,
    password: string,
  ) {
    if (user === undefined) throw Error('User Undefined');
    if(!this.rooms.get(roomid))
      throw Error('Invalid room name!');
    if (this.rooms.get(roomid).type !== RoomType.PUBLIC  && this.rooms.get(roomid).type !== RoomType.PRIVATE)
      throw Error('You managed to guess a DM roomId, congrats!');
    if (!this.roomExists(roomid)) throw Error('Room does not exist');
    if (
      this.doesUserHaveTimer(
        this.rooms.get(roomid).banned,
        roomid,
        user,
        Type.BANNED,
      )
    )
      throw Error(
        this.getTimer(this.rooms.get(roomid).banned, user, Type.BANNED),
      );
    if (!(await this.isPasswordCorrect(roomid, password)))
      throw Error(
        password === undefined
          ? 'Password required to join room'
          : 'Password incorrect',
      );
    this.leaveSocketRoom(roomid, client);
    client.join(roomid);
    if (!this.isUserIn(Type.USERS, roomid, user))
      this.addUserTo(Type.USERS, roomid, user);
  }

  dmExists(user: string, target: string) {
    let ret: boolean = false;

    this.rooms.forEach((room) => {
      if (
        room.users.includes(user) &&
        room.users.includes(target) &&
        room.type == RoomType.DM
      ) {
        ret = true;
        return;
      }
    });
    return ret;
  }

  createDM(user: string, target: string) {
    let test = randomUUID();
    this.rooms.set(test, {
      owner: user,
      users: [user, target],
      admins: [user, target],
      muted: [],
      banned: [],
      messages: [],
      type: RoomType.DM,
    });
  }

  getDM(user: string, target: string) {
    let ret: string = '';
    this.rooms.forEach((room, key) => {
      if (
        room.users.includes(user) &&
        room.users.includes(target) &&
        room.type == RoomType.DM
      ) {
        ret = key;
        return;
      }
    });
    return ret;
  }

  joinDM(user: string, target: string, client: Socket) {
    if (user === target) throw Error("Can't DM yourself");
    if (!this.dmExists(user, target)) this.createDM(user, target);
    let dmRoomId = this.getDM(user, target);
    this.leaveSocketRoom(dmRoomId, client);
    client.join(dmRoomId);
    return dmRoomId;
  }

  async getRoomMessages(roomid: string, userid: string) {
    let messages = this.rooms.get(roomid).messages;
    let newMessages = JSON.parse(JSON.stringify(messages));
    let blockedList: number[] = await this.getBlockedUsers(userid);

    let temp: User;
    for (let i = 0; i < newMessages.length; i++) {
      temp = await this.prisma.user.findUnique({
        where: {
          nickname: newMessages[i].user,
        },
      });
      if (temp && blockedList.includes(temp.id))
        newMessages[i].message = "* BLOCKED USER *";
    }
    return newMessages;
  }

  addMessage(client: Socket, user: string, message: string) {
    const [socketid, roomid] = client.rooms;

    if (roomid === undefined) throw Error('Please select a room');
    else if (
      this.doesUserHaveTimer(
        this.rooms.get(roomid).banned,
        roomid,
        user,
        Type.BANNED,
      )
    )
      throw Error(
        this.getTimer(this.rooms.get(roomid).banned, user, Type.BANNED),
      );
    else if (
      this.doesUserHaveTimer(
        this.rooms.get(roomid).muted,
        roomid,
        user,
        Type.MUTED,
      )
    )
      throw Error(
        this.getTimer(this.rooms.get(roomid).muted, user, Type.MUTED),
      );

    let currentRoom = this.rooms.get(roomid);
    let newMessage: Message = { user: user, message: message, gameId: '' };
    currentRoom.messages.push(newMessage);
    this.rooms.set(roomid, currentRoom);
    return [roomid, newMessage];
  }

  async getLastMessage(roomid: string, userid: string) {
    let message: Message = this.rooms.get(roomid).messages.at(-1);
    let newMessage: Message = JSON.parse(JSON.stringify(message));
    let blockedList: number[] = await this.getBlockedUsers(userid);

    console.log(`message from: ${message.user}`);
    let temp: User = await this.prisma.user.findUnique({
      where: {
        nickname: message.user,
      },
    });
    if (temp) {
      if (blockedList.includes(temp.id))
        newMessage.message = "* BLOCKED USER *";
      return newMessage;
    }
  }

  toggleBan(roomid: string, target: string, user: string) {
    let toggle = 'banned';

    if (this.rooms.get(roomid).owner === target)
      throw Error("You can't ban the channel owner");
    if (this.rooms.get(roomid).type == RoomType.DM)
      throw Error("You can't ban in DM's");
    else if (!this.isUserIn(Type.ADMINS, roomid, user))
      throw Error("You're not a admin in this room");
    if (!this.isUserIn(Type.USERS, roomid, target))
      throw Error('User not in this room!');

    if (this.isUserIn(Type.BANNED, roomid, target)) toggle = 'unbanned';

    if (target === user && toggle === 'banned')
      throw Error("You can't ban yourself!");
    else if (target === user && toggle === 'unbanned')
      throw Error("You can't unban yourself!");

    if (toggle === 'banned') this.addUserTo(Type.BANNED, roomid, target);
    else if (toggle === 'unbanned')
      this.removeUserFrom(Type.BANNED, roomid, target);
    return toggle;
  }

  toggleMute(roomid: string, target: string, user: string) {
    let toggle = 'muted';

    if (this.rooms.get(roomid).owner === target)
      throw Error("You can't mute the channel owner");
    if (this.rooms.get(roomid).type == RoomType.DM)
      throw Error("You can't mute in DM's");
    else if (!this.isUserIn(Type.ADMINS, roomid, user))
      throw Error("You're not a admin in this room");
    if (!this.isUserIn(Type.USERS, roomid, target))
      throw Error('User not in this room!');

    if (this.isUserIn(Type.MUTED, roomid, target)) toggle = 'unmuted';

    if (target === user && toggle === 'muted')
      throw Error("You can't mute yourself!");
    else if (target === user && toggle === 'unmuted')
      throw Error("You can't unmute yourself!");

    if (toggle === 'muted') this.addUserTo(Type.MUTED, roomid, target);
    else if (toggle === 'unmuted')
      this.removeUserFrom(Type.MUTED, roomid, target);
    return toggle;
  }

  toggleAdmin(roomid: string, target: string, user: string) {
    let toggle = 'add-admin';

    if (this.rooms.get(roomid).type == RoomType.DM)
      throw Error("You can't have admins in DM's");
    else if (!this.isUserIn(Type.ADMINS, roomid, user))
      throw Error("You're not a admin in this room");
    if (!this.isUserIn(Type.USERS, roomid, target))
      throw Error('User not in this room!');
    if (target === user) throw Error("You can't change your own admin status!");
    if (this.rooms.get(roomid).owner === target)
      throw Error("You can't remove the channel owner from the admin list");

    if (this.isUserIn(Type.ADMINS, roomid, target)) toggle = 'remove-admin';

    if (toggle === 'add-admin') this.addUserTo(Type.ADMINS, roomid, target);
    else if (toggle === 'remove-admin')
      this.removeUserFrom(Type.ADMINS, roomid, target);
    return toggle;
  }

  doesUserHaveTimer(arr: Timer[], roomid: string, user: string, type: Type) {
    let ret: boolean = false;

    arr.forEach((e, index) => {
      if (e.user == user) {
        if (e.timer.getTime() > Date.now()) {
          ret = true;
          return;
        }
        this.removeUserFrom(type, roomid, user);
        return;
      }
    });
    return ret;
  }

  getTimer(list: Timer[], user: string, type: Type) {
    let ret: string = '';

    list.forEach((e, index) => {
      if (e.user == user) {
        ret =
          'You are still ' +
          (type == Type.BANNED ? ' banned ' : ' muted ') +
          ' from this room until: ' +
          e.timer;
        return;
      }
    });
    return ret;
  }

  async isPasswordCorrect(roomid: string, password: string) {
    let room = this.rooms.get(roomid);
    if (room.password === '') return true;
    if (password === undefined) return false;
    return await bcrypt.compare(password, room.password);
  }

  async changePassword(roomid: string, newPassword: string, user: string) {
    let room = this.rooms.get(roomid);
    if(!room) throw Error('You are not in a room');
    if (user !== room.owner) throw Error('You are not the channel owner');
    this.rooms.get(roomid).password = await this.hashPassword(newPassword);
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(password, salt);
    //console.log(hash);
    return hash;
  }

  isUserIn(type: Type, roomid: string, user: string) {
    switch (type) {
      case Type.USERS: {
        if (this.rooms.get(roomid).users.includes(user)) return true;
      }
      case Type.ADMINS: {
        if (this.rooms.get(roomid).admins.includes(user)) return true;
      }
      case Type.MUTED: {
        for (let i = 0; i < this.rooms.get(roomid).muted.length; i++) {
          if (this.rooms.get(roomid).muted[i].user == user) return true;
        }
      }
      case Type.BANNED: {
        for (let i = 0; i < this.rooms.get(roomid).banned.length; i++) {
          if (this.rooms.get(roomid).banned[i].user == user) return true;
        }
      }
      default: {
        return false;
      }
    }
  }

  addUserTo(type: Type, roomid: string, target: string) {
    switch (type) {
      case Type.USERS: {
        this.rooms.get(roomid).users.push(target);
        break;
      }
      case Type.ADMINS: {
        this.rooms.get(roomid).admins.push(target);
        break;
      }
      case Type.MUTED: {
        this.rooms
          .get(roomid)
          .muted.push({ user: target, timer: new Date(Date.now() + 300000) });
        break;
      }
      case Type.BANNED: {
        this.rooms
          .get(roomid)
          .banned.push({ user: target, timer: new Date(Date.now() + 300000) });
        break;
      }
      default: {
        break;
      }
    }
  }

  removeUserFrom(type: Type, roomid: string, target: string) {
    switch (type) {
      case Type.USERS: {
        this.rooms.get(roomid).users.forEach((e, index) => {
          if (e == target) this.rooms.get(roomid).users.splice(index, 1);
        });
        break;
      }
      case Type.ADMINS: {
        this.rooms.get(roomid).admins.forEach((e, index) => {
          if (e == target) this.rooms.get(roomid).admins.splice(index, 1);
        });
        break;
      }
      case Type.MUTED: {
        this.rooms.get(roomid).muted.forEach((e, index) => {
          if (e.user == target) this.rooms.get(roomid).muted.splice(index, 1);
        });
        break;
      }
      case Type.BANNED: {
        this.rooms.get(roomid).banned.forEach((e, index) => {
          if (e.user == target) this.rooms.get(roomid).banned.splice(index, 1);
        });
        break;
      }
      default: {
        break;
      }
    }
  }

  removeUserFromAll(roomid: string, user: string) {
    this.removeUserFrom(Type.ADMINS, roomid, user);
    this.removeUserFrom(Type.USERS, roomid, user);
  }

  deleteRoom(roomid: string) {
    this.rooms.delete(roomid);
  }

  //TODO possibly delete this function
  async getUserFromDb(userId: string | number, action: string) {
    let user: User;
    if (typeof userId === 'number') {
      user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
    } else {
      user = await this.prisma.user.findUnique({
        where: {
          nickname: userId,
        },
      });
    }
    if (!user)
      throw Error(
        'Failed to get user form DB userid: ' +
          userId +
          ' when trying to ' +
          action,
      );
    else if (user.isNickSet === false) throw new HttpException('nickname not set', 318);
    return user;
  }

  async getBlockedUsers(userId: string|number) {
    let user: any = await this.getUserFromDb(userId, 'getBlockedUsers');

    return user.blocked;
  }
}
