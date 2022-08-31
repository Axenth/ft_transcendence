import {
    UseFilters,
    Body,
    Controller,
    HttpCode,
    Post,
    Req,
    UseGuards,
    HttpStatus,
    Get,
  } from "@nestjs/common";
  import { AuthGuard } from "@nestjs/passport";
  import { ReqExtractId } from "types/ReqExtractId";
  import { TargetUserDto } from "../../types/TargetUserDto";
  import { FriendListGateway } from "./friendlist.gateway";
  import { FriendListService } from "./friendlist.service";
  import { AllExceptionsFilter } from "../auth/all-exception.filter";
  
  @UseFilters(new AllExceptionsFilter())
  @Controller("friendlist")
  export class FriendListController {
    private FriendListService: FriendListService;
    private FriendListGateway: FriendListGateway;
    constructor(
      FriendListService: FriendListService,
      FriendListGateway: FriendListGateway
    ) {
      this.FriendListService = FriendListService;
      this.FriendListGateway = FriendListGateway;
    }
  
    @UseGuards(AuthGuard("jwt"))
    @Post("addfriend")
    @HttpCode(HttpStatus.OK)
    async addfriend(@Req() req: ReqExtractId, @Body() data: TargetUserDto) {
      let ret: string;
  
      try {
        ret = await this.FriendListService.addFriend(req.user.sub, data.target);
      } catch (e) {
        //console.log(e.message);
        ret = e.message;
      }
      return JSON.stringify(ret);
    }
  
    @UseGuards(AuthGuard("jwt"))
    @Post("removefriend")
    @HttpCode(HttpStatus.OK)
    async removefriend(@Req() req: ReqExtractId, @Body() data: TargetUserDto) {
      let ret: string;
  
      try {
        ret = await this.FriendListService.removeFriend(
          req.user.sub,
          data.target
        );
      } catch (e) {
        //console.log(e.message);
        ret = e.message;
      }
      return JSON.stringify(ret);
    }
  
    @UseGuards(AuthGuard("jwt"))
    @Post("rejectrequest")
    @HttpCode(HttpStatus.OK)
    async rejectrequest(@Req() req: ReqExtractId, @Body() data: TargetUserDto) {
      let ret: string;
  
      try {
        ret = await this.FriendListService.rejectRequest(
          req.user.sub,
          data.target
        );
      } catch (e) {
        //console.log(e.message);
        ret = e.message;
      }
      return JSON.stringify(ret);
    }
  
    @UseGuards(AuthGuard("jwt"))
    @Post("blockuser")
    @HttpCode(HttpStatus.OK)
    async blockuser(@Req() req: ReqExtractId, @Body() data: TargetUserDto) {
      let ret: string;
      try {
        ret = await this.FriendListService.blockUser(req.user.sub, data.target);
      } catch (e) {
        //console.log(e.message);
        ret = e.message;
      }
      return JSON.stringify(ret);
    }
  
    @UseGuards(AuthGuard("jwt"))
    @Post("unblockuser")
    @HttpCode(HttpStatus.OK)
    async unblockuser(@Req() req: ReqExtractId, @Body() data: TargetUserDto) {
      let ret: string;
  
      try {
        ret = await this.FriendListService.unBlockUser(req.user.sub, data.target);
      } catch (e) {
        //console.log(e.message);
        ret = e.message;
      }
      return JSON.stringify(ret);
    }
  
    @UseGuards(AuthGuard("jwt"))
    @Post("rejectpending")
    @HttpCode(HttpStatus.OK)
    async rejectpending(@Req() req: ReqExtractId, @Body() data: TargetUserDto) {
      let ret: string;
      try {
        ret = await this.FriendListService.rejectRequest(
          data.target,
          req.user.sub
        );
      } catch (e) {
        //console.log(e.message);
        ret = e.message;
      }
      return JSON.stringify(ret);
    }
  
    @UseGuards(AuthGuard("jwt"))
    @Get("getfriends")
    @HttpCode(HttpStatus.OK)
    async getfriends(@Req() req: ReqExtractId) {
      let ret: [{ status: string; nickname: string; avatar: string }?];
  
      try {
        ret = await this.FriendListService.getFriends(req.user.sub);
      } catch (e) {
        //console.log(e.message);
      }
      return JSON.stringify(ret);
    }
  
    @UseGuards(AuthGuard("jwt"))
    @Get("getblocked")
    @HttpCode(HttpStatus.OK)
    async getblocked(@Req() req: ReqExtractId) {
      let ret: [{ nickname: string; avatar: string }?];
  
      try {
        ret = await this.FriendListService.getBlocked(req.user.sub);
      } catch (e) {
        //console.log(e.message);
      }
      return JSON.stringify(ret);
    }
  
    @UseGuards(AuthGuard("jwt"))
    @Get("getfriendrequests")
    @HttpCode(HttpStatus.OK)
    async getfriendrequests(@Req() req: ReqExtractId) {
      let ret: [{ nickname: string; avatar: string }?];
  
      try {
        ret = await this.FriendListService.getFriendRequest(req.user.sub);
      } catch (e) {
        //console.log(e.message);
      }
      return JSON.stringify(ret);
    }
  
    @UseGuards(AuthGuard("jwt"))
    @Get("getpending")
    @HttpCode(HttpStatus.OK)
    async getpending(@Req() req: ReqExtractId) {
      let ret: [{ nickname: string; avatar: string }?];
      try {
        ret = await this.FriendListService.getPending(req.user.sub);
      } catch (e) {
        //console.log(e.message);
      }
      return JSON.stringify(ret);
    }
  }
  