import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FriendListGateway } from "./friendlist.gateway";

@Injectable()
export class FriendListService {
  constructor(
    private prisma: PrismaService,
    private readonly FriendListGateway: FriendListGateway
  ) {}

  async getUserFromDb(userId: number | string, action: string) {
    let user: User;
    if (typeof userId === "number") {
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
        "Failed to get user form DB userid: " +
          userId +
          " when trying to " +
          action
      );
    else if (user.isNickSet === false)
      throw new HttpException("nickname not set", 318);
    return user;
  }

  async addFriend(userId: number, targetId: string) {
    const user = await this.getUserFromDb(userId, "addFriend");
    const target = await this.getUserFromDb(targetId, "addFriend");
    if (user.nickname === target.nickname)
      throw Error(user.nickname + " can't add himself");
    if (user.blocked.includes(target.id))
      throw Error(target.nickname + " is blocked by: " + user.nickname);
    if (target.blocked.includes(user.id))
      throw Error(user.nickname + " is blocked by: " + target.nickname);
    if (target.friendRequests.includes(user.id))
      throw Error(
        user.nickname + " is already in the request list of: " + target.nickname
      );
    if (user.friends.includes(target.id))
      throw Error(
        target.nickname + " is already a friend of: " + user.nickname
      );
    if (user.friendRequests.includes(target.id)) {
      await this.deleteFromFriendRequests(user, target);
      await this.addToFriendList(user, target);
      await this.addToFriendList(target, user);
    } else {
      await this.addToFriendRequest(target, user);
    }
    this.FriendListGateway.updateFriendList();
    return (
      user.nickname + " added " + target.nickname + " to his friendRequests"
    );
  }

  async removeFriend(userId: number, targetId: string) {
    const user = await this.getUserFromDb(userId, "removeFriend");
    const target = await this.getUserFromDb(targetId, "removeFriend");

    if (!user.friends.includes(target.id))
      throw Error(target.nickname + " is not a friend of: " + user.nickname);
    await this.deleteFromFriendList(user, target);
    await this.deleteFromFriendList(target, user);

    this.FriendListGateway.updateFriendList();
    return (
      user.nickname + " removed: " + target.nickname + " from his friendlist"
    );
  }

  async rejectRequest(userId: number | string, targetId: string | number) {
    const user = await this.getUserFromDb(userId, "rejectRequest");
    const target = await this.getUserFromDb(targetId, "rejectRequest");

    await this.deleteFromFriendRequests(user, target);

    this.FriendListGateway.updateFriendList();
    return (
      user.nickname + " rejected the friend request from: " + target.nickname
    );
  }

  async blockUser(userId: number, targetId: string) {
    const user = await this.getUserFromDb(userId, "blockUser");
    const target = await this.getUserFromDb(targetId, "blockUser");

    if (user.nickname == target.nickname)
      throw Error(user.nickname + " can't block himself");
    if (user.blocked.includes(target.id))
      throw Error(target.nickname + " is already blocked by: " + user.nickname);
    await this.addToBlockedList(user, target);
    if (user.friends.includes(target.id)) {
      await this.deleteFromFriendList(user, target);
      await this.deleteFromFriendList(target, user);
    }
    if (user.friendRequests.includes(target.id))
      await this.deleteFromFriendRequests(user, target);
    if (target.friendRequests.includes(user.id))
      await this.deleteFromFriendRequests(target, user);
    this.FriendListGateway.updateFriendList();
    return user.nickname + " blocked: " + target.nickname;
  }

  async unBlockUser(userId: number, targetId: string) {
    const user = await this.getUserFromDb(userId, "unBlockUser");
    const target = await this.getUserFromDb(targetId, "unBlockUser");

    if (!user.blocked.includes(target.id))
      throw Error(target.nickname + " is not blocked by: " + user.nickname);
    await this.removeFromBlockedList(user, target);

    this.FriendListGateway.updateFriendList();
    return user.nickname + " unblocked: " + target.nickname;
  }

  async getFriends(userId: number) {
    const user = await this.getUserFromDb(userId, "getFriends");
    let tempUser;
    let friends: [{ status: string; nickname: string; avatar: string }?] = [];

    for (let i = 0; i < user.friends.length; i++) {
      tempUser = await this.prisma.user.findUnique({
        where: {
          id: user.friends[i],
        },
      });
      friends.push({
        status: tempUser.status,
        nickname: tempUser.nickname,
        avatar: tempUser.customAvatar
          ? tempUser.customAvatar
          : tempUser.defaultAvatar,
      });
    }
    return friends;
  }

  async getBlocked(userId: number) {
    const user = await this.getUserFromDb(userId, "getFriends");
    let tempUser;
    let blocked: [{ nickname: string; avatar: string }?] = [];

    for (let i = 0; i < user.blocked.length; i++) {
      tempUser = await this.prisma.user.findUnique({
        where: {
          id: user.blocked[i],
        },
      });
      blocked.push({
        nickname: tempUser.nickname,
        avatar: tempUser.defaultAvatar,
      });
    }
    return blocked;
  }

  async getFriendRequest(userId: number) {
    const user = await this.getUserFromDb(userId, "getFriends");
    let tempUser;

    let friendRequests: [{ nickname: string; avatar: string }?] = [];

    for (let i = 0; i < user.friendRequests.length; i++) {
      tempUser = await this.prisma.user.findUnique({
        where: {
          id: user.friendRequests[i],
        },
      });
      friendRequests.push({
        nickname: tempUser.nickname,
        avatar: tempUser.customAvatar
          ? tempUser.customAvatar
          : tempUser.defaultAvatar,
      });
    }
    return friendRequests;
  }

  async getPending(userId: number) {
    const user = await this.getUserFromDb(userId, "pending");
    const users = await this.prisma.user.findMany({
      where: {
        friendRequests: {
          has: user.id,
        },
      },
    });
    let ret: any = [];
    for (var User of users) {
      ret.push({
        nickname: User.nickname,
        avatar: User.customAvatar ? User.customAvatar : User.defaultAvatar,
      });
    }
    return ret;
  }

  async removeFromBlockedList(user: User, target: User) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        blocked: {
          set: user.blocked.filter((i) => i !== target.id),
        },
      },
    });
  }

  async addToBlockedList(user: User, target: User) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        blocked: {
          set: [...user.blocked, target.id],
        },
      },
    });
  }

  async addToBlockedListTest(user: User, target: User, prop: any) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        blocked: {
          set: [...user.blocked, target.id],
        },
      },
    });
  }

  async addToFriendList(user: User, target: User) {
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        friends: {
          set: [...user.friends, target.id],
        },
      },
    });
  }

  async deleteFromFriendList(user: User, target: User) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        friends: {
          set: user.friends.filter((i) => i !== target.id),
        },
      },
    });
  }

  async addToFriendRequest(user: User, target: User) {
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        friendRequests: {
          set: [...user.friendRequests, target.id],
        },
      },
    });
  }

  async deleteFromFriendRequests(user: User, target: User) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        friendRequests: {
          set: user.friendRequests.filter((i) => i !== target.id),
        },
      },
    });
  }
}
