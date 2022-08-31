import {
  Body,
  Headers,
  Controller,
  ForbiddenException,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Get,
  HttpCode,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ReqExtractId } from '../../types/ReqExtractId';
import { UserService } from './user.service';
import { SetNickDto } from '../../types/SetNickDto.dto';
import { GetProfileDto } from '../../types/GetProfileDto';
import {AllExceptionsFilter} from '../auth/all-exception.filter';

@UseFilters(new AllExceptionsFilter())
@Controller('user')
export class UserController {
  private UserService: UserService;
  constructor(UserService: UserService) {
    this.UserService = UserService;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('settings')
  async settings(@Req() req: ReqExtractId) {
    console.log('GET / user/settings');
    try {
      const result = await this.UserService.settings(req.user.sub);
      return result;
    } catch (error) {
      //console.log('Error caught in settings() controller');
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('setnick')
  async setnick(@Body() dto: SetNickDto, @Req() req: ReqExtractId) {
    console.log('PATCH / user/setnick');
    try {
      const result = await this.UserService.setNick(dto.nickname, req.user.sub);
      return result;
    } catch (error) {
      //console.log('Error coming from setnick() controller');
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('changeavatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      dest: './public/srcs/users',
      storage: diskStorage({
        destination: function (req, file, cb) {
          cb(null, './public/srcs/users');
        },
        filename: function (req, file, cb) {
          cb(null, `user${req.user.sub}.jpg`);
        },
      }),
      limits: { fieldSize: 2 },
      fileFilter: function fileFilter(req, file, cb) {
        if (typeof file === 'undefined') {
          cb(new ForbiddenException('No file selected'), false);
        }
        if (file.mimetype !== 'image/jpeg') {
          cb(new ForbiddenException('file format must be image/jpeg'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async changeavatar(@Req() req: ReqExtractId, @UploadedFile() file) {
    console.log('POST / user/changeavatar');
    try {
      console.log('Trying to log file');
      console.log(file);
      const result = await this.UserService.changeAvatar(req.user.sub, file);
      return result;
    } catch (error) {
      //console.log('Caught error in changeavatar controller');
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('removeavatar')
  async removeavatar(@Req() req: ReqExtractId) {
    console.log('POST / user/removeavatar');
    try {
      const result = await this.UserService.removeAvatar(req.user.sub);
      return result;
    } catch (error) {
      //console.log('Caught error in removeavatar controller');
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('getprofile')
  @HttpCode(HttpStatus.OK)
  async getprofile(@Req() req: ReqExtractId) {
    console.log(`GET /user/getprofile`);
    try {
      const result = await this.UserService.getprofile(req.user.sub);
      return result;
    } catch (error) {
      //console.log('Error coming from getprofile() controller call');
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('getprofilebynick')
  @HttpCode(HttpStatus.OK)
  async getprofilebynick(@Body() getProfileDto: GetProfileDto) {
    console.log(`POST /user/getprofilebynick/${getProfileDto.nickname}`);
    try {
      const result = await this.UserService.getprofilebynick(
        getProfileDto.nickname,
      );
      return result;
    } catch (error) {
      //console.log('Error coming from getprofilebynick() controller call');
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('matchmakingcheck')
  @HttpCode(HttpStatus.OK)
  async getmatchmakingcheck(@Req() req: ReqExtractId) {
    console.log('GET /user/matchmakingcheck/');
    try {
      const result = await this.UserService.getmatchmakingcheck(req.user.sub);
      return result;
    } catch (error) {
      //console.log('Error coming from getmatchmakingcheck() controller call');
      throw error;
    }
  }
}
