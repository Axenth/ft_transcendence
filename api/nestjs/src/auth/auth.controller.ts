import { UseFilters, Body, Controller, ForbiddenException, Get, Headers, HttpCode, HttpStatus, Query, Post, Req, Request, UseGuards, Res, HttpException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { tokenPairDto } from 'types/tokenPairDto';
import { ConfigService } from '@nestjs/config';

// Custom Class Validator Types
import { TwoFaDto } from '../../types/TwoFaDto.dto';
import { ReqExtractId } from '../../types/ReqExtractId';
import { ReqRefreshTokens } from '../../types/ReqRefreshTokens';
import {AllExceptionsFilter} from './all-exception.filter';

@UseFilters(new AllExceptionsFilter())
@Controller('auth')
export class AuthController {
    private authService: AuthService;
    private configService: ConfigService;
    constructor(authService: AuthService, config: ConfigService)
    {
        this.authService = authService;
        this.configService = config;
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('send2facode')
    @HttpCode(HttpStatus.OK)
    async send2facode(@Request() req: ReqExtractId)
    {
        try
        {
            await this.authService.send2facode(req.user.sub);
        }
        catch(e)
        {
            //console.log(e);
        }
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login()
    {
        console.log('POST /auth/login');
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Request() req: ReqExtractId, @Res({passthrough: true}) res)
    {
        try
        {
            const userId: number = req.user.sub;
            const result = await this.authService.logout(userId);
            res.cookie('pongJwtRefreshToken', undefined, {httpOnly: false});
            return (result);
        }
        catch(error)
        {
            //console.log('Error coming from logout() controller call');
            throw error;
        }

    }

    @UseGuards(AuthGuard('jwt-refresh'))
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshTokens(@Request() req: ReqRefreshTokens)
    {
        console.log(`POST / auth/refresh, user: [${req.user.sub}]`);
        try
        {
            const userId: number = req.user.sub;
            const refreshToken: string = req.user.refreshToken;
            const isRefreshAuth: boolean = req.user.auth;
            const result = await this.authService.refreshTokens(userId, refreshToken, isRefreshAuth);
            return (result);
        }
        catch(error)
        {
            //console.log('Error coming from refreshTokens() controller call');
            throw error;
        }

    }

    @Get('callback')
    async callback(@Res({passthrough: true}) res, @Query('code') code: string | undefined)
    {
        try
        {
            console.log('GET / auth/callback');
            if (typeof(code) === 'undefined'|| (typeof(code) === 'string' && code.length === 0) )
            {
                res.redirect(`${this.configService.get('FRONTEND_URL')}/login`);
            }
            const result = await this.authService.callback(res, code);
            return (result);
        }
        catch(e)
        {
            return res.redirect(`${this.configService.get('FRONTEND_URL')}/notfound`);
        }
    }


    @UseGuards(AuthGuard('jwt'))
    @Get('make2fa')
    async make2faqr(@Request() req: ReqExtractId)
    {
        console.log(`GET / auth/make2fa, user: ${req.user.sub}`);
        try
        {
            const result = await this.authService.make2fa(req.user.sub);
            return (result);
        }
        catch(error){throw error}
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('submit2fa')
    @HttpCode(HttpStatus.OK)
    async submit2fa(@Request() req: ReqExtractId, @Body() twofaDto: TwoFaDto)
    {
        console.log(`POST / auth/submit2fa, user: ${req.user.sub}`);
        try
        {
            const result = await this.authService.submit2fa(req.user.sub, twofaDto);
            return (result);
        }
        catch(error){throw error}
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('disable2fa')
    @HttpCode(HttpStatus.OK)
    async disable2fa(@Request() req: ReqExtractId, @Body() twofaDto: TwoFaDto)
    {
        console.log(`POST / auth/disable2fa, user: ${req.user.sub}`);
        try
        {
            const result = await this.authService.disable2fa(req.user.sub, twofaDto);
            return (result);
        }
        catch(error){throw error}
    }

}
